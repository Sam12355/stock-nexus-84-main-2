const { Pool } = require('pg');

// Debug: Log environment variables
console.log('🔍 Database Configuration Debug:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');

// Database configuration for Supabase PostgreSQL
const isSupabase = process.env.DB_HOST?.includes('supabase.co');
console.log('Is Supabase:', isSupabase);

const dbConfig = isSupabase 
  ? {
      // Use direct host/port config for Supabase instead of connection string
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'stock_nexus',
      user: process.env.DB_USER || process.env.USER || 'khalifainternationalaward',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

console.log('Connection Config:', dbConfig);

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  console.log('📊 Connected to Supabase PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    console.log('🔍 Executing query:', { text, params });
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('✅ Query successful:', { duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Query error:', error.message);
    console.error('❌ Query text:', text);
    console.error('❌ Query params:', params);
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  return await pool.connect();
};

// Helper function to execute transactions
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  getClient,
  transaction
};

