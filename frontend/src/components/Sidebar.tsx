import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  ShieldCheck,
  Search,
  User,
  ShieldAlert,
  Copy,
  Check,
  LogOut,
  Fingerprint,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { user, identityProfile, logout } = useAuth();
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleCopyDid = () => {
    if (identityProfile?.pseudonymousId) {
      navigator.clipboard.writeText(identityProfile.pseudonymousId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navItems = [
    {
      label: "Overview",
      path: "/dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: "Verify Identity",
      path: "/verify",
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      label: "Chain Explorer",
      path: "/explorer",
      icon: <Search className="w-4 h-4" />,
    },
    {
      label: "Profile & Security",
      path: "/profile",
      icon: <User className="w-4 h-4" />,
    },
  ];

  if (user?.role === "ADMIN") {
    navItems.push({
      label: "Admin Portal",
      path: "/admin",
      icon: <ShieldAlert className="w-4 h-4 text-purple-600" />,
    });
  }

  return (
    <aside className="w-64 shrink-0 hidden lg:block bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {/* User Card */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {user?.fullName ? user.fullName[0] : "U"}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</h4>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-700 bg-brand-100/60 px-1.5 py-0.2 rounded">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Pseudonymous DID Badge */}
        {identityProfile?.pseudonymousId && (
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="flex items-center gap-1 text-[11px] font-medium text-brand-800">
                <Fingerprint className="w-3.5 h-3.5 text-brand-600" />
                Pseudonymous DID
              </span>
              <button
                onClick={handleCopyDid}
                className="text-brand-600 hover:text-brand-800 p-0.5 rounded transition-colors"
                title="Copy DID"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <p className="font-mono text-[10px] text-slate-700 break-all select-all leading-tight">
              {identityProfile.pseudonymousId}
            </p>
          </div>
        )}

        {/* Navigation links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <span className={active ? "text-white" : "text-slate-400"}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout button */}
      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
