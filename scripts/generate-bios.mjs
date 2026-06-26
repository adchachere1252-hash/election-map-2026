import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;
const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function invokeLLM(messages, responseFormat) {
  const payload = {
    model: 'gemini-2.5-flash',
    messages,
    max_tokens: 32768,
    thinking: { budget_tokens: 128 }
  };
  if (responseFormat) payload.response_format = responseFormat;
  
  const res = await fetch(`${FORGE_URL.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${FORGE_KEY}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`LLM error: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function generateBios(candidates) {
  const prompt = `Generate concise candidate bios for these U.S. political candidates. Each bio should be 1-2 sentences covering their current role, key background, and notable positions. Be factual and neutral.

Candidates:
${candidates.map((c, i) => `${i+1}. ${c.name} (${c.party}) - ${c.context}`).join('\n')}

Return a JSON object with a "bios" array where each element has "index" (1-based) and "bio" (the 1-2 sentence bio string).`;

  const result = await invokeLLM([
    { role: 'system', content: 'You are a political reference assistant. Generate factual, neutral, concise candidate bios based on publicly available information. Each bio should be 1-2 sentences.' },
    { role: 'user', content: prompt }
  ], {
    type: 'json_schema',
    json_schema: {
      name: 'candidate_bios',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          bios: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                index: { type: 'integer' },
                bio: { type: 'string' }
              },
              required: ['index', 'bio'],
              additionalProperties: false
            }
          }
        },
        required: ['bios'],
        additionalProperties: false
      }
    }
  });

  const content = result.choices[0].message.content;
  return JSON.parse(typeof content === 'string' ? content : content[0].text);
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  const mode = process.argv[2] || 'senate'; // senate, governor, house
  
  if (mode === 'senate') {
    console.log('=== SENATE BIOS ===');
    const [rows] = await conn.query(`SELECT state_code, candidate1_name, candidate1_party, candidate1_bio, candidate2_name, candidate2_party, candidate2_bio FROM senate_races ORDER BY state_code`);
    
    // Collect candidates needing bios (skip TBD)
    const needsBio = [];
    for (const r of rows) {
      if (r.candidate1_name && !r.candidate1_name.startsWith('TBD') && !r.candidate1_bio) {
        needsBio.push({ name: r.candidate1_name, party: r.candidate1_party, context: `${r.state_code} Senate candidate`, state: r.state_code, slot: 'candidate1_bio' });
      }
      if (r.candidate2_name && !r.candidate2_name.startsWith('TBD') && !r.candidate2_bio) {
        needsBio.push({ name: r.candidate2_name, party: r.candidate2_party, context: `${r.state_code} Senate candidate`, state: r.state_code, slot: 'candidate2_bio' });
      }
    }
    
    console.log(`Found ${needsBio.length} Senate candidates needing bios`);
    
    // Process in batches of 15
    for (let i = 0; i < needsBio.length; i += 15) {
      const batch = needsBio.slice(i, i + 15);
      console.log(`Processing batch ${Math.floor(i/15)+1}/${Math.ceil(needsBio.length/15)}...`);
      const result = await generateBios(batch);
      
      for (const item of result.bios) {
        const candidate = batch[item.index - 1];
        if (!candidate) continue;
        await conn.query(`UPDATE senate_races SET ${candidate.slot} = ? WHERE state_code = ?`, [item.bio, candidate.state]);
        console.log(`  ✓ ${candidate.name} (${candidate.state})`);
      }
    }
    
  } else if (mode === 'governor') {
    console.log('=== GOVERNOR BIOS ===');
    const [rows] = await conn.query(`SELECT state_code, dem_candidate, dem_bio, rep_candidate, rep_bio FROM governor_races ORDER BY state_code`);
    
    const needsBio = [];
    for (const r of rows) {
      if (r.dem_candidate && !r.dem_candidate.startsWith('TBD') && !r.dem_bio) {
        needsBio.push({ name: r.dem_candidate, party: 'D', context: `${r.state_code} Governor candidate`, state: r.state_code, slot: 'dem_bio' });
      }
      if (r.rep_candidate && !r.rep_candidate.startsWith('TBD') && !r.rep_bio) {
        needsBio.push({ name: r.rep_candidate, party: 'R', context: `${r.state_code} Governor candidate`, state: r.state_code, slot: 'rep_bio' });
      }
    }
    
    console.log(`Found ${needsBio.length} Governor candidates needing bios`);
    
    for (let i = 0; i < needsBio.length; i += 15) {
      const batch = needsBio.slice(i, i + 15);
      console.log(`Processing batch ${Math.floor(i/15)+1}/${Math.ceil(needsBio.length/15)}...`);
      const result = await generateBios(batch);
      
      for (const item of result.bios) {
        const candidate = batch[item.index - 1];
        if (!candidate) continue;
        await conn.query(`UPDATE governor_races SET ${candidate.slot} = ? WHERE state_code = ?`, [item.bio, candidate.state]);
        console.log(`  ✓ ${candidate.name} (${candidate.state})`);
      }
    }
    
  } else if (mode === 'house') {
    console.log('=== HOUSE BIOS ===');
    const [rows] = await conn.query(`SELECT state_code, district_label, candidate1_name, candidate1_party, candidate1_bio, candidate2_name, candidate2_party, candidate2_bio FROM house_races ORDER BY state_code, district_label`);
    
    const needsBio = [];
    for (const r of rows) {
      if (r.candidate1_name && !r.candidate1_name.startsWith('TBD') && r.candidate1_name !== '' && !r.candidate1_bio) {
        needsBio.push({ name: r.candidate1_name, party: r.candidate1_party, context: `${r.state_code}-${r.district_label} House representative/candidate`, state: r.state_code, district: r.district_label, slot: 'candidate1_bio' });
      }
      if (r.candidate2_name && !r.candidate2_name.startsWith('TBD') && r.candidate2_name !== '' && !r.candidate2_bio) {
        needsBio.push({ name: r.candidate2_name, party: r.candidate2_party, context: `${r.state_code}-${r.district_label} House candidate/challenger`, state: r.state_code, district: r.district_label, slot: 'candidate2_bio' });
      }
    }
    
    console.log(`Found ${needsBio.length} House candidates needing bios`);
    
    // Process in batches of 20
    for (let i = 0; i < needsBio.length; i += 20) {
      const batch = needsBio.slice(i, i + 20);
      console.log(`Processing batch ${Math.floor(i/20)+1}/${Math.ceil(needsBio.length/20)} (${i+1}-${Math.min(i+20, needsBio.length)} of ${needsBio.length})...`);
      
      try {
        const result = await generateBios(batch);
        
        for (const item of result.bios) {
          const candidate = batch[item.index - 1];
          if (!candidate) continue;
          await conn.query(`UPDATE house_races SET ${candidate.slot} = ? WHERE state_code = ? AND district_label = ?`, [item.bio, candidate.state, candidate.district]);
        }
        console.log(`  ✓ Batch complete (${batch.length} bios)`);
      } catch (err) {
        console.error(`  ✗ Batch failed: ${err.message}`);
        // Retry once
        try {
          await new Promise(r => setTimeout(r, 2000));
          const result = await generateBios(batch);
          for (const item of result.bios) {
            const candidate = batch[item.index - 1];
            if (!candidate) continue;
            await conn.query(`UPDATE house_races SET ${candidate.slot} = ? WHERE state_code = ? AND district_label = ?`, [item.bio, candidate.state, candidate.district]);
          }
          console.log(`  ✓ Retry successful`);
        } catch (err2) {
          console.error(`  ✗ Retry also failed: ${err2.message}`);
        }
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + 20 < needsBio.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  console.log('\nDone!');
  await conn.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
