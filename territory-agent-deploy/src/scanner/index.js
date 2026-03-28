import { accounts, signals, outreach, scanHistory } from '../db/index.js';
import { enrichCompany, detectHRIS, analyzeSignals, draftOutreach } from '../services/claude.js';
import { notifyScanComplete, notifySignalsFound, notifyOutreachDrafted, notifyTerritoryChanges } from '../services/email.js';
import { syncTerritoryFromOutreach, reconcileTerritory, prioritizeScanOrder } from '../services/territory.js';

export async function runTerritoryScan() {
  console.log('\n🤖 Starting territory scan...');
  const scanId = scanHistory.start();
  const startTime = Date.now();

  const stats = {
    accounts_scanned: 0,
    signals_found: 0,
    outreach_drafted: 0,
    territory_added: 0,
    territory_removed: 0,
    errors: null
  };

  try {
    // STEP 1: Sync territory from Outreach
    console.log('🔄 Syncing territory from Outreach...');
    const outreachAccounts = await syncTerritoryFromOutreach();
    console.log(`   Found ${outreachAccounts.length} accounts in Outreach`);

    // STEP 2: Reconcile with local database
    const dbAccounts = accounts.getAll();
    const reconciliation = reconcileTerritory(outreachAccounts, dbAccounts);

    // Add new accounts to database
    for (const account of reconciliation.added) {
      accounts.upsert({
        company_name: account.company_name,
        domain: account.domain,
        employee_count: null,
        revenue: null,
        industry: null,
        hris_platform: null
      });
      stats.territory_added++;
    }

    // Mark removed accounts (soft delete - keep historical data)
    for (const account of reconciliation.removed) {
      // Could add a 'removed_from_territory' flag instead of hard delete
      console.log(`   ⚠️ ${account.company_name} no longer in Outreach territory`);
      stats.territory_removed++;
    }

    if (reconciliation.added.length > 0 || reconciliation.removed.length > 0) {
      await notifyTerritoryChanges({
        added: reconciliation.added.map(a => a.company_name),
        removed: reconciliation.removed.map(a => a.company_name)
      });
    }

    // STEP 3: Prioritize scan order
    const scanTargets = prioritizeScanOrder(outreachAccounts);
    
    // STEP 4: Intelligent scan limiting
    // Don't scan ALL accounts every time - focus on:
    // - New accounts (never scanned)
    // - Accounts in active sequences
    // - Accounts that haven't been scanned in 24+ hours
    const needsRescan = accounts.getNeedingRescan(
      process.env.RESCAN_INTERVAL_HOURS || 24
    );
    
    const needsRescanDomains = new Set(needsRescan.map(a => a.domain));
    const priorityTargets = scanTargets.filter(a => 
      a.outreach_status === 'new' || 
      a.in_sequence || 
      needsRescanDomains.has(a.domain)
    );

    console.log(`📊 Scanning ${priorityTargets.length} priority accounts (${scanTargets.length} total in territory)`);

    const newSignals = [];
    const newDrafts = [];

    for (const accountData of priorityTargets) {
      try {
        console.log(`\n  → Enriching ${accountData.company_name}...`);
        
        // Enrich company data via ZoomInfo
        const enrichedData = await enrichCompany(accountData.company_name);
        stats.accounts_scanned++;

        // Get previous snapshot for comparison
        const previousData = accounts.getByName(enrichedData.company_name);

        // Detect HRIS if not already known
        let hrisData = { detected_hris: previousData?.hris_platform };
        if (!previousData?.hris_platform || previousData.hris_platform === 'Unknown') {
          console.log(`  → Detecting HRIS for ${enrichedData.company_name}...`);
          hrisData = await detectHRIS(enrichedData.domain);
        }

        // Upsert account data
        const accountRecord = accounts.upsert({
          company_name: enrichedData.company_name,
          domain: enrichedData.domain,
          employee_count: enrichedData.employee_count,
          revenue: enrichedData.revenue,
          industry: enrichedData.industry,
          hris_platform: hrisData.detected_hris
        });

        // Analyze for buying signals
        console.log(`  → Analyzing signals for ${enrichedData.company_name}...`);
        const detectedSignals = await analyzeSignals(enrichedData, previousData);

        if (detectedSignals.length > 0) {
          console.log(`  ✓ Found ${detectedSignals.length} signal(s)`);
          
          for (const signal of detectedSignals) {
            const signalId = signals.create(accountRecord.id, signal.type, signal.data);
            stats.signals_found++;

            // Store for notification
            newSignals.push({
              ...signal,
              company_name: enrichedData.company_name,
              signal_data: signal.data
            });

            // Draft outreach if enabled
            if (process.env.AUTO_DRAFT_OUTREACH === 'true') {
              console.log(`  → Drafting outreach for ${signal.type}...`);
              
              const drafts = await draftOutreach(
                { ...enrichedData, hris_platform: hrisData.detected_hris },
                { signal_type: signal.type, signal_data: signal.data }
              );

              // Save both variants
              outreach.create(
                accountRecord.id,
                signalId,
                drafts.variant_a.subject,
                drafts.variant_a.body,
                'A'
              );

              outreach.create(
                accountRecord.id,
                signalId,
                drafts.variant_b.subject,
                drafts.variant_b.body,
                'B'
              );

              stats.outreach_drafted += 2;

              // Store for notification
              newDrafts.push(
                {
                  company_name: enrichedData.company_name,
                  signal_type: signal.type,
                  variant: 'Variant A',
                  subject: drafts.variant_a.subject,
                  body: drafts.variant_a.body
                },
                {
                  company_name: enrichedData.company_name,
                  signal_type: signal.type,
                  variant: 'Variant B',
                  subject: drafts.variant_b.subject,
                  body: drafts.variant_b.body
                }
              );
            }
          }
        } else {
          console.log(`  ✓ No new signals`);
        }

        // Rate limiting
        await sleep(2000);

      } catch (error) {
        console.error(`  ✗ Error processing ${accountData.company_name}:`, error.message);
        stats.errors = stats.errors ? `${stats.errors}; ${error.message}` : error.message;
      }
    }

    // Send notifications
    if (newSignals.length > 0) {
      await notifySignalsFound(newSignals);
    }

    if (newDrafts.length > 0) {
      await notifyOutreachDrafted(newDrafts);
    }

  } catch (error) {
    console.error('❌ Scan failed:', error.message);
    stats.errors = error.message;
  } finally {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    stats.duration = duration;

    scanHistory.complete(scanId, stats);
    
    console.log('\n✅ Scan complete');
    console.log(`   Territory: +${stats.territory_added} / -${stats.territory_removed}`);
    console.log(`   Scanned: ${stats.accounts_scanned}`);
    console.log(`   Signals: ${stats.signals_found}`);
    console.log(`   Drafts: ${stats.outreach_drafted}`);
    console.log(`   Duration: ${duration}s`);

    await notifyScanComplete(stats);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
