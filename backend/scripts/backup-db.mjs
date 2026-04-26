import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const dbFilePath = path.resolve(backendRoot, "prisma/dev.db");
const backupsDirectory = path.resolve(backendRoot, "backups");

if (!existsSync(dbFilePath)) {
  console.error(`Database file not found at ${dbFilePath}`);
  process.exit(1);
}

mkdirSync(backupsDirectory, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputFile = path.resolve(backupsDirectory, `dev-${timestamp}.db`);
copyFileSync(dbFilePath, outputFile);

console.log(`Database backup created: ${outputFile}`);
