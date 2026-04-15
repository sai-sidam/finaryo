import crypto from "node:crypto";

const encryptedTokenByUser = new Map();
const plaidItemByUser = new Map();
const transactionCursorByUser = new Map();

function deriveKey(encryptionSecret) {
  return crypto.createHash("sha256").update(encryptionSecret).digest();
}

export function encryptSecret(value, encryptionSecret) {
  const iv = crypto.randomBytes(16);
  const key = deriveKey(encryptionSecret);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(encryptedPayload, encryptionSecret) {
  const key = deriveKey(encryptionSecret);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedPayload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encryptedPayload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function savePlaidAccessToken({ userId, encryptedAccessToken, itemId }) {
  encryptedTokenByUser.set(userId, encryptedAccessToken);
  plaidItemByUser.set(userId, itemId);
}

export function getPlaidAccessToken({ userId, encryptionSecret }) {
  const encryptedAccessToken = encryptedTokenByUser.get(userId);
  if (!encryptedAccessToken) {
    return null;
  }
  return decryptSecret(encryptedAccessToken, encryptionSecret);
}

export function getPlaidItemId(userId) {
  return plaidItemByUser.get(userId) ?? null;
}

export function getTransactionsCursor(userId) {
  return transactionCursorByUser.get(userId) ?? null;
}

export function setTransactionsCursor(userId, cursor) {
  transactionCursorByUser.set(userId, cursor);
}
