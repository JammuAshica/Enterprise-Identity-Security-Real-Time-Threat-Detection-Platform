import React, { useState } from "react";
import { Shield, Lock, User, AlertCircle, KeyRound, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@Enterprise2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await login(username, password);
      setSuccess("Authentication successful! Redirecting to SOC dashboard...");
    } catch (err) {
      setError(err.message || "Failed to authenticate. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glowing cyber mesh */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 mb-3 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            ENTERPRISE <span className="text-cyan-400">SOC PORTAL</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Identity Security & Threat Detection Platform
          </p>
        </div>

        {/* Error Alert / Lockout Notice */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/80 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Authentication Rejection:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Success Notice */}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Username or Corporate Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Secret Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-cyan-950/50 transition cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" /> Authenticate & Issue JWT
              </>
            )}
          </button>
        </form>

        {/* Quick Role Switchers for Demonstration */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-mono text-slate-400 mb-2 text-center uppercase tracking-wider">
            Quick-Select Demo Roles
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("admin", "Admin@Enterprise2026!")}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition"
            >
              <div className="text-[10px] font-bold text-cyan-400">Admin</div>
              <div className="text-[9px] text-slate-400 font-mono">admin</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("analyst_jane", "Analyst@Enterprise2026!")}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition"
            >
              <div className="text-[10px] font-bold text-amber-400">SOC Analyst</div>
              <div className="text-[9px] text-slate-400 font-mono">analyst_jane</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("john_doe", "Employee@Enterprise2026!")}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition"
            >
              <div className="text-[10px] font-bold text-slate-300">Employee</div>
              <div className="text-[9px] text-slate-400 font-mono">john_doe</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
