import { Router } from "express";
import { runtimeConfig } from "../config/env.js";

const router = Router();

router.get("/api/health", (_req, res) => {
  res.json({ status: "ok", plaidEnv: runtimeConfig.PLAID_ENV });
});

export default router;
