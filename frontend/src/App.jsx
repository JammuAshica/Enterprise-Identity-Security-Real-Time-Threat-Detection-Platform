import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { LiveEvents } from "./pages/LiveEvents";
import { Incidents } from "./pages/Incidents";
import { UserManagement } from "./pages/UserManagement";
import { AuditLogs } from "./pages/AuditLogs";
import { EmployeePortal } from "./pages/EmployeePortal";

const AppContent = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-cyan-400 font-mono text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>INITIALIZING SOC THREAT PLATFORM...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleRefreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      <Navbar onRefreshData={handleRefreshData} />

      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-y-auto">
          {activeTab === "dashboard" && <Dashboard onSelectTab={setActiveTab} key={refreshTrigger} />}
          {activeTab === "live-events" && <LiveEvents key={refreshTrigger} />}
          {activeTab === "incidents" && <Incidents key={refreshTrigger} />}
          {activeTab === "users" && <UserManagement key={refreshTrigger} />}
          {activeTab === "audit-logs" && <AuditLogs key={refreshTrigger} />}
          {activeTab === "employee-portal" && <EmployeePortal key={refreshTrigger} />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
