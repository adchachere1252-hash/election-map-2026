import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const DB_URL = process.env.DATABASE_URL;

// State name to code mapping
const STATE_CODES = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// Category mapping based on subject keywords
function categorize(subject, title) {
  const s = (subject + ' ' + title).toLowerCase();
  if (s.includes('tax') || s.includes('fiscal') || s.includes('bond') || s.includes('revenue') || s.includes('budget') || s.includes('property tax')) return 'Taxes & Finance';
  if (s.includes('education') || s.includes('school') || s.includes('university')) return 'Education';
  if (s.includes('healthcare') || s.includes('medicaid') || s.includes('health') || s.includes('drug') || s.includes('marijuana') || s.includes('cannabis')) return 'Healthcare';
  if (s.includes('abortion') || s.includes('reproductive')) return 'Reproductive Rights';
  if (s.includes('election') || s.includes('voting') || s.includes('voter') || s.includes('ballot') || s.includes('campaign') || s.includes('redistrict') || s.includes('primary') || s.includes('ranked')) return 'Elections & Voting';
  if (s.includes('gun') || s.includes('firearm') || s.includes('weapon')) return 'Gun Policy';
  if (s.includes('immigration') || s.includes('citizen') || s.includes('noncitizen')) return 'Immigration';
  if (s.includes('environment') || s.includes('climate') || s.includes('water') || s.includes('energy') || s.includes('conservation') || s.includes('wildlife')) return 'Environment & Energy';
  if (s.includes('criminal') || s.includes('prison') || s.includes('police') || s.includes('law enforcement') || s.includes('crime') || s.includes('justice')) return 'Criminal Justice';
  if (s.includes('labor') || s.includes('wage') || s.includes('worker') || s.includes('minimum wage') || s.includes('employment')) return 'Labor & Wages';
  if (s.includes('lgbtq') || s.includes('gender') || s.includes('transgender') || s.includes('same-sex') || s.includes('marriage')) return 'LGBTQ & Gender';
  if (s.includes('religion') || s.includes('prayer') || s.includes('church')) return 'Religion & Values';
  if (s.includes('gambling') || s.includes('casino') || s.includes('lottery') || s.includes('sports betting')) return 'Gambling & Gaming';
  if (s.includes('governor') || s.includes('legislature') || s.includes('constitutional') || s.includes('amendment') || s.includes('government') || s.includes('executive')) return 'Government Structure';
  if (s.includes('flag') || s.includes('symbol') || s.includes('anthem') || s.includes('pledge')) return 'Symbols & Patriotism';
  if (s.includes('transport') || s.includes('road') || s.includes('infrastructure')) return 'Infrastructure';
  return 'Other';
}

// Convert date strings like "November 3" to "2026-11-03"
function normalizeDate(dateStr) {
  const months = { 'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08', 'September': '09',
    'October': '10', 'November': '11', 'December': '12' };
  const parts = dateStr.split(' ');
  const month = months[parts[0]];
  const day = parts[1].padStart(2, '0');
  return `2026-${month}-${day}`;
}

// Determine status based on date and result
function getStatus(dateStr, result) {
  if (result && result.length > 0) {
    return result.toLowerCase().includes('pass') || result.toLowerCase().includes('yes') || result.toLowerCase().includes('approved') ? 'Called' : 'Called';
  }
  return 'Scheduled';
}

