import dotenv from "dotenv";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAndValidateEnv } from "../security.js";

dotenv.config();

export const runtimeConfig = loadAndValidateEnv(process.env);
export const PORT = Number(runtimeConfig.PORT) || 3001;
export const CORS_ORIGIN = runtimeConfig.CORS_ORIGIN;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
export const frontendIndexPath = path.join(frontendDistPath, "index.html");
export const hasFrontendBuild = existsSync(frontendIndexPath);
export const payslipsDirectory = path.resolve(__dirname, "../uploads/payslips");
mkdirSync(payslipsDirectory, { recursive: true });
