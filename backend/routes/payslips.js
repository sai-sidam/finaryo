import { Router } from "express";
import { createReadStream } from "node:fs";
import path from "node:path";
import { getPrismaClient } from "../db.js";
import { getDefaultUserIdOrThrow } from "../config/defaultUser.js";
import { payslipsDirectory } from "../config/env.js";
import { payslipUpload } from "../middleware/uploads.js";
import { payslipParamsSchema } from "../schemas.js";
import { parsePdf, serializePayslip, tryExtractPayslipData } from "../services/payslips.js";

const prisma = getPrismaClient();
const router = Router();

router.post("/api/payslips/upload", payslipUpload.single("payslip"), async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a payslip PDF." });
    }
    const pdfBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      createReadStream(req.file.path)
        .on("data", (chunk) => chunks.push(chunk))
        .on("end", () => resolve(Buffer.concat(chunks)))
        .on("error", reject);
    });
    const parsed = await parsePdf(pdfBuffer);
    const extracted = tryExtractPayslipData(parsed.text);
    const parseStatus = extracted.extractedPayDate && extracted.extractedNetPay ? "parsed" : "needs_review";
    const payslip = await prisma.payslipDocument.create({
      data: {
        userId,
        fileName: req.file.originalname,
        storagePath: req.file.path,
        extractedPayDate: extracted.extractedPayDate,
        extractedNetPay: extracted.extractedNetPay,
        parseStatus,
        parseNotes:
          parseStatus === "parsed"
            ? "Date and net pay extracted from PDF text."
            : "Could not confidently extract date/net pay. Please confirm manually.",
      },
    });
    return res.status(201).json({
      data: serializePayslip(payslip),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/api/payslips", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const items = await prisma.payslipDocument.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({
      data: items.map(serializePayslip),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/api/payslips/:id/download", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = payslipParamsSchema.parse(req.params ?? {});
    const payslip = await prisma.payslipDocument.findFirst({
      where: { id: params.id, userId },
    });
    if (!payslip) return res.status(404).json({ error: "Payslip not found." });
    // Confine downloads to the payslips directory even if the stored path
    // was tampered with.
    const resolvedPath = path.resolve(payslip.storagePath);
    if (!resolvedPath.startsWith(payslipsDirectory + path.sep)) {
      return res.status(404).json({ error: "Payslip file not available." });
    }
    return res.download(resolvedPath, payslip.fileName);
  } catch (error) {
    return next(error);
  }
});

export default router;
