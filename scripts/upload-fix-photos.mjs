import 'dotenv/config';
import fs from 'fs';
import { execSync } from 'child_process';

const forge_url = process.env.BUILT_IN_FORGE_API_URL;
const forge_key = process.env.BUILT_IN_FORGE_API_KEY;

const candidates = [
  { name: "melissa-bean", source: "/home/ubuntu/upload/search_images/kbSNFdIAqnvM.jpg", dbName: "Melissa Bean", race: "IL-8", party: "D" },
  { name: "jennifer-davis", source: "/home/ubuntu/upload/search_images/M2hACJk8SZHz.jpg", dbName: "Jennifer Davis", race: "IL-8", party: "R" },
  { name: "daniel-biss", source: "/home/ubuntu/upload/search_images/UL8NbQSsteJp.jpg", dbName: "Daniel K. Biss", race: "IL-9", party: "D" },
  { name: "john-elleson", source: "/home/ubuntu/upload/search_images/Clmk2c3jfpaW.jpeg", dbName: "John Elleson", race: "IL-9", party: "R" },
  { name: "james-marter", source: "/home/ubuntu/upload/search_images/RMJjF6iPI9Yo.jpg", dbName: "James Marter", race: "IL-14", party: "R" },
  { name: "paul-nolley", source: "/home/ubuntu/upload/search_images/y7nQzm60RLPy.jpg", dbName: "Paul Nolley", race: "IL-16", party: "D" },
  { name: "chris-gober", source: "/home/ubuntu/upload/search_images/DO2KuwuSMImv.jpg", dbName: "Chris Gober", race: "TX-10", party: "R" },
  { name: "martha-fierro", source: "/home/ubuntu/upload/search_images/KdayVTkrQ6P0.jpg", dbName: "Martha Fierro", race: "TX-29", party: "R" },
  { name: "tony-wied", source: "/home/ubuntu/upload/search_images/tm61oTsZCo4Q.jpg", dbName: "Tony Wied", race: "WI-8", party: "R" },
  { name: "ashley-bell", source: "/home/ubuntu/upload/search_images/UhsZn50V7vrH.jpeg", dbName: "Ashley Bell", race: "NC-10", party: "D" },
];

async function uploadFile(filePath, key) {
  // First crop to square using Python PIL (quick one-liner)
  const croppedPath = `/tmp/${key}`;
  execSync(`python3 -c "
from PIL import Image
img = Image.open('${filePath}').convert('RGB')
w, h = img.size
m = min(w, h)
l, t = (w-m)//2, (h-m)//2
img.crop((l, t, l+m, t+m)).resize((600,600)).save('${croppedPath}', quality=90)
"`);
  
  const data = fs.readFileSync(croppedPath);
  const url = new URL('v1/storage/upload', forge_url + '/');
  url.searchParams.set('path', key);
  
  const blob = new Blob([data], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('file', blob, key);
  
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + forge_key },
    body: form
  });
  
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`  ✗ ${key}: ${resp.status} ${text.substring(0, 80)}`);
    return null;
  }
  const result = await resp.json();
  console.log(`  ✓ ${key}: uploaded`);
  return key;
}

async function main() {
  const results = [];
  for (const c of candidates) {
    console.log(`Processing ${c.dbName} (${c.party} ${c.race})...`);
    const key = `${c.name}_600.jpg`;
    try {
      const uploaded = await uploadFile(c.source, key);
      results.push({ ...c, storageKey: uploaded });
    } catch (e) {
      console.error(`  ✗ Error: ${e.message}`);
      results.push({ ...c, storageKey: null, error: e.message });
    }
  }
  
  console.log('\n=== RESULTS ===');
  const success = results.filter(r => r.storageKey);
  console.log(`Uploaded: ${success.length}/${results.length}`);
  for (const r of success) {
    console.log(`  ${r.dbName}: /manus-storage/${r.storageKey}`);
  }
  
  fs.writeFileSync('/tmp/photo_fix_results.json', JSON.stringify(results, null, 2));
}

main();
