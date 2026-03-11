import fs from "node:fs/promises";
import path from "node:path";
import { dbQuery } from "../src/config/db.js";

async function run() {
  const inArg = process.argv[2];
  if (!inArg) {
    console.error("Usage: npm run restore:json -- <path-to-backup.json>");
    process.exit(1);
  }

  const inFile = path.resolve(process.cwd(), inArg);
  const raw = await fs.readFile(inFile, "utf8");
  const data = JSON.parse(raw);

  const users = Array.isArray(data.users) ? data.users : [];
  const userRoles = Array.isArray(data.userRoles) ? data.userRoles : [];

  if (!users.length) {
    console.error("No users found in backup file.");
    process.exit(1);
  }

  for (const u of users) {
    await dbQuery(
      `MERGE INTO PHARMACIE.UTILISATEUR t
       USING (SELECT :ID ID FROM dual) s
       ON (t.ID = s.ID)
       WHEN MATCHED THEN UPDATE SET
         t.ACTIVED = :ACTIVED,
         t.EMAIL = :EMAIL,
         t.FIRSTNAME = :FIRSTNAME,
         t.FUNCTION = :FUNCTION,
         t.LASTNAME = :LASTNAME,
         t.PASSWORD = :PASSWORD,
         t.USERNAME = :USERNAME
       WHEN NOT MATCHED THEN INSERT (ID, ACTIVED, EMAIL, FIRSTNAME, FUNCTION, LASTNAME, PASSWORD, USERNAME)
       VALUES (:ID, :ACTIVED, :EMAIL, :FIRSTNAME, :FUNCTION, :LASTNAME, :PASSWORD, :USERNAME)`,
      {
        ID: u.ID,
        ACTIVED: u.ACTIVED,
        EMAIL: u.EMAIL,
        FIRSTNAME: u.FIRSTNAME,
        FUNCTION: u.FUNCTION,
        LASTNAME: u.LASTNAME,
        PASSWORD: u.PASSWORD,
        USERNAME: u.USERNAME,
      }
    );
  }

  for (const r of userRoles) {
    await dbQuery(
      `MERGE INTO PHARMACIE.UTILISATEUR_ROLE t
       USING (SELECT :USER_ID USER_ID, :ROLES_ID ROLES_ID FROM dual) s
       ON (t.USER_ID = s.USER_ID AND t.ROLES_ID = s.ROLES_ID)
       WHEN NOT MATCHED THEN INSERT (USER_ID, ROLES_ID)
       VALUES (:USER_ID, :ROLES_ID)`,
      {
        USER_ID: r.USER_ID,
        ROLES_ID: r.ROLES_ID,
      }
    );
  }

  console.log(`Restore done from: ${inFile}`);
  console.log(`Users processed: ${users.length}, Roles rows processed: ${userRoles.length}`);
}

run().catch((err) => {
  console.error("Restore failed:", err?.message || err);
  process.exit(1);
});
