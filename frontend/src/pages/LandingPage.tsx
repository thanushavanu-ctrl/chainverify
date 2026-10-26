import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  Lock,
  Database,
  Layers,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  EyeOff,
  Cpu,
  KeyRound,
  ExternalLink,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Ambient background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-100/50 via-brand-50/20 to-transparent pointer-events-none rounded-b-[4rem]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-semibold shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-brand-600 animate-pulse"></span>
            Decentralized Identity & Security Protocol
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Your Identity. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">
              Verified by Blockchain.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            ChainVerify bridges traditional password security with tamper-evident Ethereum smart contracts.
            Verify digital credentials and maintain permanent proof of authenticity without ever storing plain-text
            passwords or sensitive personal data on-chain.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-md shadow-brand-500/25 transition-all"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-md shadow-brand-500/25 transition-all"
                >
                  Create Verified Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm px-6 py-3 rounded-xl border border-slate-200 shadow-xs transition-all"
                >
                  Sign In to Portal
                </Link>
              </>
            )}

            <Link
              to="/explorer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-brand-700 font-semibold text-sm px-5 py-3 rounded-xl border border-indigo-200/80 transition-all"
            >
              <Layers className="w-4 h-4" />
              Live Blockchain Explorer
            </Link>
          </div>
        </div>
      </section>

      {/* Trust & Architecture Principles Banner */}
      <section className="border-y border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-slate-900 font-mono">0 Plaintext</div>
              <p className="text-xs text-slate-500 font-medium">No credentials stored on-chain</p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-brand-600 font-mono">Argon2 / Bcrypt</div>
              <p className="text-xs text-slate-500 font-medium">High work-factor server hashing</p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-emerald-600 font-mono">100% Immutable</div>
              <p className="text-xs text-slate-500 font-medium">Solidity contract verification trail</p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-indigo-600 font-mono">DID Protocol</div>
              <p className="text-xs text-slate-500 font-medium">Pseudonymous commitment hashes</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Visual Step Workflow */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How ChainVerify Works
          </h2>
          <p className="text-sm text-slate-600">
            A dual-layer security architecture separating sensitive user authentication from decentralized identity consensus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg mb-4 border border-brand-100">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Off-Chain Password Authentication</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When a user signs up, their password is salted and hashed off-chain using modern cryptographic algorithms.
              Passwords, raw identity files, and personal data are strictly isolated in a secure database and never touched by the blockchain.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Argon2id / Bcrypt 12 Rounds
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4 border border-indigo-100">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Pseudonymous DID & Commitment</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The system generates a cryptographically derived pseudonymous DID (e.g. <code>did:chainverify:...</code>)
              and calculates a Keccak-256 commitment hash representing the user's verified claim.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-brand-700 font-semibold">
              <Cpu className="w-3.5 h-3.5 text-brand-600" />
              Zero-Knowledge Privacy Proof
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-4 border border-emerald-100">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Smart Contract Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The <code>IdentityRegistry.sol</code> smart contract records the verification status, timestamp, and verifier address.
              Anyone with the pseudonymous ID can verify the authenticity of an identity without exposing personal records.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-purple-700 font-semibold">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              OpenZeppelin AccessControl Registry
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="bg-slate-100/70 border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Key Features & Enterprise Security
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Designed according to academic rigor and cybersecurity best practices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 space-y-2">
              <ShieldCheck className="w-6 h-6 text-brand-600" />
              <h4 className="text-sm font-bold text-slate-900">Role-Based Access Control</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                OpenZeppelin <code>AccessControl</code> ensures only authorized verifiers can confirm or revoke identities on-chain.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 space-y-2">
              <EyeOff className="w-6 h-6 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">Zero Privacy Leakage</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Zero personal identifiers (names, emails, passport scans) ever touch the public blockchain mempool or storage.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 space-y-2">
              <FileCheck className="w-6 h-6 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">Audit Trail & Reports</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Comprehensive audit logs and downloadable cryptographic proof certificates in machine-readable JSON format.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 space-y-2">
              <KeyRound className="w-6 h-6 text-purple-600" />
              <h4 className="text-sm font-bold text-slate-900">Web3 Wallet Integration</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                MetaMask support allows users and administrators to connect their Web3 wallets to inspect transactions and sign proofs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Breakdown */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
          Built with Modern Production Standards
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-700">
          <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">React 18 + Vite</span>
          <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">TypeScript</span>
          <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">Tailwind CSS</span>
          <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">Solidity 0.8.20</span>
          <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">Hardhat & Ethers.js v6</span>
          <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">OpenZeppelin Contracts</span>
          <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">Node.js + Express</span>
          <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">Prisma ORM</span>
          <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">Zod Validation</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 ChainVerify — Blockchain-Based Password & Identity Verification System</p>
          <div className="flex items-center gap-4">
            <Link to="/explorer" className="hover:text-brand-600 transition-colors">
              Blockchain Explorer
            </Link>
            <span>•</span>
            <span className="text-slate-400 font-mono">Academic Demonstration Project</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
