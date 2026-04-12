const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Fix 1: OK Senate - update to show Kevin Hern as main R candidate
  await conn.execute(
    `UPDATE senate_races SET 
      candidate1_name = ?,
      candidate2_name = ?,
      notes = ?
      WHERE state_code = 'OK' AND is_special = 0`,
    [
      "TBD — D Primary: Jun 16, 2026 (Cassity, Green, LaVann, Priest, Thomas, Yen)",
      "Kevin Hern (frontrunner) — R Primary: Jun 16, 2026",
      "Open seat — Markwayne Mullin resigned. R primary Jun 16: Kevin Hern (frontrunner), Sean Buckner, Gary England, Nick Hankins, Brian Ragain, Tammy Swearengin, Wayne Washington. D primary Jun 16: R.O. Joe Cassity, Troy Green, Rebekah LaVann, Jim Priest, N'Kiyla Thomas, Ervin Yen. Rating: Solid Republican."
    ]
  );
  console.log('OK Senate updated');

  // Fix 2: KY Senate - fix primary date in notes from May 20 to May 19
  const [kyRows] = await conn.execute("SELECT notes FROM senate_races WHERE state_code = 'KY'");
  if (kyRows.length > 0 && kyRows[0].notes) {
    const newNotes = kyRows[0].notes.replace(/May 20/g, 'May 19');
    await conn.execute("UPDATE senate_races SET notes = ? WHERE state_code = 'KY'", [newNotes]);
    console.log('KY Senate date fixed');
  }

  // Fix 3: FL Special Senate - update D candidate to show primary pending
  await conn.execute(
    `UPDATE senate_races SET 
      candidate1_name = ?,
      notes = ?
      WHERE state_code = 'FL' AND is_special = 1`,
    [
      "TBD — D Primary: Aug 18, 2026 (Grayson, Vindman, Nixon, Jenkins, Weil, and others)",
      "Special election to fill seat vacated by Marco Rubio (became Secretary of State). D primary Aug 18: Alan Grayson, Alex Vindman, Angela Nixon, Jennifer Jenkins, Joshua Weil, and others. R: Ashley Moody (main R candidate). General election Nov 3, 2026. Rating: Likely Republican."
    ]
  );
  console.log('FL Special Senate updated');

  // Fix 4: OH-1 House - update R candidate to show primary TBD with candidates listed
  await conn.execute(
    `UPDATE house_races SET candidate2_name = ? WHERE state_code = 'OH' AND district = '1'`,
    ["TBD — R Primary: May 5, 2026 (Adams, Conroy, Erbeck, Oglesby-Henry)"]
  );
  console.log('OH-1 House updated');

  await conn.end();
  console.log('All corrections applied successfully');
}

main().catch(console.error);
