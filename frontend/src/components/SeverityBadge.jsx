import React from "react";
import { AlertTriangle, ShieldAlert, AlertCircle, Info } from "lucide-react";

export const SeverityBadge = ({ severity }) => {
  const sev = (severity || "LOW").toUpperCase();

  switch (sev) {
    case "CRITICAL":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/80 text-red-400 border border-red-800/80 shadow-[0_0_10px_rgba(239,68,68,0.25)] animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          CRITICAL
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-950/70 text-orange-400 border border-orange-800/70">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          HIGH
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          MEDIUM
        </span>
      );
    case "LOW":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950/50 text-cyan-300 border border-cyan-800/50">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          LOW
        </span>
      );
  }
};

export const StatusBadge = ({ status }) => {
  const st = (status || "OPEN").toUpperCase();

  switch (st) {
    case "OPEN":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-red-900/40 text-red-300 border border-red-700/50">
          ● OPEN
        </span>
      );
    case "INVESTIGATING":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-900/40 text-amber-300 border border-amber-700/50">
          ● INVESTIGATING
        </span>
      );
    case "CONTAINED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-purple-900/40 text-purple-300 border border-purple-700/50">
          ● CONTAINED
        </span>
      );
    case "RESOLVED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
          ✓ RESOLVED
        </span>
      );
    case "CLOSED":
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
          CLOSED
        </span>
      );
  }
};
