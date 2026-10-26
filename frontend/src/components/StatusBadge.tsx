import React from "react";
import { CheckCircle2, Clock, XCircle, AlertTriangle, ShieldOff } from "lucide-react";

export type IdentityStatusType = "VERIFIED" | "PENDING" | "REJECTED" | "REVOKED" | "NONE" | string;

interface StatusBadgeProps {
  status: IdentityStatusType;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  size = "md",
}) => {
  const normStatus = (status || "NONE").toUpperCase();

  const configs: Record<
    string,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    VERIFIED: {
      label: "Verified On-Chain",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    },
    PENDING: {
      label: "Verification Pending",
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <Clock className="w-4 h-4 text-amber-600" />,
    },
    REJECTED: {
      label: "Verification Rejected",
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      icon: <XCircle className="w-4 h-4 text-rose-600" />,
    },
    REVOKED: {
      label: "Revoked On-Chain",
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      icon: <AlertTriangle className="w-4 h-4 text-purple-600" />,
    },
    NONE: {
      label: "Unverified",
      bg: "bg-slate-100",
      text: "text-slate-600",
      border: "border-slate-200",
      icon: <ShieldOff className="w-4 h-4 text-slate-500" />,
    },
  };

  const current = configs[normStatus] || configs.NONE;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1 font-medium",
    md: "px-3 py-1 text-xs gap-1.5 font-semibold",
    lg: "px-4 py-1.5 text-sm gap-2 font-bold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs transition-all ${current.bg} ${current.text} ${current.border} ${sizeClasses[size]}`}
    >
      {showIcon && current.icon}
      <span>{current.label}</span>
    </span>
  );
};
