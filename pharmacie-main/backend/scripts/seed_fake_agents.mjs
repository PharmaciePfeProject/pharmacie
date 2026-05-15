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

const AGENT_TABLE = withSchema('AGENT');
const AGENT_SEQ = withSchema('AGENT_SEQ');

const fakeAgents = [
  { name: 'Ben Salah Amine', situation: 'Tunis - Service administratif' },
  { name: 'Trabelsi Marwa', situation: 'Sfax - Consultation externe' },
  { name: 'Gharbi Walid', situation: 'Sousse - Urgences' },
  { name: 'Mansouri Ines', situation: 'Nabeul - Imagerie medicale' },
  { name: 'Khemiri Rami', situation: 'Monastir - Bloc operatoire' },
  { name: 'Ayari Salma', situation: 'Bizerte - Pharmacie clinique' },
  { name: 'Jebali Youssef', situation: 'Kairouan - Medecine interne' },
  { name: 'Haddad Lina', situation: 'Gabes - Pediatrie' },
  { name: 'Mejri Oussama', situation: 'Ariana - Cardiologie' },
  { name: 'Chaabane Nour', situation: 'Ben Arous - Laboratoire' },
  { name: 'Brahmi Sami', situation: 'Mahdia - Chirurgie generale' },
  { name: 'Zouari Hela', situation: 'La Manouba - Suivi ambulatoire' }
];

async function nextId() {
  try {
    const seq = await dbQuery(`SELECT ${AGENT_SEQ}.NEXTVAL AS ID FROM DUAL`);
    return Number(seq.rows[0].ID);
  } catch {
    const m = await dbQuery(`SELECT NVL(MAX(ID), 0) + 1 AS ID FROM ${AGENT_TABLE}`);
    return Number(m.rows[0].ID);
  }
}

async function main() {
  const existing = await dbQuery(`SELECT NAME FROM ${AGENT_TABLE}`);
  const existingNames = new Set((existing.rows || []).map((r) => String(r.NAME || '').trim().toLowerCase()));

  let inserted = 0;
  for (const agent of fakeAgents) {
    const key = agent.name.trim().toLowerCase();
    if (existingNames.has(key)) continue;

    const id = await nextId();
    await dbQuery(
      `INSERT INTO ${AGENT_TABLE} (ID, NAME, SITUATION, CREATED_AT, UPDATED_AT)
       VALUES (:id, :name, :situation, SYSTIMESTAMP, SYSTIMESTAMP)`,
      { id, name: agent.name, situation: agent.situation }
    );
    inserted += 1;
    existingNames.add(key);
  }

  const total = await dbQuery(`SELECT COUNT(*) AS C FROM ${AGENT_TABLE}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Total agents: ${Number(total.rows[0].C)}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
