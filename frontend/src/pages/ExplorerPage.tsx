import React, { useState, useEffect } from "react";
import { StatusBadge } from "../components/StatusBadge";
import {
  Search,
  Layers,
  Filter,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Hash,
  Clock,
  ArrowUpRight,
} from "lucide-react";

interface BlockchainEvent {
  type: string;
  identifier: string;
  commitmentHash?: string;
  actor: string;
  reason?: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

export const ExplorerPage: React.FC = () => {
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const [identifiers, setIdentifiers] = useState<string[]>([]);
  const [metrics, setMetrics] = useState({
    totalRegistered: 0,
    totalVerified: 0,
    totalPending: 0,
    totalRejected: 0,
    totalRevoked: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  // Single identifier lookup modal / card state
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const fetchExplorerData = async () => {
    try {
      setLoading(true);
      const [eventsRes, identRes, metricsRes] = await Promise.all([
        fetch("/api/blockchain/transactions"),
        fetch("/api/blockchain/identifiers"),
        fetch("/api/admin/metrics"),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        if (data.success) setEvents(data.events || []);
      }

      if (identRes.ok) {
        const data = await identRes.json();
        if (data.success) setIdentifiers(data.identifiers || []);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        if (data.success) {
          setMetrics(data.onChain || data.database);
        }
      }
    } catch (err) {
      console.warn("Failed to load blockchain explorer records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplorerData();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(text);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const handleInspectIdentifier = async (id: string) => {
    try {
      setLookupLoading(true);
      const res = await fetch(`/api/blockchain/identity/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRecord(data.record);
      }
    } catch {
      setSelectedRecord(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.txHash.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "REGISTERED" && e.type === "IdentityRegistered") return true;
    if (statusFilter === "VERIFIED" && e.type === "IdentityApproved") return true;
    if (statusFilter === "REJECTED" && e.type === "IdentityRejected") return true;
    if (statusFilter === "REVOKED" && e.type === "IdentityRevoked") return true;

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-brand-600" />
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                ChainVerify Decentralized Explorer
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live audit ledger of pseudonymous identity registrations, verifications, and cryptographic commitments on the local Ethereum network.
            </p>
          </div>

          <button
            onClick={fetchExplorerData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Aggregate Network Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered</span>
            <p className="text-2xl font-extrabold text-slate-900 font-mono">{metrics.totalRegistered}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Verified On-Chain</span>
            <p className="text-2xl font-extrabold text-emerald-700 font-mono">{metrics.totalVerified}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Pending Review</span>
            <p className="text-2xl font-extrabold text-amber-700 font-mono">{metrics.totalPending}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Revoked Attestations</span>
            <p className="text-2xl font-extrabold text-purple-700 font-mono">{metrics.totalRevoked}</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Pseudonymous DID (did:chainverify:...) or Tx Hash (0x...)"
              className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Event Types</option>
              <option value="REGISTERED">IdentityRegistered</option>
              <option value="VERIFIED">IdentityApproved</option>
              <option value="REJECTED">IdentityRejected</option>
              <option value="REVOKED">IdentityRevoked</option>
            </select>
          </div>
        </div>

        {/* Selected Record Modal / Details View */}
        {selectedRecord && (
          <div className="p-5 bg-white rounded-2xl border-2 border-brand-200 shadow-md space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {selectedRecord.identifier}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close details
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[10px] text-slate-400 block mb-0.5">Current Status</span>
                <StatusBadge status={selectedRecord.status.toUpperCase()} size="sm" />
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[10px] text-slate-400 block mb-0.5">Commitment Hash</span>
                <span className="font-mono text-[11px] text-slate-800 break-all">{selectedRecord.commitmentHash}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[10px] text-slate-400 block mb-0.5">Last Verifier / Actor</span>
                <span className="font-mono text-[11px] text-brand-600 break-all">{selectedRecord.updatedBy}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">Reason: {selectedRecord.statusReason}</p>
          </div>
        )}

        {/* Events Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              On-Chain Contract Events ({filteredEvents.length})
            </h3>
            <span className="text-[11px] text-slate-400">
              Zero sensitive identity info stored on-chain
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No matching on-chain events found.</p>
              <p className="text-[11px] text-slate-400">
                Register a new account or approve a pending request to generate real-time smart contract events.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Pseudonymous DID</th>
                    <th className="py-3 px-4">Block #</th>
                    <th className="py-3 px-4">Tx Hash</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.map((e, index) => {
                    const eventStyles: Record<string, { bg: string; text: string }> = {
                      IdentityRegistered: { bg: "bg-blue-50", text: "text-blue-700" },
                      IdentityApproved: { bg: "bg-emerald-50", text: "text-emerald-700" },
                      IdentityRejected: { bg: "bg-rose-50", text: "text-rose-700" },
                      IdentityRevoked: { bg: "bg-purple-50", text: "text-purple-700" },
                    };
                    const style = eventStyles[e.type] || { bg: "bg-slate-50", text: "text-slate-700" };

                    return (
                      <tr key={`${e.txHash}_${index}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[10px] ${style.bg} ${style.text}`}>
                            {e.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{e.identifier}</span>
                            <button
                              onClick={() => handleCopy(e.identifier)}
                              className="text-slate-400 hover:text-slate-600"
                              title="Copy DID"
                            >
                              {copiedTx === e.identifier ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">#{e.blockNumber}</td>
                        <td className="py-3 px-4 font-mono text-brand-600">
                          <div className="flex items-center gap-1">
                            <span>{e.txHash.slice(0, 8)}...{e.txHash.slice(-6)}</span>
                            <button
                              onClick={() => handleCopy(e.txHash)}
                              className="text-slate-400 hover:text-brand-600"
                              title="Copy Tx Hash"
                            >
                              {copiedTx === e.txHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(e.timestamp).toLocaleDateString()} {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleInspectIdentifier(e.identifier)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800"
                          >
                            Inspect
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
