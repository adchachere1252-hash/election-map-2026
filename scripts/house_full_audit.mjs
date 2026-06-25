import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const dbUrl = process.env.DATABASE_URL;
const conn = await mysql.createConnection(dbUrl);

// Get all 435 House races
const [races] = await conn.execute(`
  SELECT state_code, state_name, district, incumbent, incumbent_party, 
         incumbent_retiring, rating, status,
         candidate1_name, candidate1_party, candidate1_photo,
         candidate2_name, candidate2_party, candidate2_photo,
         previous_party, called_winner, called_party, notes,
         primary_date, general_date, is_vacancy
  FROM house_races
  ORDER BY state_code, district
`);

console.log(`\n=== HOUSE RACE AUDIT (${races.length} races) ===\n`);

const issues = [];

// Track state district counts
const stateCounts = {};

for (const r of races) {
  const id = `${r.state_code}-${r.district}`;
  stateCounts[r.state_code] = (stateCounts[r.state_code] || 0) + 1;
  
  // 1. Both candidates NULL (not TBD)
  if (!r.candidate1_name && !r.candidate2_name && r.status !== 'Called') {
    issues.push({ id, severity: 'HIGH', issue: 'Both candidates NULL', details: `status=${r.status}` });
  }
  
  // 2. Confirmed candidate missing photo (not TBD, not NULL)
  if (r.candidate1_name && !r.candidate1_name.startsWith('TBD') && !r.candidate1_photo && r.status !== 'Called') {
    issues.push({ id, severity: 'MEDIUM', issue: 'Candidate1 missing photo', details: `${r.candidate1_name} (${r.candidate1_party})` });
  }
  if (r.candidate2_name && !r.candidate2_name.startsWith('TBD') && !r.candidate2_photo && r.status !== 'Called') {
    issues.push({ id, severity: 'MEDIUM', issue: 'Candidate2 missing photo', details: `${r.candidate2_name} (${r.candidate2_party})` });
  }
  
  // 3. TBD candidate WITH photo (should not have)
  if (r.candidate1_name && r.candidate1_name.startsWith('TBD') && r.candidate1_photo) {
    issues.push({ id, severity: 'MEDIUM', issue: 'TBD candidate1 has photo (stale)', details: r.candidate1_name });
  }
  if (r.candidate2_name && r.candidate2_name.startsWith('TBD') && r.candidate2_photo) {
    issues.push({ id, severity: 'MEDIUM', issue: 'TBD candidate2 has photo (stale)', details: r.candidate2_name });
  }
  
  // 4. Party mismatch (D candidate in R slot or vice versa)
  if (r.candidate1_party === 'R' && r.candidate2_party === 'D') {
    // Normal: D in slot 1, R in slot 2 — but some states have R first
    // Only flag if BOTH are same party (not CA jungle primary)
  }
  if (r.candidate1_party === r.candidate2_party && r.candidate1_name && r.candidate2_name 
      && !r.candidate1_name.startsWith('TBD') && !r.candidate2_name.startsWith('TBD')
      && r.state_code !== 'CA') {
    issues.push({ id, severity: 'HIGH', issue: 'Same party both slots (non-CA)', details: `Both ${r.candidate1_party}` });
  }
  
  // 5. Called race without called_winner
  if (r.status === 'Called' && !r.called_winner) {
    issues.push({ id, severity: 'HIGH', issue: 'Called status but no called_winner', details: '' });
  }
  
  // 6. Duplicate candidate names (same person in both slots)
  if (r.candidate1_name && r.candidate2_name && r.candidate1_name === r.candidate2_name) {
    issues.push({ id, severity: 'CRITICAL', issue: 'Duplicate candidate (same name both slots)', details: r.candidate1_name });
  }
  
  // 7. Incumbent running but not in either candidate slot
  if (r.incumbent && !r.incumbent.includes('Open Seat') && !r.incumbent.includes('retiring') 
      && !r.incumbent.includes('lost primary') && !r.incumbent.includes('VACANT')
      && r.status !== 'Called') {
    const incName = r.incumbent.replace(/\s*\(.*?\)\s*/g, '').trim();
    const c1Match = r.candidate1_name && (r.candidate1_name.includes(incName) || incName.includes(r.candidate1_name?.split(' ').pop()));
    const c2Match = r.candidate2_name && (r.candidate2_name.includes(incName) || incName.includes(r.candidate2_name?.split(' ').pop()));
    const isTBD = (r.candidate1_name && r.candidate1_name.startsWith('TBD')) || (r.candidate2_name && r.candidate2_name.startsWith('TBD'));
    
    if (!c1Match && !c2Match && !isTBD && r.candidate1_name && r.candidate2_name) {
      issues.push({ id, severity: 'LOW', issue: 'Incumbent not found in candidates', details: `Inc: "${r.incumbent}", C1: "${r.candidate1_name}", C2: "${r.candidate2_name}"` });
    }
  }
  
  // 8. Missing party assignment
  if (r.candidate1_name && !r.candidate1_name.startsWith('TBD') && !r.candidate1_party) {
    issues.push({ id, severity: 'HIGH', issue: 'Candidate1 missing party', details: r.candidate1_name });
  }
  if (r.candidate2_name && !r.candidate2_name.startsWith('TBD') && !r.candidate2_party) {
    issues.push({ id, severity: 'HIGH', issue: 'Candidate2 missing party', details: r.candidate2_name });
  }
  
  // 9. Photo URL validation (check it's a proper URL)
  if (r.candidate1_photo && !r.candidate1_photo.startsWith('http')) {
    issues.push({ id, severity: 'MEDIUM', issue: 'Candidate1 photo not a valid URL', details: r.candidate1_photo.slice(0, 50) });
  }
  if (r.candidate2_photo && !r.candidate2_photo.startsWith('http')) {
    issues.push({ id, severity: 'MEDIUM', issue: 'Candidate2 photo not a valid URL', details: r.candidate2_photo.slice(0, 50) });
  }
}

