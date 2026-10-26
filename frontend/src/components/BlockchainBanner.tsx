import React, { useState, useEffect } from "react";
import { Activity, CheckCircle, AlertTriangle, Layers, Copy, Check } from "lucide-react";

interface BlockchainStatus {
  online: boolean;
  networkName: string;
  chainId: number;
  latestBlockNumber: number;
  contractAddress: string | null;
  contractDeployed: boolean;
  verifierAddress: string | null;
  verifierBalanceEth: string;
  rpcUrl: string;
}

export const BlockchainBanner: React.FC = () => {
  const [status, setStatus] = useState<BlockchainStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/blockchain/status");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatus(data.status);
        }
      }
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyContract = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !status) return null;

  return (
    <div className="w-full bg-white border-b border-slate-200/80 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {status?.online ? (
            <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-medium border border-emerald-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Node Online: {status.networkName} (Chain ID: {status.chainId})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-medium border border-amber-200/60">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Local Blockchain Node Offline
            </span>
          )}

          {status?.online && (
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-500 font-mono">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Block #{status.latestBlockNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {status?.contractDeployed && status.contractAddress ? (
            <div className="flex items-center gap-1.5 bg-slate-100/90 text-slate-700 px-2.5 py-0.5 rounded-md font-mono border border-slate-200">
              <span className="text-slate-400 font-sans">Contract:</span>
              <span className="font-semibold text-brand-700">
                {status.contractAddress.slice(0, 6)}...{status.contractAddress.slice(-4)}
              </span>
              <button
                onClick={() => handleCopyContract(status.contractAddress!)}
                className="text-slate-400 hover:text-brand-600 transition-colors ml-0.5"
                title="Copy full contract address"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          ) : (
            <span className="text-slate-400 italic">Smart contract ready for deployment</span>
          )}

          {!status?.online && (
            <div className="text-amber-800 text-[11px] bg-amber-100/80 px-2 py-0.5 rounded">
              Start node: <code className="font-mono bg-white px-1 py-0.5 rounded">npx hardhat node</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
