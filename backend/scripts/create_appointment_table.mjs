import 'dotenv/config';
import { dbQuery } from '../src/config/db.js';

function getSchemaName() {
  const rawSchema = process.env.ORACLE_SCHEMA || process.env.ORACLE_USER || '';
  return rawSchema.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
}

function withSchema(objectName) {
  const schema = getSchemaName();
  return schema ? `${schema}.${objectName}` : objectName;
}

const appointmentTable = withSchema('APPOINTMENT');

async function createAppointmentTable() {
  try {
    const existsResult = await dbQuery(`SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME='APPOINTMENT'`);
    if (Array.isArray(existsResult?.rows) && existsResult.rows.length > 0) {
      console.log('✓ Table APPOINTMENT already exists');
      return;
    }
  } catch (error) {
    console.warn('Warning while checking APPOINTMENT existence:', error.message);
  }

  console.log('Creating APPOINTMENT table...');

  await dbQuery(`
    CREATE TABLE ${appointmentTable} (
      ID NUMBER PRIMARY KEY,
      AGENT_ID NUMBER NOT NULL,
      AGENT_NAME VARCHAR2(255 CHAR) NOT NULL,
      DOCTOR_ID NUMBER NOT NULL,
      DOCTOR_NAME VARCHAR2(255 CHAR) NOT NULL,
      APPOINTMENT_AT TIMESTAMP NOT NULL,
      STATUS VARCHAR2(20 CHAR) DEFAULT 'SCHEDULED' NOT NULL,
      NOTES VARCHAR2(1000 CHAR),
      CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      CREATED_BY_USER_ID NUMBER,
      UPDATED_BY_USER_ID NUMBER,
      CONSTRAINT CK_APPOINTMENT_STATUS CHECK (STATUS IN ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELED'))
    )
  `);

  try {
    await dbQuery(`CREATE SEQUENCE ${withSchema('APPOINTMENT_SEQ')} START WITH 1 INCREMENT BY 1 NOCYCLE`);
    console.log('✓ Sequence APPOINTMENT_SEQ created successfully');
  } catch (error) {
    if (!String(error.message || '').includes('already exists')) {
      console.warn('Warning: Could not create sequence:', error.message);
    }
  }

  console.log('✓ Table APPOINTMENT created successfully');
}

createAppointmentTable().catch((error) => {
  console.error('Error creating appointment table:', error.message);
  process.exitCode = 1;
});
