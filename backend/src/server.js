import "dotenv/config";
import { createApp } from "./app.js";
import { initDb } from "./config/db.js";

const port = process.env.PORT || 4000;

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