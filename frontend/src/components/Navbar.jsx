import React, { useState } from "react";
import { Shield, Zap, LogOut, User, Radio, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AttackSimulatorModal } from "./AttackSimulatorModal";

export const Navbar = ({ onRefreshData }) => {
  const { user, logout, isAdmin, isAnalyst } = useAuth();
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-[#0c1220]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-white text-base">
                ENTERPRISE<span className="text-cyan-400">SOC</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                v1.0.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide font-mono hidden sm:block">
              Identity Security & Real-Time Threat Detection Platform
            </p>
          </div>
        </div>

        {/* Center Live Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-300">THREAT ENGINE:</span>
          <span className="text-emerald-400 font-semibold">ACTIVE MONITORING</span>
        </div>

        {/* Action Controls & User Identity */}
        <div className="flex items-center gap-3">
          {/* Attack Simulator Launcher Button */}
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(239,68,68,0.35)] transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current animate-bounce" />
            <span>Attack Simulator</span>
          </button>

          {/* User Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-300 text-xs font-bold">
              {user?.full_name ? user.full_name[0] : "U"}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-200 leading-none">
                {user?.full_name || user?.username}
              </div>
              <div className="text-[10px] text-cyan-400 font-mono capitalize leading-tight mt-0.5">
                {user?.role?.replace("_", " ")}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Attack Simulator Modal */}
      <AttackSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onAttackTriggered={onRefreshData}
      />
    </>
  );
};
