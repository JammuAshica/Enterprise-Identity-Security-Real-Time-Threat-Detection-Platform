import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Lock,
  Unlock,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export const UserManagement = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionNotice, setActionNotice] = useState("");

  // New user form state
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    full_name: "",
    department: "Engineering",
    role: "employee",
    password: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUnlock = async (userId, username) => {
    try {
      await api.unlockUser(userId);
      setActionNotice(`User '${username}' unlocked successfully! Failed attempts reset to 0.`);
      fetchUsers();
      setTimeout(() => setActionNotice(""), 4000);
    } catch (err) {
      alert(err.message || "Failed to unlock user");
    }
  };

  const handleLock = async (userId, username) => {
    const reason = prompt(`Enter reason for manual suspension of '${username}':`, "Suspected credential compromise");
    if (!reason) return;

    try {
      await api.lockUser(userId, reason);
      setActionNotice(`User '${username}' suspended and all active sessions revoked.`);
      fetchUsers();
      setTimeout(() => setActionNotice(""), 4000);
    } catch (err) {
      alert(err.message || "Failed to suspend user");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setShowAddModal(false);
      setNewUser({
        username: "",
        email: "",
        full_name: "",
        department: "Engineering",
        role: "employee",
        password: "",
      });
      setActionNotice("New user provisioned successfully!");
      fetchUsers();
      setTimeout(() => setActionNotice(""), 4000);
    } catch (err) {
      alert(err.message || "Failed to provision user");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" /> Identity & Access Management (IAM)
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Role-Based Access Control, credential lifecycle, account lockouts, and session invalidation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-cyan-950/40 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Provision User
            </button>
          )}

          <button
            onClick={fetchUsers}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Users Directory Table */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Role (RBAC)</th>
                <th className="py-3 px-4">Failed Logins</th>
                <th className="py-3 px-4">Lockout Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => {
                const isLocked = u.is_locked;

                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-800/40 transition ${
                      isLocked ? "bg-red-950/20" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">{u.full_name}</div>
                      <div className="text-[11px] text-cyan-400">@{u.username} • {u.email}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {u.department}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === "admin"
                            ? "bg-purple-950 text-purple-300 border border-purple-800"
                            : u.role === "security_analyst"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {u.role.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`font-mono font-bold ${
                          u.failed_login_attempts > 0 ? "text-amber-400" : "text-slate-400"
                        }`}
                      >
                        {u.failed_login_attempts} / 5
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800 animate-pulse">
                          <Lock className="w-3 h-3" /> SUSPENDED / LOCKED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString()
                        : "Never logged in"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {isLocked ? (
                          <button
                            onClick={() => handleUnlock(u.id, u.username)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 text-[11px] font-bold rounded border border-emerald-600 transition"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Unlock Account
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLock(u.id, u.username)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 text-[11px] font-bold rounded border border-red-800 transition"
                          >
                            <Lock className="w-3.5 h-3.5" /> Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" /> Provision Enterprise User Account
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="e.g. robert.langdon"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="e.g. Robert Langdon"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="robert@enterprise.sec"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  placeholder="Engineering, SOC, Finance"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Role (RBAC Policy)</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="employee">Employee (Standard Access)</option>
                  <option value="security_analyst">Security Analyst (SOC Triage)</option>
                  <option value="admin">Administrator (Full RBAC IAM)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Initial Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded transition"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
