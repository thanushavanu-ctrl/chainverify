import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generatePseudonymousId, generateCommitmentHash } from "../src/utils/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ChainVerify database with initial demo accounts...");

  // 1. Create Administrator Account
  const adminPasswordHash = await bcrypt.hash("Admin@12345", 12);
  const adminPseudonymousId = generatePseudonymousId("admin@chainverify.io_seed");
  const adminCommitment = generateCommitmentHash({
    pseudonymousId: adminPseudonymousId,
    documentType: "ADMIN_CREDENTIAL",
    salt: "chainverify_admin_salt",
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@chainverify.io" },
    update: {},
    create: {
      email: "admin@chainverify.io",
      passwordHash: adminPasswordHash,
      fullName: "System Security Administrator",
      role: "ADMIN",
      identityProfile: {
        create: {
          pseudonymousId: adminPseudonymousId,
          commitmentHash: adminCommitment,
          status: "VERIFIED",
          statusReason: "Authorized System Administrator Identity",
        },
      },
    },
  });

  // 2. Create Demo User Account
  const userPasswordHash = await bcrypt.hash("Demo@12345", 12);
  const userPseudonymousId = generatePseudonymousId("demo@chainverify.io_seed");
  const userCommitment = generateCommitmentHash({
    pseudonymousId: userPseudonymousId,
    documentType: "PASSPORT",
    salt: "chainverify_demo_salt",
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@chainverify.io" },
    update: {},
    create: {
      email: "demo@chainverify.io",
      passwordHash: userPasswordHash,
      fullName: "Alex Rivera",
      role: "USER",
      identityProfile: {
        create: {
          pseudonymousId: userPseudonymousId,
          commitmentHash: userCommitment,
          status: "PENDING",
          documentType: "PASSPORT",
          documentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          statusReason: "Initial registration pending simulated verification review",
        },
      },
    },
    include: {
      identityProfile: true,
    },
  });

  // Create a pending verification request for demo user
  if (demoUser.identityProfile) {
    const existingReq = await prisma.verificationRequest.findFirst({
      where: { identityProfileId: demoUser.identityProfile.id },
    });

    if (!existingReq) {
      await prisma.verificationRequest.create({
        data: {
          identityProfileId: demoUser.identityProfile.id,
          status: "PENDING",
          reviewerNotes: "Submitted simulated document: PASSPORT (US-STATE-DEPT)",
        },
      });
    }
  }

  // Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "DATABASE_SEEDED",
      details: "Seed script created admin and demo user accounts",
    },
  });

  console.log("✓ Seed completed successfully!");
  console.log("------------------------------------------");
  console.log("Admin Account:");
  console.log("  Email:    admin@chainverify.io");
  console.log("  Password: Admin@12345");
  console.log("  Role:     ADMIN");
  console.log("------------------------------------------");
  console.log("Demo User Account:");
  console.log("  Email:    demo@chainverify.io");
  console.log("  Password: Demo@12345");
  console.log("  Role:     USER");
  console.log("------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
