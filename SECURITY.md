# Security baseline for Finaryo MVP

This document tracks the minimum security posture for the MVP while using Plaid sandbox.

## Implemented controls

- Backend-only Plaid credentials (`PLAID_CLIENT_ID`, `PLAID_SECRET`) with no frontend exposure.
- Environment validation on startup using strict schema checks.
- API rate limiting enabled for `/api/*`.
- Secure headers enabled via `helmet`.
- Request body size limit enabled for JSON payloads.
- Request IDs added to responses and error logs (`x-request-id`) for traceability.
- Plaid access tokens encrypted at rest in memory using AES-256-GCM with `APP_ENCRYPTION_KEY`.
- Input validation for Plaid API payloads via `zod`.

## Remaining hardening tasks (before Plaid production request)

- Persist encrypted Plaid access tokens in a real encrypted datastore.
- Add authentication and authorization for all protected API routes.
- Add CSRF protection and strict session management.
- Implement Plaid webhook ingestion and signature verification.
- Add audit logging for authentication and token lifecycle events.
- Add dependency update cadence and security scanning in CI.
- Publish Privacy Policy and Terms of Service.

## Secrets handling rules

- Never commit real `.env` files.
- Never log Plaid tokens, secrets, or full webhook payloads that include sensitive data.
- Rotate secrets if exposure is suspected.

