import React, { useState } from "react";
import {
  ShieldAlert,
  Flame,
  Globe2,
  Lock,
  Activity,
  Play,
  CheckCircle2,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";
import api from "../services/api";

export const AttackSimulatorModal = ({ isOpen, onClose, onAttackTriggered }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [targetUser, setTargetUser] = useState("john_doe");
  const [travelUser, setTravelUser] = useState("sarah_connor");

  if (!isOpen) return null;

  const handleSimulate = async (scenarioType) => {
    setLoading(true);
    setResult(null);
    try {
      let res;
      if (scenarioType === "brute_force") {
        res = await api.triggerBruteForce(targetUser, 6);
      } else if (scenarioType === "impossible_travel") {
        res = await api.triggerImpossibleTravel(travelUser);
      } else if (scenarioType === "privilege_escalation") {
        res = await api.triggerPrivilegeEscalation("john_doe");
      } else if (scenarioType === "benign") {
        res = await api.triggerBenignTraffic();
      } else if (scenarioType === "seed") {
        res = await api.seedDemo();
      }
      setResult(res);
      if (onAttackTriggered) onAttackTriggered();
    } catch (err) {
      setResult({ error: err.message || "Failed to execute simulation" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-[#0f172a] border border-cyan-800/60 rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Real-Time Threat Detection & Attack Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Execute live synthetic attack vectors to demonstrate SOC detection rules, alerting, and automated containment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Attack Options Grid */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Scenario 1: Brute Force */}
          <div className="p-4 rounded-lg bg-slate-900/80 border border-red-900/40 hover:border-red-600/60 transition group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-400 mt-1">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">Scenario 1: Credential Brute-Force Attack</h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-red-900/60 text-red-300 border border-red-700/50">
                      CRITICAL / HIGH ALERT
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulates 6 rapid failed password attempts from external attacker IP (<code className="text-red-300 font-mono">198.51.100.44</code>).
                    Triggers sliding window threshold rule, creates an Incident, and enforces automated account lockout.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <label className="text-xs text-slate-400">Target Username:</label>
                    <input
                      type="text"
                      value={targetUser}
                      onChange={(e) => setTargetUser(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={() => handleSimulate("brute_force")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-red-900/30 transition shrink-0"
              >
                <Play className="w-3.5 h-3.5" /> Launch Attack
              </button>
            </div>
          </div>

          {/* Scenario 2: Impossible Travel */}
          <div className="p-4 rounded-lg bg-slate-900/80 border border-amber-900/40 hover:border-amber-600/60 transition group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-400 mt-1">
                  <Globe2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">Scenario 2: Impossible Travel Anomaly</h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-900/60 text-amber-300 border border-amber-700/50">
                      HIGH ALERT
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulates user authentication from London (<code className="text-amber-300 font-mono">51.5074, -0.1278</code>) followed by
                    Tokyo (<code className="text-amber-300 font-mono">35.6762, 139.6503</code>) within 20 minutes (distance ~9,560 km, speed ~28,600 km/h).
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <label className="text-xs text-slate-400">Target Username:</label>
                    <input
                      type="text"
                      value={travelUser}
                      onChange={(e) => setTravelUser(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={() => handleSimulate("impossible_travel")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-amber-900/30 transition shrink-0"
              >
                <Play className="w-3.5 h-3.5" /> Simulate Anomaly
              </button>
            </div>
          </div>

          {/* Scenario 3: Privilege Escalation */}
          <div className="p-4 rounded-lg bg-slate-900/80 border border-purple-900/40 hover:border-purple-600/60 transition group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-400 mt-1">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">Scenario 3: Unauthorized Privilege Escalation</h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                      CRITICAL ALERT
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulates standard employee (<code className="text-purple-300 font-mono">john_doe</code>) repeatedly attempting to access elevated Admin APIs
                    (<code className="text-purple-300 font-mono">/users/admin/export</code>, <code className="text-purple-300 font-mono">/security-events/delete</code>).
                    Triggers 403 authorization denials and critical escalation alert.
                  </p>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={() => handleSimulate("privilege_escalation")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-purple-900/30 transition shrink-0"
              >
                <Play className="w-3.5 h-3.5" /> Test Privilege Abuse
              </button>
            </div>
          </div>

          {/* Scenario 4: Benign Operations */}
          <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-700/50 transition">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-400 mt-1">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Scenario 4: Benign Enterprise Telemetry</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Generates legitimate employee logins, token refreshes, and routine operations from corporate headquarters to illustrate baseline SOC traffic.
                  </p>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={() => handleSimulate("benign")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shrink-0"
              >
                <Play className="w-3.5 h-3.5" /> Send Normal Telemetry
              </button>
            </div>
          </div>

          {/* Output Display */}
          {result && (
            <div className="mt-4 p-4 rounded-lg bg-black/60 border border-cyan-500/40 font-mono text-xs text-cyan-300">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-900/50 mb-2">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Simulation Output Telemetry:
                </span>
                <span className="text-[10px] text-slate-400">Threat Engine Evaluated</span>
              </div>
              <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-200">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/80 text-xs text-slate-400">
          <span>Click any scenario to see real-time updates across the dashboard and live feed.</span>
          <button
            onClick={() => handleSimulate("seed")}
            className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Reset / Re-seed Demo DB
          </button>
        </div>
      </div>
    </div>
  );
};