// Summary
const critical = issues.filter(i => i.severity === 'CRITICAL');
const high = issues.filter(i => i.severity === 'HIGH');
const medium = issues.filter(i => i.severity === 'MEDIUM');
const low = issues.filter(i => i.severity === 'LOW');

console.log(`CRITICAL: ${critical.length}`);
console.log(`HIGH: ${high.length}`);
console.log(`MEDIUM: ${medium.length}`);
console.log(`LOW: ${low.length}`);
console.log(`TOTAL ISSUES: ${issues.length}\n`);

if (critical.length > 0) {
  console.log('--- CRITICAL ---');
  critical.forEach(i => console.log(`  ${i.id}: ${i.issue} — ${i.details}`));
}
if (high.length > 0) {
  console.log('\n--- HIGH ---');
  high.forEach(i => console.log(`  ${i.id}: ${i.issue} — ${i.details}`));
}
if (medium.length > 0) {
  console.log('\n--- MEDIUM ---');
  medium.forEach(i => console.log(`  ${i.id}: ${i.issue} — ${i.details}`));
}
if (low.length > 0) {
  console.log('\n--- LOW ---');
  low.forEach(i => console.log(`  ${i.id}: ${i.issue} — ${i.details}`));
}

// Photo stats
const totalConfirmedC1 = races.filter(r => r.candidate1_name && !r.candidate1_name.startsWith('TBD')).length;
const totalConfirmedC2 = races.filter(r => r.candidate2_name && !r.candidate2_name.startsWith('TBD')).length;
const photosC1 = races.filter(r => r.candidate1_name && !r.candidate1_name.startsWith('TBD') && r.candidate1_photo).length;
const photosC2 = races.filter(r => r.candidate2_name && !r.candidate2_name.startsWith('TBD') && r.candidate2_photo).length;

console.log(`\n--- PHOTO COVERAGE ---`);
console.log(`Candidate1: ${photosC1}/${totalConfirmedC1} confirmed have photos (${Math.round(photosC1/totalConfirmedC1*100)}%)`);
console.log(`Candidate2: ${photosC2}/${totalConfirmedC2} confirmed have photos (${Math.round(photosC2/totalConfirmedC2*100)}%)`);
console.log(`Total: ${photosC1+photosC2}/${totalConfirmedC1+totalConfirmedC2} (${Math.round((photosC1+photosC2)/(totalConfirmedC1+totalConfirmedC2)*100)}%)`);

// Status breakdown
const statusCounts = {};
races.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
console.log(`\n--- STATUS BREAKDOWN ---`);
Object.entries(statusCounts).sort((a,b) => b[1]-a[1]).forEach(([s, c]) => console.log(`  ${s}: ${c}`));

// Rating breakdown
const ratingCounts = {};
races.forEach(r => { ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1; });
console.log(`\n--- RATING BREAKDOWN ---`);
Object.entries(ratingCounts).sort((a,b) => b[1]-a[1]).forEach(([s, c]) => console.log(`  ${s}: ${c}`));

await conn.end();
