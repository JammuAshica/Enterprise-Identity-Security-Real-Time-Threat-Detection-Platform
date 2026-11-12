import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Code,
  X,
} from "lucide-react";
import api from "../services/api";

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState("");
  const [usernameSearch, setUsernameSearch] = useState("");
  const [ipSearch, setIpSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const limit = 25;
  const [selectedRawLog, setSelectedRawLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        event_type: eventType || undefined,
        username: usernameSearch || undefined,
        ip_address: ipSearch || undefined,
        skip,
        limit,
      });
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [eventType, skip]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSkip(0);
    fetchLogs();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" /> Searchable Enterprise Audit Logs
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Immutable security event ledger for forensic auditing, compliance, and investigative queries
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Query Filters */}
      <form
        onSubmit={handleSearchSubmit}
        className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono"
      >
        <div>
          <label className="block text-slate-400 mb-1 text-[11px]">Event Type Filter</label>
          <select
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setSkip(0);
            }}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Events</option>
            <option value="login_success">login_success</option>
            <option value="login_failure">login_failure</option>
            <option value="account_locked">account_locked</option>
            <option value="account_unlocked">account_unlocked</option>
            <option value="token_refresh">token_refresh</option>
            <option value="logout">logout</option>
            <option value="privilege_access_denied">privilege_access_denied</option>
            <option value="incident_status_change">incident_status_change</option>
            <option value="password_change">password_change</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1 text-[11px]">Username Search</label>
          <input
            type="text"
            value={usernameSearch}
            onChange={(e) => setUsernameSearch(e.target.value)}
            placeholder="Search username..."
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 text-[11px]">Source IP Search</label>
          <input
            type="text"
            value={ipSearch}
            onChange={(e) => setIpSearch(e.target.value)}
            placeholder="Search IP address..."
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded flex items-center justify-center gap-1.5 transition"
          >
            <Search className="w-3.5 h-3.5" /> Filter Logs
          </button>
        </div>
      </form>

      {/* Audit Log Table */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Log ID</th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Actor / Target</th>
                <th className="py-2.5 px-3">Source IP</th>
                <th className="py-2.5 px-3">Geolocation</th>
                <th className="py-2.5 px-3">HTTP Code</th>
                <th className="py-2.5 px-3 text-right">Raw</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No matching audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-500">#{log.id}</td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toISOString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {log.event_type}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">
                      {log.username || "anonymous"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{log.ip_address}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {log.city ? `${log.city}, ${log.country}` : "Internal / VPN"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-bold ${
                          log.status_code >= 400 ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {log.status_code || 200}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedRawLog(log)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-3 bg-slate-950 border-t border-slate-800 text-xs font-mono text-slate-400">
          <span>Showing records {skip + 1} - {skip + logs.length}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - limit))}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={logs.length < limit}
              onClick={() => setSkip(skip + limit)}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Raw Payload Modal */}
      {selectedRawLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0f172a] border border-cyan-800/80 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" /> Audit Log #{selectedRawLog.id} JSON Telemetry
              </h3>
              <button
                onClick={() => setSelectedRawLog(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="mt-3 p-4 bg-slate-950 rounded-lg font-mono text-xs text-cyan-300 overflow-x-auto max-h-96">
              {JSON.stringify(selectedRawLog, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
