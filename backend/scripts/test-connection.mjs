import oracledb from "oracledb";
import "dotenv/config";

async function testConnection() {
  console.log("🔄 Test de connexion Oracle en cours...");
  console.log(`📍 Détails de connexion:`);
  console.log(`   - User: ${process.env.ORACLE_USER}`);
  console.log(`   - Connect String: ${process.env.ORACLE_CONNECT_STRING}`);
  console.log("");

  try {
    const options = {
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    };

    // Ajouter le privilege si spécifié
    if (process.env.ORACLE_PRIVILEGE === 'SYSDBA') {
      options.privilege = oracledb.SYSDBA;
    } else if (process.env.ORACLE_PRIVILEGE === 'SYSOPER') {
      options.privilege = oracledb.SYSOPER;
    }

    const conn = await oracledb.getConnection(options);

    console.log("✅ Connexion établie avec succès !");

    // Test simple pour vérifier
    const result = await conn.execute("SELECT 'Connexion réussie!' as message FROM dual");
    const getVal = (r, i = 0) => Array.isArray(r) ? r[i] : (r && Object.values(r)[i]);
    console.log(`📌 Résultat du test: ${getVal(result.rows[0])}`);

    // Vérifier les tables disponibles
    const tables = await conn.execute(
      `SELECT table_name FROM user_tables ORDER BY table_name`
    );
    console.log(`\n📊 Nombre de tables trouvées: ${tables.rows.length}`);
    if (tables.rows.length > 0) {
      console.log(`Exemple de tables:`);
      tables.rows.slice(0, 5).forEach((row) => {
        console.log(`   - ${getVal(row)}`);
      });
    }

    await conn.close();
    console.log("\n✅ Test de connexion réussi !");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur de connexion:");
    console.error(`   ${err.message}`);
    process.exit(1);
  }
}

testConnection();
