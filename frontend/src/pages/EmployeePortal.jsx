import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Shield,
  Key,
  Laptop,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  Users,
  AlertCircle,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export const EmployeePortal = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [myActivity, setMyActivity] = useState([]);
  const [requestData, setRequestData] = useState({
    resource_name: "Production Database Read-Only Replica",
    justification: "Investigating user authentication anomalies",
    duration_hours: 4,
  });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [sessRes, dirRes, actRes] = await Promise.all([
        api.getSessions().catch(() => []),
        api.getDirectory().catch(() => []),
        api.getMyActivity(10).catch(() => []),
      ]);
      setSessions(sessRes);
      setDirectory(dirRes);
      setMyActivity(actRes);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRevokeSession = async (sessionId) => {
    try {
      await api.revokeSession(sessionId);
      setNotice(`Session ${sessionId} successfully revoked.`);
      fetchData();
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      alert(err.message || "Failed to revoke session");
    }
  };

  const handleAccessRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.submitAccessRequest(requestData);
      setNotice(`Access request ${res.request_id} submitted for Security Operations approval!`);
      fetchData();
      setTimeout(() => setNotice(""), 5000);
    } catch (err) {
      alert(err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-cyan-400" /> Employee Self-Service & Identity Access
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Manage your enterprise credentials, active session tokens, and request elevated security entitlements
        </p>
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Profile & Security Posture Card */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
        <div className="md:col-span-1 border-r border-slate-800/80 pr-4">
          <span className="text-[10px] text-slate-500 uppercase block">AUTHENTICATED IDENTITY</span>
          <h3 className="text-base font-bold text-white mt-0.5">{user?.full_name}</h3>
          <p className="text-cyan-400 font-semibold">@{user?.username}</p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
            {user?.role?.replace("_", " ")}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase block">DEPARTMENT</span>
          <span className="text-slate-200 font-semibold">{user?.department}</span>
          <span className="text-[10px] text-slate-500 uppercase block mt-3">OFFICIAL EMAIL</span>
          <span className="text-slate-200 break-all">{user?.email}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase block">ACCOUNT SECURITY</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
            <Shield className="w-3.5 h-3.5" /> Good Standing
          </span>
          <span className="text-[10px] text-slate-500 uppercase block mt-3">MFA & LOCKOUT STATUS</span>
          <span className="text-slate-300">Protected (5 Attempt Max)</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">SESSION SECURITY</span>
          <span className="text-xs text-slate-300 block mt-1">
            JWT Token auto-expires in 30 minutes with rolling refresh token.
          </span>
        </div>
      </div>

      {/* Middle Grid: Active Sessions & Elevated Access Request */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active User Sessions */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Laptop className="w-4 h-4 text-cyan-400" /> Active Device Sessions ({sessions.length})
            </h3>
            <span className="text-xs font-mono text-slate-400">Token Revocation</span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  s.is_revoked
                    ? "bg-slate-950/40 border-slate-800/50 opacity-50"
                    : "bg-slate-950 border-slate-800"
                }`}
              >
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">IP: {s.ip_address}</span>
                    {s.is_revoked ? (
                      <span className="text-[9px] px-1.5 py-0.5 bg-red-950 text-red-400 rounded border border-red-900">
                        REVOKED
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-900">
                        CURRENT / ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-xs">
                    {s.user_agent || "Web Browser"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Created: {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>

                {!s.is_revoked && (
                  <button
                    onClick={() => handleRevokeSession(s.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded transition"
                    title="Terminate Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Elevated Access Request Form */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" /> Request Elevated Privilege / Role
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded border border-cyan-800">
              AUDITED ACTION
            </span>
          </div>

          <form onSubmit={handleAccessRequest} className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Target Resource or Service</label>
              <input
                type="text"
                required
                value={requestData.resource_name}
                onChange={(e) => setRequestData({ ...requestData, resource_name: e.target.value })}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Business Justification</label>
              <textarea
                required
                rows={3}
                value={requestData.justification}
                onChange={(e) => setRequestData({ ...requestData, justification: e.target.value })}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Requested Duration (Hours)</label>
              <input
                type="number"
                min={1}
                max={72}
                value={requestData.duration_hours}
                onChange={(e) => setRequestData({ ...requestData, duration_hours: parseInt(e.target.value) })}
                className="w-24 p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Submit for SOC Approval
            </button>
          </form>
        </div>
      </div>

      {/* Corporate Colleague Directory */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" /> Enterprise Employee Directory
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          {directory.map((emp) => (
            <div key={emp.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-bold text-white text-xs">{emp.full_name}</div>
              <div className="text-cyan-400 text-[11px]">@{emp.username}</div>
              <div className="text-slate-400 text-[10px]">{emp.department}</div>
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-900 text-slate-300 border border-slate-700 capitalize">
                {emp.role.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
