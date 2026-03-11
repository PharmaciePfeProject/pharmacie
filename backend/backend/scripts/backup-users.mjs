import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dbQuery } from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function run() {
  const outArg = process.argv[2];
  const backupDir = path.resolve(__dirname, "..", "backups");
  const outFile = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.join(backupDir, `users-backup-${nowStamp()}.json`);

  await fs.mkdir(path.dirname(outFile), { recursive: true });

  const usersRes = await dbQuery(
    `SELECT ID, ACTIVED, EMAIL, FIRSTNAME, FUNCTION, LASTNAME, PASSWORD, USERNAME
     FROM PHARMACIE.UTILISATEUR
     ORDER BY ID`
  );

  const rolesRes = await dbQuery(
    `SELECT USER_ID, ROLES_ID
     FROM PHARMACIE.UTILISATEUR_ROLE
     ORDER BY USER_ID, ROLES_ID`
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    users: usersRes.rows,
    userRoles: rolesRes.rows,
  };

  await fs.writeFile(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Backup created: ${outFile}`);
  console.log(`Users: ${usersRes.rows.length}, Roles rows: ${rolesRes.rows.length}`);
}

run().catch((err) => {
  console.error("Backup failed:", err?.message || err);
  process.exit(1);
});
