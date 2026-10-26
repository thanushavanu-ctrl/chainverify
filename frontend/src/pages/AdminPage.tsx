import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Sidebar } from "../components/Sidebar";
import { StatusBadge } from "../components/StatusBadge";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Layers,
  FileText,
  UserCheck,
} from "lucide-react";

export const AdminPage: React.FC = () => {
  const { user } = useAuth();

  const [metrics, setMetrics] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "audit">("requests");

  // Rejection/Revocation dialog modal state
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: "reject" | "revoke";
    requestId: string;
    pseudonymousId: string;
    reason: string;
  }>({
    isOpen: false,
    type: "reject",
    requestId: "",
    pseudonymousId: "",
    reason: "",
  });

  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, reqRes, auditRes] = await Promise.all([
        fetch("/api/admin/metrics", { credentials: "include" }),
        fetch(`/api/admin/verification-requests?status=${statusFilter}&search=${encodeURIComponent(search)}`, {
          credentials: "include",
        }),
        fetch("/api/admin/audit-logs", { credentials: "include" }),
      ]);

      if (metricsRes.ok) {
        const m = await metricsRes.json();
        if (m.success) setMetrics(m);
      }

      if (reqRes.ok) {
        const r = await reqRes.json();
        if (r.success) setRequests(r.requests || []);
      }

      if (auditRes.ok) {
        const a = await auditRes.json();
        if (a.success) setAuditLogs(a.logs || []);
      }
    } catch (err) {
      console.warn("Failed to fetch admin portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      setActionLoadingId(id);
      setAlert(null);

      const res = await fetch(`/api/admin/verification-requests/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAlert({
          type: "success",
          message: `Identity approved on blockchain! Tx: ${data.transaction?.txHash?.slice(0, 16)}...`,
        });
        await fetchData();
      } else {
        setAlert({
          type: "error",
          message: data.error || "Approval transaction failed.",
        });
      }
    } catch {
      setAlert({ type: "error", message: "Network error during approval." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDialogSubmit = async () => {
    const { requestId, type, reason } = dialogState;
    if (!reason.trim()) return;

    try {
      setActionLoadingId(requestId);
      setAlert(null);

      const endpoint =
        type === "reject"
          ? `/api/admin/verification-requests/${requestId}/reject`
          : `/api/admin/verification-requests/${requestId}/revoke`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAlert({
          type: "success",
          message:
            type === "reject"
              ? "Verification request rejected."
              : `Identity revoked on-chain! Tx: ${data.transaction?.txHash?.slice(0, 16)}...`,
        });
        setDialogState({ isOpen: false, type: "reject", requestId: "", pseudonymousId: "", reason: "" });
        await fetchData();
      } else {
        setAlert({ type: "error", message: data.error || "Action failed." });
      }
    } catch {
      setAlert({ type: "error", message: "Network error executing action." });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center max-w-md space-y-3 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500">
            This administrative area is restricted to authorized verification officers. Please log in as an administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Admin Verifier Portal
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Review pending requests, execute on-chain smart contract status updates, and audit security events.
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Action feedback alert */}
        {alert && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
              alert.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{alert.message}</span>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
            <p className="text-xl font-extrabold text-slate-900 font-mono">{metrics?.database?.totalUsers || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Review</span>
            <p className="text-xl font-extrabold text-amber-700 font-mono">{metrics?.database?.pendingRequests || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Verified On-Chain</span>
            <p className="text-xl font-extrabold text-emerald-700 font-mono">{metrics?.database?.verifiedProfiles || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Revoked</span>
            <p className="text-xl font-extrabold text-purple-700 font-mono">{metrics?.database?.revokedProfiles || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blockchain Status</span>
            <p className="text-xs font-bold text-emerald-600 font-mono">
              {metrics?.blockchainStatus?.online ? "Node Online (31337)" : "Offline"}
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "requests"
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Verification Review Queue ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "audit"
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            System Audit Log ({auditLogs.length})
          </button>
        </div>

        {/* Verification Queue Tab */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-700"
              >
                <option value="ALL">All Request Statuses</option>
                <option value="PENDING">Pending Only</option>
                <option value="APPROVED">Approved Only</option>
                <option value="REJECTED">Rejected Only</option>
                <option value="REVOKED">Revoked Only</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {requests.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No verification requests matching criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Applicant</th>
                        <th className="py-3 px-4">Pseudonymous DID</th>
                        <th className="py-3 px-4">Simulated Document</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.map((req) => {
                        const isActionRunning = actionLoadingId === req.id;
                        return (
                          <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-800">{req.identityProfile?.user?.fullName}</p>
                              <p className="text-[11px] text-slate-400">{req.identityProfile?.user?.email}</p>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                              {req.identityProfile?.pseudonymousId?.slice(0, 24)}...
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-700">
                                {req.identityProfile?.documentType || "PASSPORT"}
                              </span>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Hash: {req.identityProfile?.commitmentHash?.slice(0, 10)}...
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={req.status} size="sm" />
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {new Date(req.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {req.status === "PENDING" && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(req.id)}
                                      disabled={isActionRunning}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-all disabled:opacity-50 flex items-center gap-1 shadow-xs"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Approve On-Chain</span>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setDialogState({
                                          isOpen: true,
                                          type: "reject",
                                          requestId: req.id,
                                          pseudonymousId: req.identityProfile?.pseudonymousId,
                                          reason: "",
                                        })
                                      }
                                      disabled={isActionRunning}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-[11px] transition-all disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {req.status === "APPROVED" && (
                                  <button
                                    onClick={() =>
                                      setDialogState({
                                        isOpen: true,
                                        type: "revoke",
                                        requestId: req.id,
                                        pseudonymousId: req.identityProfile?.pseudonymousId,
                                        reason: "",
                                      })
                                    }
                                    disabled={isActionRunning}
                                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-semibold text-[11px] transition-all disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <AlertTriangle className="w-3 h-3 text-purple-600" />
                                    <span>Revoke On-Chain</span>
                                  </button>
                                )}
                              </div>
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
        )}

        {/* Audit Log Tab */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Tx Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{log.details}</td>
                      <td className="py-3 px-4 font-mono text-brand-600">
                        {log.txHash ? `${log.txHash.slice(0, 10)}...` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dialog for Rejection / Revocation Reason */}
        {dialogState.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                {dialogState.type === "reject" ? (
                  <XCircle className="w-5 h-5 text-rose-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-purple-600" />
                )}
                <span>
                  {dialogState.type === "reject"
                    ? "Reject Verification Request"
                    : "Revoke On-Chain Identity"}
                </span>
              </div>

              <p className="text-xs text-slate-600">
                Please enter the reason for this action. This reason will be recorded immutably in the smart contract event and audit log.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Justification
                </label>
                <textarea
                  required
                  rows={3}
                  value={dialogState.reason}
                  onChange={(e) => setDialogState({ ...dialogState, reason: e.target.value })}
                  placeholder="e.g. Expired credentials, signature mismatch, or security revocation"
                  className="block w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setDialogState({ isOpen: false, type: "reject", requestId: "", pseudonymousId: "", reason: "" })
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDialogSubmit}
                  disabled={!dialogState.reason.trim()}
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all disabled:opacity-50 ${
                    dialogState.type === "reject"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-purple-600 hover:bg-purple-700"
                  }`}
                >
                  Confirm & Commit to Blockchain
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
