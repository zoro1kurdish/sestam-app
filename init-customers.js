const db = require('./db');

const createCustomersTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      email TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  try {
    await db.query(queryText);
    console.log('Table "customers" created or already exists.');
  } catch (err) {
    console.error('Error creating customers table:', err.stack);
  }
};

createCustomersTable();
