import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  Lock,
  CheckCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Radio,
  FileCheck2,
} from "lucide-react";
import api from "../services/api";
import { SeverityBadge, StatusBadge } from "../components/SeverityBadge";

export const Dashboard = ({ onSelectTab }) => {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, alertsRes, incidentsRes, logsRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getAlerts({ limit: 6 }).catch(() => []),
        api.getIncidents({ limit: 5 }).catch(() => []),
        api.getAuditLogs({ limit: 8 }).catch(() => []),
      ]);

      if (statsRes) setStats(statsRes);
      setAlerts(alertsRes);
      setIncidents(incidentsRes);
      setRecentLogs(logsRes);
    } catch (e) {
      console.error("Dashboard data fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 5 seconds for live SOC telemetry
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId, true);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_acknowledged: true } : a))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const totalAlerts = stats?.alerts?.total || alerts.length;
  const criticalCount = stats?.alerts?.critical || 0;
  const highCount = stats?.alerts?.high || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            SOC Threat Intelligence & Real-Time Security Command
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Continuous identity authentication monitoring, anomaly detection, and automated incident response
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5" /> Live Telemetry Synced
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Events */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-700/60 transition shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">TOTAL EVENTS</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.total_events || recentLogs.length}
          </div>
          <div className="text-[11px] text-cyan-400 font-mono mt-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            Real-time ingested
          </div>
        </div>

        {/* Metric 2: Failed Logins */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-700/60 transition shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">FAILED LOGINS</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {stats?.failed_logins || 0}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Brute-force monitored
          </div>
        </div>

        {/* Metric 3: Critical & High Alerts */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-red-900/50 hover:border-red-600 transition shadow-lg relative overflow-hidden">
          {(criticalCount > 0 || highCount > 0) && (
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full blur-xl pointer-events-none"></div>
          )}
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">HIGH/CRITICAL ALERTS</span>
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">
            {criticalCount + highCount}
          </div>
          <div className="text-[11px] text-red-400 font-mono mt-1 font-semibold">
            {criticalCount} Critical, {highCount} High
          </div>
        </div>

        {/* Metric 4: Open Incidents */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-700/60 transition shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">ACTIVE INCIDENTS</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300">
            {stats?.incidents?.open ?? incidents.filter((i) => i.status !== "RESOLVED").length}
          </div>
          <div className="text-[11px] text-purple-400 font-mono mt-1">
            Under Investigation
          </div>
        </div>

        {/* Metric 5: Locked Accounts */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-700/60 transition shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium">LOCKED ACCOUNTS</span>
            <Lock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {stats?.locked_accounts || 0}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Automated suspension
          </div>
        </div>
      </div>

      {/* Middle Section: Severity Distribution & Threat Engine Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Indicators */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" /> Threat Severity Spectrum
            </h3>
            <span className="text-xs font-mono text-slate-400">SOC Classification</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-red-400 flex items-center gap-1.5 font-bold">
                  ● CRITICAL (Privilege Tampering / Mass Brute-Force)
                </span>
                <span className="text-slate-200">{stats?.alerts?.critical || 0}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (stats?.alerts?.critical || 0) * 20)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-orange-400 flex items-center gap-1.5 font-bold">
                  ● HIGH (Impossible Travel / Account Lockouts)
                </span>
                <span className="text-slate-200">{stats?.alerts?.high || 0}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (stats?.alerts?.high || 0) * 20)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-amber-300 flex items-center gap-1.5">
                  ● MEDIUM (Failed Password Bursts)
                </span>
                <span className="text-slate-200">{stats?.alerts?.medium || 0}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (stats?.alerts?.medium || 0) * 15)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-cyan-300 flex items-center gap-1.5">
                  ● LOW (Routine Information)
                </span>
                <span className="text-slate-200">{stats?.alerts?.low || 0}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (stats?.alerts?.low || 0) * 10)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Detection Engine Rules Card */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Active Detection Engines & Correlators
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              ALL POLICIES ENFORCED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" /> Brute-Force Shield
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Sliding window (5 mins, 5 attempts). Automatically locks compromised user accounts and creates incident tickets.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Impossible Travel
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Haversine distance/time calculation. Flags geographical shifts exceeding 800 km/h as anomalous compromise.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" /> Privilege Escalation
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                RBAC endpoint authorization sentry. Detects repeated 403 access denials and alerts on insider threat probing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Recent Security Alerts & Live Telemetry Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Security Alerts */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm">Real-Time Threat Alerts</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-950 text-red-300 border border-red-800">
                {alerts.length} Total
              </span>
            </div>
            <button
              onClick={() => onSelectTab("incidents")}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
            >
              View Incidents <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-mono">
              No threat alerts generated yet. Launch the Attack Simulator to trigger alerts.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border transition ${
                    alert.severity === "CRITICAL"
                      ? "bg-red-950/20 border-red-900/60"
                      : "bg-slate-950/70 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-xs font-bold text-white">{alert.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 mt-1">
                        <span>Target: <strong className="text-slate-300">{alert.target_username || "N/A"}</strong></span>
                        <span>IP: <strong className="text-slate-300">{alert.source_ip || "N/A"}</strong></span>
                        <span>{new Date(alert.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {!alert.is_acknowledged ? (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded shrink-0 transition"
                      >
                        Ack
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 shrink-0">
                        <CheckCircle className="w-3 h-3" /> Ack'd
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Authentication Activity Feed */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm">Authentication & Access Stream</h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            </div>
            <button
              onClick={() => onSelectTab("live-events")}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
            >
              Full Feed <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto font-mono text-xs">
            {recentLogs.map((log) => {
              const isFail = log.event_type.includes("failure") || log.status_code >= 400;
              const isLocked = log.event_type.includes("locked");

              return (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    isLocked
                      ? "bg-red-950/30 border-red-800/50 text-red-300"
                      : isFail
                      ? "bg-amber-950/20 border-amber-800/40 text-amber-200"
                      : "bg-slate-950/60 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isLocked
                          ? "bg-red-500 animate-ping"
                          : isFail
                          ? "bg-amber-500"
                          : "bg-emerald-400"
                      }`}
                    ></span>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span>{log.username || "anonymous"}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({log.event_type})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">
                        {log.details || `HTTP ${log.status_code || 200}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[10px] text-slate-500 shrink-0">
                    <div>{log.ip_address}</div>
                    <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
