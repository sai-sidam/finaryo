import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourcePathArg = process.argv[2];
if (!sourcePathArg) {
  console.error("Usage: npm run db:restore -- /absolute/or/relative/path/to/backup.db");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const sourcePath = path.resolve(process.cwd(), sourcePathArg);
const targetPath = path.resolve(backendRoot, "prisma/dev.db");

if (!existsSync(sourcePath)) {
  console.error(`Backup file not found: ${sourcePath}`);
  process.exit(1);
}

copyFileSync(sourcePath, targetPath);
console.log(`Database restored from ${sourcePath} to ${targetPath}`);
