import React from "react";
import {
  LayoutDashboard,
  Radio,
  AlertOctagon,
  Users,
  FileText,
  UserCheck,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Sidebar = ({ activeTab, onSelectTab }) => {
  const { user, isAdmin, isAnalyst } = useAuth();

  const navItems = [
    {
      id: "dashboard",
      label: "SOC Dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "security_analyst", "employee"],
    },
    {
      id: "live-events",
      label: "Live SOC Feed",
      icon: Radio,
      badge: "LIVE",
      roles: ["admin", "security_analyst", "employee"],
    },
    {
      id: "incidents",
      label: "Incident Response",
      icon: AlertOctagon,
      roles: ["admin", "security_analyst"],
    },
    {
      id: "users",
      label: "Identity & Access (IAM)",
      icon: Users,
      roles: ["admin", "security_analyst"],
    },
    {
      id: "audit-logs",
      label: "Searchable Audit Logs",
      icon: FileText,
      roles: ["admin", "security_analyst"],
    },
    {
      id: "employee-portal",
      label: "Employee Self-Service",
      icon: UserCheck,
      roles: ["admin", "security_analyst", "employee"],
    },
  ];

  const userRole = user?.role || "employee";
  const accessibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0a0f1d] flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16">
      {/* Navigation Links */}
      <div className="p-4 space-y-1.5">
        <div className="px-3 py-1.5 text-[11px] font-mono tracking-wider text-slate-500 uppercase">
          Navigation Control
        </div>
        {accessibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition group text-left ${
                isActive
                  ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition ${
                    isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Role & Security Status Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] pb-1.5 border-b border-slate-800">
            <span>ACCESS LEVEL</span>
            <span className="capitalize text-cyan-400 font-bold">{user?.role}</span>
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>JWT Bearer Protected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>RBAC Policy Enforced</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
