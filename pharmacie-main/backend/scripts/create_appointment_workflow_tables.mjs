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

async function ensureTableExists(tableName, createSql, indexSqls = []) {
  try {
    const existsResult = await dbQuery(`SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME='${tableName}'`);
    if (Array.isArray(existsResult?.rows) && existsResult.rows.length > 0) {
      console.log(`OK: Table ${tableName} already exists`);
      return;
    }
  } catch (e) {
    console.warn(`Warning while checking ${tableName}:`, e.message);
  }

  await dbQuery(createSql);
  console.log(`OK: Table ${tableName} created`);

  for (const sql of indexSqls) {
    try {
      await dbQuery(sql);
    } catch (e) {
      if (e?.errorNum !== 955) throw e;
    }
  }
}

async function main() {
  await ensureTableExists(
    'APPOINTMENT_BLOCK',
    `CREATE TABLE ${withSchema('APPOINTMENT_BLOCK')} (
      ID NUMBER PRIMARY KEY,
      DOCTOR_ID NUMBER NOT NULL,
      START_AT TIMESTAMP NOT NULL,
      END_AT TIMESTAMP NOT NULL,
      REASON VARCHAR2(1000 CHAR),
      CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      CREATED_BY_USER_ID NUMBER,
      UPDATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      UPDATED_BY_USER_ID NUMBER,
      CONSTRAINT CK_APPOINTMENT_BLOCK_RANGE CHECK (END_AT > START_AT)
    )`,
    [
      `CREATE INDEX IDX_APPOINTMENT_BLOCK_DOCTOR ON ${withSchema('APPOINTMENT_BLOCK')} (DOCTOR_ID, START_AT, END_AT)`
    ]
  );

  await ensureTableExists(
    'APPOINTMENT_RESCHEDULE_REQUEST',
    `CREATE TABLE ${withSchema('APPOINTMENT_RESCHEDULE_REQUEST')} (
      ID NUMBER PRIMARY KEY,
      APPOINTMENT_ID NUMBER NOT NULL,
      DOCTOR_ID NUMBER NOT NULL,
      SUGGESTED_AT TIMESTAMP NOT NULL,
      REASON VARCHAR2(1000 CHAR),
      STATUS VARCHAR2(20 CHAR) DEFAULT 'PENDING' NOT NULL,
      CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
      CREATED_BY_USER_ID NUMBER,
      DECIDED_AT TIMESTAMP,
      DECIDED_BY_USER_ID NUMBER,
      CONSTRAINT CK_APPT_RESCHEDULE_STATUS CHECK (STATUS IN ('PENDING', 'APPROVED', 'REJECTED'))
    )`,
    [
      `CREATE INDEX IDX_APPT_RESCHEDULE_APPT ON ${withSchema('APPOINTMENT_RESCHEDULE_REQUEST')} (APPOINTMENT_ID, STATUS)`
    ]
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
