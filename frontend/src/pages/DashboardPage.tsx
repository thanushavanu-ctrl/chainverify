import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { Sidebar } from "../components/Sidebar";
import { StatusBadge } from "../components/StatusBadge";
import {
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Fingerprint,
  RefreshCw,
  Hash,
  Download,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user, identityProfile, refreshProfile } = useAuth();
  const { account, networkName, connectWallet } = useWallet();

  const [blockchainOnline, setBlockchainOnline] = useState(true);
  const [liveOnChainRecord, setLiveOnChainRecord] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      // 1. Fetch live identity status & on-chain validation
      const statusRes = await fetch("/api/identity/status", { credentials: "include" });
      if (statusRes.ok) {
        const data = await statusRes.json();
        if (data.success) {
          setBlockchainOnline(data.onChain.available);
          setLiveOnChainRecord(data.onChain.record);
        }
      }

      // 2. Fetch history & audit logs
      const historyRes = await fetch("/api/identity/history", { credentials: "include" });
      if (historyRes.ok) {
        const data = await historyRes.json();
        if (data.success) {
          setRecentLogs(data.auditLogs || []);
        }
      }
    } catch (err) {
      console.warn("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await loadDashboardData();
  };

  const status = identityProfile?.status || "NONE";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Identity Dashboard
              </h1>
              <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-2.5 py-0.5 rounded-full border border-brand-200/60">
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Welcome back, <span className="font-semibold text-slate-700">{user?.fullName}</span> ({user?.email})
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh Status</span>
            </button>

            <a
              href="/api/user/report"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </a>
          </div>
        </div>

        {/* Blockchain Node Status Warning (if offline) */}
        {!blockchainOnline && (
          <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Local Hardhat Blockchain Node is Offline or Not Responding</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                To enable live smart contract identity confirmations, launch your local node:{" "}
                <code className="bg-amber-100 font-mono px-1 py-0.5 rounded text-amber-900">npx hardhat node</code>,
                then deploy the contract with:{" "}
                <code className="bg-amber-100 font-mono px-1 py-0.5 rounded text-amber-900">npx hardhat run scripts/deploy.ts --network localhost</code>.
              </p>
            </div>
          </div>
        )}

        {/* Identity Verification Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Official Credential Status
              </span>
              <div className="flex items-center gap-3">
                <StatusBadge status={status} size="lg" />
                {blockchainOnline && liveOnChainRecord && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Smart Contract Synced
                  </span>
                )}
              </div>
            </div>

            {status !== "VERIFIED" && (
              <Link
                to="/verify"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm shadow-brand-500/20 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{status === "PENDING" ? "View Verification Request" : "Request Verification"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Cryptographic Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Pseudonymous DID */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                <Fingerprint className="w-3.5 h-3.5 text-brand-600" />
                <span>Pseudonymous DID (Off-Chain Identifier)</span>
              </div>
              <p className="font-mono text-slate-800 break-all select-all font-medium text-[11px]">
                {identityProfile?.pseudonymousId || "Not assigned"}
              </p>
              <p className="text-[10px] text-slate-400">
                Derived deterministically; zero personal data revealed.
              </p>
            </div>

            {/* Commitment Hash */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                <span>Commitment Hash (Keccak-256)</span>
              </div>
              <p className="font-mono text-slate-800 break-all select-all font-medium text-[11px]">
                {identityProfile?.commitmentHash || "0x0000000000000000000000000000000000000000"}
              </p>
              <p className="text-[10px] text-slate-400">
                Cryptographic anchor recorded directly on the blockchain.
              </p>
            </div>

            {/* Blockchain Attestation Info */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>On-Chain Registration / Verification</span>
              </div>
              {identityProfile?.verifiedTxHash ? (
                <div className="space-y-1 font-mono text-[11px]">
                  <p className="text-emerald-700 font-semibold">Tx: {identityProfile.verifiedTxHash.slice(0, 10)}...</p>
                  <p className="text-slate-600">Block #{identityProfile.verifiedBlockNumber || "Mined"}</p>
                </div>
              ) : identityProfile?.registeredTxHash ? (
                <div className="space-y-1 font-mono text-[11px]">
                  <p className="text-brand-700">Reg Tx: {identityProfile.registeredTxHash.slice(0, 10)}...</p>
                  <p className="text-slate-600">Block #{identityProfile.registeredBlockNumber || "Pending"}</p>
                </div>
              ) : (
                <p className="text-slate-400 italic">No blockchain attestation mined yet</p>
              )}
              <Link
                to="/explorer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 pt-0.5"
              >
                Inspect in Blockchain Explorer
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Dual Panels: Web3 Wallet & Recent Audit Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Web3 Wallet Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-4 h-4 text-brand-600" />
                Web3 Wallet Connection
              </h3>
            </div>

            {account ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>MetaMask Connected</span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-700 break-all select-all">{account}</p>
                  <p className="text-[10px] text-slate-500">Network: {networkName || "Localhost"}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Connect your Ethereum wallet (e.g., MetaMask) to query contract states and demonstrate Web3 interaction.
                </p>
                <button
                  onClick={connectWallet}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-3.5 h-3.5 text-brand-600" />
                  <span>Connect MetaMask</span>
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 leading-normal">
              Notice: Web3 wallet connection is an optional cryptographic utility and does not replace password authentication.
            </div>
          </div>

          {/* Audit Trail & History */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                Recent Audit Trail (Immutable Events)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {recentLogs.length} Records
              </span>
            </div>

            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent activity recorded.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                {recentLogs.slice(0, 6).map((log, index) => (
                  <div key={log.id || index} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 font-mono text-[11px]">
                        {log.action}
                      </span>
                      <p className="text-slate-500 text-[11px]">{log.details}</p>
                      {log.txHash && (
                        <p className="text-[10px] font-mono text-brand-600">
                          Tx: {log.txHash.slice(0, 12)}...
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
