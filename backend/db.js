import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function getPrismaClient() {
  return prisma;
}

export async function ensureDefaultUser(config) {
  const externalId = config.USER_ID ?? "local-user";
  const email = `${externalId}@finaryo.local`;

  return prisma.user.upsert({
    where: { externalId },
    update: {
      email,
      displayName: "Finaryo Owner",
    },
    create: {
      externalId,
      email,
      displayName: "Finaryo Owner",
    },
  });
}
