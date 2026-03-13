// One-time migration: replace single Klonopin as_needed entry
// with 3 entries (morning, evening, as_needed).
// Run once in the Railway shell: node migrate-klonopin.js

const { db } = require('./db');

// Deactivate all existing Klonopin entries
const deactivated = db
  .prepare("UPDATE meds SET active = 0 WHERE LOWER(name) LIKE '%klonopin%'")
  .run();
console.log(`Deactivated ${deactivated.changes} existing Klonopin entry/entries.`);

// Add the 3 correct entries
const insert = db.prepare(
  'INSERT INTO meds (name, category, instructions) VALUES (?, ?, ?)'
);

insert.run('Klonopin 1mg', 'morning', null);
console.log('  Added: Klonopin 1mg (morning)');

insert.run('Klonopin 1mg', 'evening', null);
console.log('  Added: Klonopin 1mg (evening)');

insert.run('Klonopin 1mg', 'as_needed', 'Take only if needed. Do not exceed prescribed daily dose.');
console.log('  Added: Klonopin 1mg (as needed)');

console.log('\nDone. Refresh the dashboard to see the changes.');
