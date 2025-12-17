const { Pool } = require('pg');
require('dotenv').config();

// The pool will use the DATABASE_URL from the .env file automatically
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};
