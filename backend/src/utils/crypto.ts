import crypto from "crypto";
import { ethers } from "ethers";

/**
 * Generate a deterministic or randomized pseudonymous identifier (DID).
 * Example: did:chainverify:e9a28c4b1239...
 * Notice: This never reveals email, name, or plaintext credentials.
 */
export function generatePseudonymousId(seed: string): string {
  const hash = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `did:chainverify:${hash}`;
}

/**
 * Creates a Keccak-256 cryptographic commitment hash for recording on the blockchain.
 * This represents a zero-knowledge/hash commitment of the identity attributes.
 */
export function generateCommitmentHash(payload: {
  pseudonymousId: string;
  documentType: string;
  salt: string;
}): string {
  const message = `${payload.pseudonymousId}:${payload.documentType}:${payload.salt}`;
  return ethers.keccak256(ethers.toUtf8Bytes(message));
}

/**
 * Hash a simulated document or attribute payload to keep all raw documents off-chain.
 */
export function hashDocument(documentContent: string): string {
  return crypto.createHash("sha256").update(documentContent).digest("hex");
}
