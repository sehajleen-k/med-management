const { db } = require('./db');

const meds = [
  // Morning
  // {
  //   name: 'Metformin 500mg',
  //   category: 'morning',
  //   instructions: 'Take with breakfast to reduce stomach upset',
  // },
  // {
  //   name: 'Lisinopril 10mg',
  //   category: 'morning',
  //   instructions: 'Take at the same time each morning. Avoid potassium supplements.',
  // },
  // {
  //   name: 'Vitamin D',
  //   category: 'morning',
  //   instructions: 'Take with your morning meal',
  // },
  // Evening
  {
    name: 'Lexapro 5mg',
    category: 'evening',
    instructions: 'Take in the evening, with food',
  },
  {
    name: 'Rameron 30mg',
    category: 'evening',
    instructions: 'Take before bedtime',
  },
  // As needed
  {
    name: 'Zofran 8mg',
    category: 'as_needed',
    instructions: 'Take as needed for nausea.',
  },
  {
    name: 'Klonopin 1mg',
    category: 'as_needed',
    instructions: '1mg 2x a day and one more as needed for amxiety.',
  },
  {
    name: 'Ambien 10mg',
    category: 'as_needed',
    instructions: '10mg once a night as needed for sleep.',
  },
];

const existing = db.prepare('SELECT COUNT(*) as count FROM meds').get();
if (existing.count > 0) {
  console.log(`Database already has ${existing.count} medications. Skipping seed.`);
  console.log('To re-seed, delete data/meds.db and run again.');
  process.exit(0);
}

const insert = db.prepare(
  'INSERT INTO meds (name, category, instructions) VALUES (?, ?, ?)'
);

const insertAll = db.transaction((meds) => {
  for (const med of meds) {
    insert.run(med.name, med.category, med.instructions);
    console.log(`  Added: ${med.name} (${med.category})`);
  }
});

insertAll(meds);
console.log(`\nSeeded ${meds.length} medications successfully.`);
