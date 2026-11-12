import React, { useState, useEffect } from "react";
import {
  AlertOctagon,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  Clock,
  User,
  Shield,
  FileText,
} from "lucide-react";
import api from "../services/api";
import { SeverityBadge, StatusBadge } from "../components/SeverityBadge";
import { useAuth } from "../context/AuthContext";

export const Incidents = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [mitigationText, setMitigationText] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.getIncidents({ status: statusFilter || undefined });
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
      } else if (selectedIncident) {
        const updated = data.find((i) => i.id === selectedIncident.id);
        if (updated) setSelectedIncident(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const handleAssignAnalyst = async () => {
    if (!selectedIncident || !assigneeId) return;
    try {
      const updated = await api.assignIncident(selectedIncident.id, parseInt(assigneeId));
      setSelectedIncident(updated);
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setActionMessage(`Incident assigned successfully! Status: ${updated.status}`);
      setTimeout(() => setActionMessage(""), 4000);
    } catch (err) {
      alert(err.message || "Failed to assign analyst");
    }
  };

  const handleSuspendTarget = async () => {
    if (!selectedIncident) return;
    try {
      const updated = await api.suspendTargetUser(selectedIncident.id, 60);
      setSelectedIncident(updated);
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setActionMessage(`Target account '${updated.target_user}' temporarily suspended and sessions revoked!`);
      setTimeout(() => setActionMessage(""), 5000);
    } catch (err) {
      alert(err.message || "Failed to suspend target account");
    }
  };

  const handleResolveIncident = async (e) => {
    e.preventDefault();
    if (!selectedIncident || !resolutionNotes) return;
    try {
      const updated = await api.resolveIncident(
        selectedIncident.id,
        resolutionNotes,
        mitigationText || "Containment executed."
      );
      setSelectedIncident(updated);
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setResolutionNotes("");
      setMitigationText("");
      setActionMessage("Incident successfully marked as RESOLVED!");
      setTimeout(() => setActionMessage(""), 4000);
    } catch (err) {
      alert(err.message || "Failed to resolve incident");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-400" /> Incident Response & Threat Containment
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Security incident triage, analyst delegation, account containment, and resolution tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="CONTAINED">CONTAINED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <button
            onClick={fetchIncidents}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Grid: Incidents List & Incident Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incidents List (Left 5 Cols) */}
        <div className="lg:col-span-5 rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
          <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>INCIDENT TICKETS ({incidents.length})</span>
            <span>TRIAGE QUEUE</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[650px] overflow-y-auto">
            {incidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No incidents match current filter.
              </div>
            ) : (
              incidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3.5 hover:bg-slate-800/50 cursor-pointer transition ${
                      isSelected
                        ? "bg-cyan-950/40 border-l-4 border-cyan-400"
                        : inc.status === "OPEN"
                        ? "bg-red-950/10"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">#{inc.id}</span>
                        <SeverityBadge severity={inc.severity} />
                      </div>
                      <StatusBadge status={inc.status} />
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {inc.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2">
                      <span>Target: <strong className="text-slate-300">{inc.target_user || "N/A"}</strong></span>
                      <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Incident Investigation Workspace (Right 7 Cols) */}
        <div className="lg:col-span-7 rounded-xl bg-slate-900/90 border border-slate-800 p-6 space-y-6">
          {!selectedIncident ? (
            <div className="py-24 text-center text-slate-500 text-xs font-mono">
              Select an incident from the queue to start investigation and containment.
            </div>
          ) : (
            <>
              {/* Workspace Header */}
              <div className="border-b border-slate-800 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 font-bold">
                      INCIDENT #{selectedIncident.id}
                    </span>
                    <SeverityBadge severity={selectedIncident.severity} />
                    <StatusBadge status={selectedIncident.status} />
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    Created: {new Date(selectedIncident.created_at).toLocaleString()}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white">
                  {selectedIncident.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedIncident.description}
                </p>
              </div>

              {/* Target & Forensics Info Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">TARGET ACCOUNT</span>
                  <span className="text-cyan-300 font-bold">{selectedIncident.target_user || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SOURCE ATTACKER IP</span>
                  <span className="text-red-300 font-bold">{selectedIncident.source_ip || "Internal / Unknown"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ASSIGNED ANALYST</span>
                  <span className="text-slate-200">{selectedIncident.assigned_to_name || "Unassigned"}</span>
                </div>
              </div>

              {/* Mitigation & Containment Action Bar */}
              <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-cyan-400" /> Automated Response & Containment
                </h4>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Automated Suspend Target */}
                  {selectedIncident.target_user && selectedIncident.status !== "RESOLVED" && (
                    <button
                      onClick={handleSuspendTarget}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-200 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-red-400" /> Temporary Account Suspension (60m)
                    </button>
                  )}

                  {/* Assign Analyst Control */}
                  <div className="flex items-center gap-2">
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono focus:border-cyan-500"
                    >
                      <option value="">Select SOC Analyst...</option>
                      <option value="1">Chief Security Officer (admin)</option>
                      <option value="2">Jane Chen (analyst_jane)</option>
                    </select>
                    <button
                      disabled={!assigneeId}
                      onClick={handleAssignAnalyst}
                      className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-bold rounded transition"
                    >
                      Assign
                    </button>
                  </div>
                </div>

                {/* Audit Mitigation Actions Trail */}
                {selectedIncident.mitigation_actions && (
                  <div className="mt-2 p-2.5 rounded bg-black/40 border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                    <strong className="text-cyan-400 block mb-1">Containment & Audit Actions:</strong>
                    {selectedIncident.mitigation_actions}
                  </div>
                )}
              </div>

              {/* Resolution Section */}
              {selectedIncident.status === "RESOLVED" ? (
                <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/80 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Incident Resolved & Closed
                  </div>
                  <div className="text-slate-300">
                    <strong>Resolver:</strong> {selectedIncident.resolved_by_name || "SOC Analyst"} on{" "}
                    {new Date(selectedIncident.resolved_at).toLocaleString()}
                  </div>
                  <div className="text-slate-300 mt-2">
                    <strong>Resolution Notes:</strong> {selectedIncident.resolution_notes}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResolveIncident} className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" /> Resolution & Incident Close-out
                  </h4>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Resolution Notes / Root Cause Findings:
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Detail investigation conclusions, adversary IP blocked, user password rotated, etc."
                      className="w-full p-2 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-lg shadow-emerald-950/50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Finalize & Resolve Incident
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
