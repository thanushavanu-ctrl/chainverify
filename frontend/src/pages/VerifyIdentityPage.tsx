import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Sidebar } from "../components/Sidebar";
import { StatusBadge } from "../components/StatusBadge";
import {
  ShieldCheck,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  Clock,
  Layers,
  Fingerprint,
} from "lucide-react";

export const VerifyIdentityPage: React.FC = () => {
  const { user, identityProfile, refreshProfile } = useAuth();

  const [documentType, setDocumentType] = useState<"PASSPORT" | "NATIONAL_ID" | "DRIVERS_LICENSE">("PASSPORT");
  const [documentNumberMasked, setDocumentNumberMasked] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("Dept of State");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestRequest, setLatestRequest] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/identity/status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLatestRequest(data.latestRequest);
        }
      }
    } catch (err) {
      console.warn("Failed to load status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/identity/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          documentType,
          documentNumberMasked,
          issuingAuthority,
          simulatedPayload: `SIMULATED_DOC_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg("Verification request submitted successfully for administrative review.");
        await refreshProfile();
        await fetchStatus();
      } else {
        setErrorMsg(data.error || "Failed to submit verification request.");
      }
    } catch {
      setErrorMsg("Network error communicating with the server.");
    } finally {
      setLoading(false);
    }
  };

  const isVerified = identityProfile?.status === "VERIFIED";
  const isPending = identityProfile?.status === "PENDING" && latestRequest?.status === "PENDING";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Title */}
        <div className="pb-2 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-brand-600" />
              Identity Verification Request
            </h1>
            <StatusBadge status={identityProfile?.status || "NONE"} size="md" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulated decentralized identity verification workflow with OpenZeppelin smart contract attestation.
          </p>
        </div>

        {/* Academic Project Simulation Notice */}
        <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-start gap-3 text-xs text-indigo-950">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-indigo-900">
              Simulated Identity Verification Workflow (Academic & Prototype Demonstration)
            </p>
            <p className="text-indigo-800 text-[11px] leading-relaxed">
              This system demonstrates the cryptographic integration of off-chain hashed credentials with on-chain smart contract registries.
              No government documents or biometric databases are connected.
            </p>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Verification Status Card if Already Verified */}
        {isVerified && (
          <div className="bg-white rounded-2xl border border-emerald-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Your Identity is Fully Verified On-Chain</h3>
                <p className="text-xs text-slate-500">
                  Confirmed on the Ethereum smart contract by an authorized administrator.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs font-mono border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Identifier:</span>
                <span className="text-slate-800 select-all">{identityProfile?.pseudonymousId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">On-Chain Tx Hash:</span>
                <span className="text-brand-600 select-all font-semibold">
                  {identityProfile?.verifiedTxHash || "0x9f8e7d6c5b4a3..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Mined Block:</span>
                <span className="text-slate-800">#{identityProfile?.verifiedBlockNumber || 1}</span>
              </div>
            </div>
          </div>
        )}

        {/* Request in Progress Card */}
        {isPending && !isVerified && (
          <div className="bg-white rounded-2xl border border-amber-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Verification Review Pending</h3>
                <p className="text-xs text-slate-500">
                  Your request has been submitted and is currently in the administrator queue for verification.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 space-y-1 border border-amber-200/60">
              <p className="font-semibold">Next Step for Faculty Demonstration:</p>
              <p className="text-[11px] text-amber-800">
                Log in as Administrator (<code>admin@chainverify.io</code> / <code>Admin@12345</code>) and open the{" "}
                <strong>Admin Portal</strong> to approve this request and execute the on-chain smart contract transaction.
              </p>
            </div>
          </div>
        )}

        {/* Verification Submission Form (if not verified and not pending) */}
        {!isVerified && !isPending && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Submit Verification Details</h3>
              <p className="text-xs text-slate-500">
                All document attributes are hashed before submission. No raw document images or plain text numbers are published to the blockchain.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Document Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Identification Document Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDocumentType(type)}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                        documentType === type
                          ? "border-brand-600 bg-brand-50/70 text-brand-700 ring-2 ring-brand-500/20"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span>{type.replace("_", " ")}</span>
                        {documentType === type && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Simulated Standard Format
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Number (Masked / Simulated)
                </label>
                <input
                  type="text"
                  required
                  value={documentNumberMasked}
                  onChange={(e) => setDocumentNumberMasked(e.target.value)}
                  placeholder="e.g. US-PASS-9928172"
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>

              {/* Issuing Authority */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issuing Authority / Jurisdiction
                </label>
                <input
                  type="text"
                  required
                  value={issuingAuthority}
                  onChange={(e) => setIssuingAuthority(e.target.value)}
                  placeholder="e.g. Department of State / National Registry"
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Security Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Lock className="w-3.5 h-3.5 text-brand-600" />
                  <span>Privacy-Preserving Commitment Generation</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  The backend computes: <code>SHA-256(DocumentData)</code> and a Keccak-256 commitment hash.
                  Only this cryptographic hash is stored on the decentralized blockchain.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Verification Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
