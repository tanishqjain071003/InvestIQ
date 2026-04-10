// One-time script to import mutual fund orders from CSV data
// Run with: node scripts/import-orders.mjs

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://clgwkccbqgpgyqpllyzd.supabase.co';
const APP_BASE = 'http://localhost:3000';

// All COMPLETE orders from both CSVs, sorted chronologically (earliest first)
const orders = [
  // March 3, 2026
  { scheme_name: 'HDFC Liquid Fund', amount: 175000, units: 32.494, nav: 5385.31, date: '2026-03-03', isin: 'INF179KB1HP9' },
  { scheme_name: 'Bandhan Small Cap Fund', amount: 16000, units: 339.225, nav: 47.16, date: '2026-03-03', isin: 'INF194KB1AL4' },
  { scheme_name: 'Parag Parikh Flexi Cap Fund', amount: 24000, units: 263.608, nav: 91.04, date: '2026-03-03', isin: 'INF879O01027' },
  { scheme_name: 'HDFC Gold ETF Fund of Fund', amount: 8000, units: 158.292, nav: 50.54, date: '2026-03-03', isin: 'INF179K01VX0' },
  { scheme_name: 'Axis Global Equity Alpha Fund of Fund', amount: 8000, units: 337.076, nav: 23.73, date: '2026-03-03', isin: 'INF846K01X06' },
  { scheme_name: 'Motilal Oswal Nifty Midcap 150 Index Fund', amount: 16000, units: 420.484, nav: 38.05, date: '2026-03-03', isin: 'INF247L01916' },
  // March 4, 2026
  { scheme_name: 'Motilal Oswal BSE Enhanced Value Index Fund', amount: 8000, units: 273.695, nav: 29.23, date: '2026-03-04', isin: 'INF247L01BF2' },
  { scheme_name: 'HDFC Liquid Fund', amount: 28000, units: 5.199, nav: 5385.31, date: '2026-03-04', isin: 'INF179KB1HP9' },
  // March 28, 2026
  { scheme_name: 'Axis Global Equity Alpha Fund of Fund', amount: 7500, units: 333.384, nav: 22.5, date: '2026-03-28', isin: 'INF846K01X06' },
  { scheme_name: 'Motilal Oswal BSE Enhanced Value Index Fund', amount: 18750, units: 731.208, nav: 25.64, date: '2026-03-28', isin: 'INF247L01BF2' },
  { scheme_name: 'Bandhan Small Cap Fund', amount: 22500, units: 504.109, nav: 44.63, date: '2026-03-28', isin: 'INF194KB1AL4' },
  { scheme_name: 'Motilal Oswal Nifty Midcap 150 Index Fund', amount: 30000, units: 852.504, nav: 35.19, date: '2026-03-28', isin: 'INF247L01916' },
  { scheme_name: 'Parag Parikh Flexi Cap Fund', amount: 60000, units: 703.695, nav: 85.26, date: '2026-03-28', isin: 'INF879O01027' },
  { scheme_name: 'HDFC Gold ETF Fund of Fund', amount: 11250, units: 246.857, nav: 45.57, date: '2026-03-28', isin: 'INF179K01VX0' },
  // April 8, 2026
  { scheme_name: 'Motilal Oswal BSE Enhanced Value Index Fund', amount: 5000, units: 180.816, nav: 27.65, date: '2026-04-08', isin: 'INF247L01BF2' },
  { scheme_name: 'Bandhan Small Cap Fund', amount: 2500, units: 51.247, nav: 48.78, date: '2026-04-08', isin: 'INF194KB1AL4' },
  { scheme_name: 'Parag Parikh Flexi Cap Fund', amount: 5000, units: 55.471, nav: 90.13, date: '2026-04-08', isin: 'INF879O01027' },
  { scheme_name: 'HDFC Gold ETF Fund of Fund', amount: 5000, units: 106.631, nav: 46.89, date: '2026-04-08', isin: 'INF179K01VX0' },
  { scheme_name: 'Motilal Oswal Nifty Midcap 150 Index Fund', amount: 5000, units: 132.041, nav: 37.87, date: '2026-04-08', isin: 'INF247L01916' },
];

