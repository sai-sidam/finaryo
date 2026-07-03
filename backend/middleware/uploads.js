import multer from "multer";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { FILE_UPLOAD_LIMIT_BYTES } from "../config/constants.js";
import { payslipsDirectory } from "../config/env.js";

export function uploadValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

const STATEMENT_EXTENSIONS = new Set([".csv", ".xlsx", ".xls"]);
const STATEMENT_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "text/plain",
]);

export const statementUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_UPLOAD_LIMIT_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname ?? "").toLowerCase();
    if (STATEMENT_EXTENSIONS.has(extension) && STATEMENT_MIME_TYPES.has(file.mimetype)) {
      return cb(null, true);
    }
    return cb(uploadValidationError("Only CSV or Excel (.csv, .xlsx, .xls) statements are supported."));
  },
});

export const payslipUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, payslipsDirectory),
    filename: (_req, file, cb) => {
      const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`);
    },
  }),
  limits: {
    fileSize: FILE_UPLOAD_LIMIT_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname ?? "").toLowerCase();
    if (file.mimetype === "application/pdf" && extension === ".pdf") {
      return cb(null, true);
    }
    return cb(uploadValidationError("Only PDF payslips are supported."));
  },
});
