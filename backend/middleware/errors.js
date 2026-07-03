import multer from "multer";
import { z } from "zod";
import { FILE_UPLOAD_LIMIT_BYTES } from "../config/constants.js";

export function apiNotFoundHandler(_req, res) {
  res.status(404).json({ error: "API route not found" });
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: `File too large. Upload a file up to ${Math.floor(FILE_UPLOAD_LIMIT_BYTES / (1024 * 1024))}MB.`,
    });
  }

  if (typeof err?.statusCode === "number") {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: "Invalid request payload.",
      details: err.issues.map((issue) => issue.message),
    });
  }

  if (err?.response?.data) {
    const plaidError = err.response.data;
    return res.status(400).json({
      error: plaidError.error_message ?? "Plaid request failed.",
      plaidErrorCode: plaidError.error_code,
      plaidErrorType: plaidError.error_type,
    });
  }

  console.error(`[${_req.requestId}]`, err);
  return res.status(500).json({
    error: "Internal server error",
    requestId: _req.requestId,
  });
}
