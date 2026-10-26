import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generatePseudonymousId, generateCommitmentHash, hashDocument } from "../src/utils/crypto";

// Test suite for Backend Security and Cryptographic logic
async function runTests() {
  console.log("==========================================");
  console.log(" Running Backend Cryptography & Auth Tests");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Password Hashing Test
  console.log("\n[1] Password Hashing & Verification (Bcrypt)");
  const password = "SecurePassword@123";
  const hash = await bcrypt.hash(password, 12);
  assert(hash.startsWith("$2"), "Password hashed with bcrypt prefix");
  assert(hash !== password, "Plaintext password never equals hash");
  assert(await bcrypt.compare(password, hash), "Correct password validates against hash");
  assert(!(await bcrypt.compare("WrongPassword@123", hash)), "Incorrect password is rejected");

  // 2. Cryptographic Pseudonymity
  console.log("\n[2] Pseudonymous Identity Generation");
  const did1 = generatePseudonymousId("user1@example.com_salt1");
  const did2 = generatePseudonymousId("user2@example.com_salt2");
  assert(did1.startsWith("did:chainverify:"), "DID has correct did:chainverify prefix");
  assert(did1 !== did2, "Distinct seeds produce distinct pseudonymous identifiers");
  assert(!did1.includes("user1") && !did1.includes("example"), "DID contains zero plaintext email information");

  // 3. Commitment Hashing
  console.log("\n[3] Commitment Hash Integrity");
  const commitment = generateCommitmentHash({
    pseudonymousId: did1,
    documentType: "PASSPORT",
    salt: "123456",
  });
  assert(commitment.startsWith("0x") && commitment.length === 66, "Commitment is valid bytes32 hex string");

  // 4. Document Hashing
  console.log("\n[4] Off-chain Document Hash");
  const docHash = hashDocument("PASSPORT:X9928172:US-GOV");
  assert(docHash.length === 64, "Document hash is SHA-256 64-char string");
  assert(!docHash.includes("X9928172"), "Document hash reveals no document content");

  // 5. JWT Signing & Expiration
  console.log("\n[5] JWT Token Generation & Verification");
  const secret = "test_secret_key_chainverify_123456789";
  const token = jwt.sign({ id: "usr_1", email: "alex@example.com", role: "USER" }, secret, {
    expiresIn: "1h",
  });
  const decoded = jwt.verify(token, secret) as any;
  assert(decoded.id === "usr_1", "JWT payload preserves user ID");
  assert(decoded.role === "USER", "JWT payload preserves role");

  console.log("\n==========================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