function getCalledResult(result) {
  if (!result || result.length === 0) return null;
  const r = result.toLowerCase();
  if (r.includes('pass') || r.includes('yes') || r.includes('approved')) return 'Yes';
  if (r.includes('fail') || r.includes('no') || r.includes('defeated') || r.includes('rejected')) return 'No';
  return null;
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  
  // Load US ballot measures
  const measures = JSON.parse(readFileSync('research/us-ballot-measures.json', 'utf8'));
  
  console.log(`Inserting ${measures.length} US ballot measures...`);
  
  // Clear existing data (keep any manually entered ones? Let's replace all)
  await conn.execute('DELETE FROM referendums WHERE country = ?', ['United States']);
  
  let inserted = 0;
  for (const m of measures) {
    const stateCode = STATE_CODES[m.state] || 'XX';
    const category = categorize(m.subject || '', m.title || '');
    const electionDate = normalizeDate(m.election_date);
    const status = getStatus(m.election_date, m.result);
    const calledResult = getCalledResult(m.result);
    
    await conn.execute(
      `INSERT INTO referendums (state_code, state_name, name, description, category, measure_type, measure_type_full, scope, country, country_code, election_date, status, called_result, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stateCode,
        m.state,
        m.title,
        m.description || null,
        category,
        m.type_code,
        m.type_full,
        'state',
        'United States',
        'US',
        electionDate,
        status,
        calledResult,
        m.subject || null
      ]
    );
    inserted++;
  }
  
  console.log(`✓ Inserted ${inserted} US ballot measures`);
  
  // Now insert global referendums
  const globalReferendums = [
    {
      country: 'Thailand', countryCode: 'TH', name: 'Constitutional Reform Referendum',
      description: 'Whether to begin the process of rewriting the 2017 coup-era constitution. Held alongside the general election.',
      category: 'Constitutional Reform', date: '2026-02-08', status: 'Called', result: 'Yes',
      notes: 'YES won with 5.47M votes vs 2.96M No votes. Strong nationwide backing for reform.'
    },
    {
      country: 'Bangladesh', countryCode: 'BD', name: 'Institutional Reform Referendum',
      description: 'Constitutional referendum on institutional reforms proposed after the 2024 political upheaval, including provisions from the July Declaration.',
      category: 'Constitutional Reform', date: '2026-02-12', status: 'Called', result: 'Yes',
      notes: 'Endorsed by voters alongside parliamentary elections. BNP won two-thirds majority in concurrent election.'
    },
    {
      country: 'Italy', countryCode: 'IT', name: 'Judicial Reform Referendum (Nordio Reform)',
      description: 'Confirmatory constitutional referendum on the Nordio Reform separating prosecutors and judges, restructuring the judicial system into two separate career tracks.',
      category: 'Judicial Reform', date: '2026-03-22', status: 'Called', result: 'Yes',
      notes: 'Major political test for PM Meloni. Reform proposes structural separation of judicial careers.'
    },
    {
      country: 'Switzerland', countryCode: 'CH', name: 'March 2026 Federal Vote',
      description: 'Swiss federal popular vote on multiple initiatives.',
      category: 'Multiple Issues', date: '2026-03-08', status: 'Called', result: 'Yes',
      notes: 'Regular Swiss direct democracy vote.'
    },
    {
      country: 'Switzerland', countryCode: 'CH', name: 'Population Cap & Sustainability Initiative',
      description: 'Popular initiative "No to a Switzerland with 10 million!" proposing to cap the country\'s population at 10 million through immigration restrictions.',
      category: 'Immigration', date: '2026-06-14', status: 'Called', result: 'No',
      notes: 'REJECTED. Far-right SVP plan defeated. Economic risks overcame elevated concerns about immigration.'
    },
    {
      country: 'Slovakia', countryCode: 'SK', name: 'Referendum on Lifelong Payments for Politicians',
      description: 'Whether to cancel lifelong payments for PM Robert Fico and other former political leaders after their terms end.',
      category: 'Government Reform', date: '2026-07-04', status: 'Scheduled', result: null,
      notes: 'Called by President Pellegrini. Early elections question struck down by Constitutional Court. Only 2003 EU referendum has ever succeeded in Slovakia.'
    },
    {
      country: 'Iceland', countryCode: 'IS', name: 'New Constitution Referendum',
      description: 'Whether to adopt the citizen-written constitution that has been pending since the 2012 participatory process following the 2008 financial crisis.',
      category: 'Constitutional Reform', date: '2026-08-29', status: 'Scheduled', result: null,
      notes: 'Date tentative. Long-running saga since 2008 financial crisis. Parliament has repeatedly failed to act on 2012 referendum results.'
    },
    {
      country: 'Switzerland', countryCode: 'CH', name: 'Neutrality & Food Security Vote',
      description: 'Two initiatives: (1) Stricter neutrality proposal that would limit government ability to impose economic sanctions; (2) Food security initiative.',
      category: 'Foreign Policy', date: '2026-09-27', status: 'Scheduled', result: null,
      notes: 'Neutrality initiative proposed by SVP/isolationist group. Government and parliament AGAINST. Would prevent Switzerland from joining EU sanctions (e.g., against Russia).'
    },
    {
      country: 'Switzerland', countryCode: 'CH', name: 'November Federal Vote',
      description: 'Swiss federal popular vote. Topics to be determined by Federal Council approximately 3 months before the vote.',
      category: 'TBD', date: '2026-11-29', status: 'Scheduled', result: null,
      notes: 'Date tentative. Topics not yet announced.'
    },
    {
      country: 'Armenia', countryCode: 'AM', name: 'New Constitution Referendum',
      description: 'Referendum on adopting a new constitution drafted by a reform council headed by the Justice Minister, moving away from the post-Soviet constitutional framework.',
      category: 'Constitutional Reform', date: '2026-12-15', status: 'Scheduled', result: null,
      notes: 'Date tentative. PM Pashinyan plans referendum after June 2026 parliamentary elections. Civil Contract party won ~50% in June 7 elections.'
    }
  ];
  
  console.log(`\nInserting ${globalReferendums.length} global referendums...`);
  
  // Clear existing global referendums
  await conn.execute("DELETE FROM referendums WHERE scope = 'global'");
  
  for (const r of globalReferendums) {
    await conn.execute(
      `INSERT INTO referendums (state_code, state_name, name, description, category, measure_type, measure_type_full, scope, country, country_code, election_date, status, called_result, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.countryCode, // using country_code as state_code for global
        r.country,     // using country as state_name for global
        r.name,
        r.description,
        r.category,
        'REF',         // measure_type
        'National Referendum',
        'global',
        r.country,
        r.countryCode,
        r.date,
        r.status,
        r.result,
        r.notes
      ]
    );
  }
  
  console.log(`✓ Inserted ${globalReferendums.length} global referendums`);
  
  // Final count
  const [rows] = await conn.execute('SELECT COUNT(*) as total, scope FROM referendums GROUP BY scope');
  console.log('\nFinal counts:');
  for (const row of rows) {
    console.log(`  ${row.scope}: ${row.total}`);
  }
  
  const [total] = await conn.execute('SELECT COUNT(*) as total FROM referendums');
  console.log(`  TOTAL: ${total[0].total}`);
  
  await conn.end();
  console.log('\n✓ Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
