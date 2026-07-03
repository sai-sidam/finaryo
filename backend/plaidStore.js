import crypto from "node:crypto";
import { getPrismaClient } from "./db.js";

const prisma = getPrismaClient();

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

export async function savePlaidAccessToken({ userId, encryptedAccessToken, itemId }) {
  const serialized = JSON.stringify(encryptedAccessToken);
  await prisma.plaidItem.upsert({
    where: { userId },
    update: { itemId, encryptedAccessToken: serialized, transactionsCursor: null },
    create: { userId, itemId, encryptedAccessToken: serialized },
  });
}

export async function getPlaidAccessToken({ userId, encryptionSecret }) {
  const item = await prisma.plaidItem.findUnique({ where: { userId } });
  if (!item) {
    return null;
  }
  return decryptSecret(JSON.parse(item.encryptedAccessToken), encryptionSecret);
}

export async function getPlaidItemId(userId) {
  const item = await prisma.plaidItem.findUnique({ where: { userId }, select: { itemId: true } });
  return item?.itemId ?? null;
}

export async function getTransactionsCursor(userId) {
  const item = await prisma.plaidItem.findUnique({
    where: { userId },
    select: { transactionsCursor: true },
  });
  return item?.transactionsCursor ?? null;
}

export async function setTransactionsCursor(userId, cursor) {
  await prisma.plaidItem.update({
    where: { userId },
    data: { transactionsCursor: cursor },
  });
}
