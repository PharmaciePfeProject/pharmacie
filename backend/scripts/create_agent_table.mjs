import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

async function createAgentTable() {
  const schema = (process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || '').trim().toUpperCase();
  const agentTable = schema ? `${schema}.AGENT` : 'AGENT';

  try {
    // Check if table exists
    const existsResult = await dbQuery(`SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME='AGENT'`);
    if (Array.isArray(existsResult?.rows) && existsResult.rows.length > 0) {
      console.log('✓ Table AGENT already exists');
      return;
    }
  } catch (e) {
    console.warn('Warning while checking AGENT existence:', e.message);
  }

  console.log('Creating AGENT table...');

  try {
    await dbQuery(`
      CREATE TABLE ${agentTable} (
        ID NUMBER PRIMARY KEY,
        NAME VARCHAR2(255) NOT NULL,
        SITUATION VARCHAR2(500),
        CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP,
        UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP
      )
    `);
    console.log('✓ Table AGENT created successfully');

    // Create sequence for auto-increment
    try {
      await dbQuery(`
        CREATE SEQUENCE ${schema ? `${schema}.AGENT_SEQ` : 'AGENT_SEQ'}
        START WITH 1
        INCREMENT BY 1
        NOCYCLE
      `);
      console.log('✓ Sequence AGENT_SEQ created successfully');
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.warn('Warning: Could not create sequence:', e.message);
      }
    }
  } catch (e) {
    console.error('Error creating table:', e.message);
    throw e;
  }
}

createAgentTable().catch(console.error);
