import "dotenv/config";
import { createApp } from "./app.js";
import { initDb } from "./config/db.js";
import { validateRequiredEnv } from "./config/env.js";

const { port } = validateRequiredEnv();

async function bootstrap() {
  await initDb();
  const app = createApp();

  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});