// Search mfapi for scheme code by fund name
async function findSchemeCode(name) {
  // Use first few distinctive words for search
  const searchTerms = {
    'HDFC Liquid Fund': 'HDFC Liquid Fund Direct Growth',
    'Bandhan Small Cap Fund': 'Bandhan Small Cap Fund Direct Growth',
    'Parag Parikh Flexi Cap Fund': 'Parag Parikh Flexi Cap Fund Direct Growth',
    'HDFC Gold ETF Fund of Fund': 'HDFC Gold ETF Fund of Fund Direct Growth',
    'Axis Global Equity Alpha Fund of Fund': 'Axis Global Equity Alpha Fund of Fund Direct Growth',
    'Motilal Oswal Nifty Midcap 150 Index Fund': 'Motilal Oswal Nifty Midcap 150 Index Fund Direct Growth',
    'Motilal Oswal BSE Enhanced Value Index Fund': 'Motilal Oswal BSE Enhanced Value Index Fund Direct Growth',
  };

  const query = searchTerms[name] || name;
  const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`);
  const results = await res.json();

  if (!Array.isArray(results) || results.length === 0) {
    console.error(`  No results for: ${name}`);
    return null;
  }

  // Find best match - prefer Direct Plan Growth
  const directGrowth = results.find(r =>
    r.schemeName.toLowerCase().includes('direct') &&
    r.schemeName.toLowerCase().includes('growth') &&
    !r.schemeName.toLowerCase().includes('idcw') &&
    !r.schemeName.toLowerCase().includes('dividend')
  );

  const match = directGrowth || results[0];
  console.log(`  Found: ${match.schemeName} (code: ${match.schemeCode})`);
  return { schemeCode: match.schemeCode, schemeName: match.schemeName };
}

// Fetch fund metadata from mfapi
async function getFundMeta(schemeCode) {
  const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
  const data = await res.json();
  return data.meta || {};
}

async function main() {
  console.log('Looking up scheme codes...\n');

  // Get scheme codes for unique funds
  const uniqueFunds = [...new Set(orders.map(o => o.scheme_name))];
  const schemeMap = {};

  for (const name of uniqueFunds) {
    console.log(`Searching: ${name}`);
    const result = await findSchemeCode(name);
    if (result) {
      schemeMap[name] = result;
      // Small delay to be nice to the API
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log('\nFetching fund metadata...\n');

  const metaMap = {};
  for (const [name, { schemeCode }] of Object.entries(schemeMap)) {
    const meta = await getFundMeta(schemeCode);
    metaMap[name] = meta;
    console.log(`  ${name}: ${meta.fund_house} / ${meta.scheme_category}`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\nImporting orders (chronological, same funds will merge)...\n');

  let success = 0;
  let failed = 0;

  for (const order of orders) {
    const scheme = schemeMap[order.scheme_name];
    if (!scheme) {
      console.log(`  SKIP: ${order.scheme_name} - no scheme code found`);
      failed++;
      continue;
    }

    const meta = metaMap[order.scheme_name] || {};

    const body = {
      scheme_code: scheme.schemeCode,
      scheme_name: scheme.schemeName,
      fund_house: meta.fund_house || null,
      category: meta.scheme_category || null,
      units: order.units,
      purchase_nav: order.nav,
      purchase_date: order.date,
    };

    try {
      const res = await fetch(`${APP_BASE}/api/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();
      console.log(`  OK: ${order.scheme_name} | ${order.date} | ₹${order.amount} | ${order.units} units -> merged total: ${data.units?.toFixed(3)} units`);
      success++;
    } catch (err) {
      console.log(`  FAIL: ${order.scheme_name} | ${order.date} | ${err.message}`);
      failed++;
    }

    // Small delay between API calls
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone! ${success} orders imported, ${failed} failed.`);
  console.log('Same-fund orders have been merged automatically.');
}

main().catch(console.error);
