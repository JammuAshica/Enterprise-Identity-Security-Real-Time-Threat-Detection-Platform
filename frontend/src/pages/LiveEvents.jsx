import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  Play,
  Pause,
  Filter,
  Search,
  RefreshCw,
  MapPin,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldAlert,
} from "lucide-react";
import api from "../services/api";

export const LiveEvents = () => {
  const [events, setEvents] = useState([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      const data = await api.getAuditLogs({ limit: 40 });
      setEvents(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEvents();
    if (!isStreaming) return;

    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const filteredEvents = events.filter((ev) => {
    if (filterType && ev.event_type !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchUser = ev.username?.toLowerCase().includes(term);
      const matchIp = ev.ip_address?.toLowerCase().includes(term);
      const matchDetails = ev.details?.toLowerCase().includes(term);
      if (!matchUser && !matchIp && !matchDetails) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Stream Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" /> Live SOC Event Telemetry Feed
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Streaming authentication transactions, authorization checks, and real-time security events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
              isStreaming
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700 hover:bg-emerald-900"
                : "bg-amber-950/80 text-amber-300 border border-amber-700 hover:bg-amber-900"
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5" /> PAUSE STREAM
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> RESUME STREAM
              </>
            )}
          </button>

          <button
            onClick={fetchEvents}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Event Types</option>
            <option value="login_success">login_success</option>
            <option value="login_failure">login_failure</option>
            <option value="account_locked">account_locked</option>
            <option value="account_unlocked">account_unlocked</option>
            <option value="privilege_access_denied">privilege_access_denied</option>
            <option value="token_refresh">token_refresh</option>
            <option value="logout">logout</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by IP, username or detail..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Main Events Feed & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Table */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Target / User</th>
                  <th className="py-2.5 px-3">Source IP</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.map((ev) => {
                  const isFail = ev.event_type.includes("failure") || ev.status_code >= 400;
                  const isLocked = ev.event_type.includes("locked");
                  const isSelected = selectedEvent?.id === ev.id;

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`hover:bg-slate-800/50 cursor-pointer transition ${
                        isSelected
                          ? "bg-cyan-950/50 border-l-2 border-cyan-400"
                          : isLocked
                          ? "bg-red-950/20"
                          : isFail
                          ? "bg-amber-950/10"
                          : ""
                      }`}
                    >
                      <td className="py-2 px-3">
                        {isLocked ? (
                          <AlertOctagon className="w-4 h-4 text-red-500" />
                        ) : isFail ? (
                          <XCircle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        {ev.event_type}
                      </td>
                      <td className="py-2 px-3 text-cyan-300 font-bold">
                        {ev.username || "anonymous"}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{ev.ip_address}</td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Forensic Inspection Drawer */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" /> Forensic Inspection
            </h3>
            {selectedEvent && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Log #{selectedEvent.id}
              </span>
            )}
          </div>

          {!selectedEvent ? (
            <div className="py-20 text-center text-slate-500 text-xs font-mono">
              Click any event in the live feed to inspect its full forensic telemetry.
            </div>
          ) : (
            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">EVENT CLASSIFICATION</span>
                <span className="text-sm font-bold text-cyan-400">{selectedEvent.event_type}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">USERNAME</span>
                  <span className="text-slate-200 font-bold">{selectedEvent.username || "anonymous"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">HTTP CODE</span>
                  <span className={`font-bold ${selectedEvent.status_code >= 400 ? "text-red-400" : "text-emerald-400"}`}>
                    {selectedEvent.status_code || 200}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SOURCE IP</span>
                  <span className="text-slate-200">{selectedEvent.ip_address}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TIMESTAMP (UTC)</span>
                  <span className="text-slate-400 text-[11px]">{new Date(selectedEvent.timestamp).toISOString()}</span>
                </div>
              </div>

              {/* Geo Forensics */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 flex items-center gap-1 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" /> GEOLOCATION TELEMETRY
                </div>
                <div className="text-slate-300">
                  {selectedEvent.city || "Unknown City"}, {selectedEvent.country || "Unknown Country"}
                </div>
                {selectedEvent.latitude && (
                  <div className="text-[10px] text-slate-500">
                    GPS: {selectedEvent.latitude}, {selectedEvent.longitude}
                  </div>
                )}
              </div>

              {/* Endpoint / Method */}
              {selectedEvent.endpoint && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px]">TARGET ENDPOINT</span>
                  <div className="text-slate-300 break-all">
                    <span className="text-purple-400 font-bold">{selectedEvent.http_method || "POST"} </span>
                    {selectedEvent.endpoint}
                  </div>
                </div>
              )}

              {/* User Agent */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5" /> USER AGENT
                </div>
                <div className="text-[11px] text-slate-400 break-all leading-tight">
                  {selectedEvent.user_agent || "Standard HTTP Client"}
                </div>
              </div>

              {/* Raw Details */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[10px]">DETECTION LOG PAYLOAD</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedEvent.details || "Telemetry recorded by identity gateway."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
