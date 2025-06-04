#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

async function checkCarriers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const result = await client.query('SELECT id, name, type FROM shipping_carriers ORDER BY id');
    
    console.log('🚚 TRANSPORTADORAS EXISTENTES:');
    console.log('==============================');
    
    result.rows.forEach(carrier => {
      console.log(`ID: "${carrier.id}" | Nome: "${carrier.name}" | Tipo: ${carrier.type}`);
    });
    
  } finally {
    await client.end();
  }
}

checkCarriers(); 