const API_BASE = "http://127.0.0.1:8000/api/v1";

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem("access_token");
    this.refreshToken = localStorage.getItem("refresh_token");
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (access) localStorage.setItem("access_token", access);
    else localStorage.removeItem("access_token");
    if (refresh) localStorage.setItem("refresh_token", refresh);
    else localStorage.removeItem("refresh_token");
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token refresh on 401 Unauthorized
    if (response.status === 401 && this.refreshToken && !endpoint.includes("/auth/")) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          this.setTokens(refreshData.access_token, refreshData.refresh_token);
          // Retry original request with new token
          headers["Authorization"] = `Bearer ${this.accessToken}`;
          response = await fetch(url, { ...options, headers });
        } else {
          this.clearTokens();
          window.location.href = "/";
        }
      } catch (err) {
        this.clearTokens();
        window.location.href = "/";
      }
    }

    if (!response.ok) {
      let errorDetail = "An error occurred";
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || JSON.stringify(errJson);
      } catch (e) {
        errorDetail = response.statusText;
      }
      const error = new Error(errorDetail);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  // Auth APIs
  async login(username, password) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    localStorage.setItem("current_user", JSON.stringify(data.user));
    return data;
  }

  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      this.clearTokens();
    }
  }

  async getMe() {
    return this.request("/auth/me");
  }

  async getSessions() {
    return this.request("/auth/sessions");
  }

  async revokeSession(sessionId) {
    return this.request(`/auth/sessions/${sessionId}`, { method: "DELETE" });
  }

  // User Management
  async getUsers(skip = 0, limit = 100) {
    return this.request(`/users/?skip=${skip}&limit=${limit}`);
  }

  async createUser(userData) {
    return this.request("/users/", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async lockUser(userId, reason = "Administrative security hold") {
    return this.request(`/users/${userId}/lock?reason=${encodeURIComponent(reason)}`, {
      method: "POST",
    });
  }

  async unlockUser(userId) {
    return this.request(`/users/${userId}/unlock`, {
      method: "POST",
    });
  }

  // Employee Portal
  async getEmployeeProfile() {
    return this.request("/employees/profile");
  }

  async getDirectory() {
    return this.request("/employees/directory");
  }

  async submitAccessRequest(requestData) {
    return this.request("/employees/access-request", {
      method: "POST",
      body: JSON.stringify(requestData),
    });
  }

  async getMyActivity(limit = 20) {
    return this.request(`/employees/my-activity?limit=${limit}`);
  }

  // Security Events & SOC Telemetry
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.event_type) query.append("event_type", params.event_type);
    if (params.username) query.append("username", params.username);
    if (params.ip_address) query.append("ip_address", params.ip_address);
    if (params.skip !== undefined) query.append("skip", params.skip);
    if (params.limit !== undefined) query.append("limit", params.limit || 50);

    return this.request(`/security-events/?${query.toString()}`);
  }

  async getDashboardStats() {
    return this.request("/security-events/stats");
  }

  // Threat Alerts
  async getAlerts(params = {}) {
    const query = new URLSearchParams();
    if (params.severity) query.append("severity", params.severity);
    if (params.target_username) query.append("target_username", params.target_username);
    if (params.is_acknowledged !== undefined) query.append("is_acknowledged", params.is_acknowledged);
    if (params.skip !== undefined) query.append("skip", params.skip);
    if (params.limit !== undefined) query.append("limit", params.limit || 50);

    return this.request(`/alerts/?${query.toString()}`);
  }

  async acknowledgeAlert(alertId, acknowledged = true) {
    return this.request(`/alerts/${alertId}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ is_acknowledged: acknowledged }),
    });
  }

  // Incident Response
  async getIncidents(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append("status", params.status);
    if (params.severity) query.append("severity", params.severity);
    if (params.skip !== undefined) query.append("skip", params.skip);
    if (params.limit !== undefined) query.append("limit", params.limit || 50);

    return this.request(`/incidents/?${query.toString()}`);
  }

  async getIncident(id) {
    return this.request(`/incidents/${id}`);
  }

  async createIncident(incidentData) {
    return this.request("/incidents/", {
      method: "POST",
      body: JSON.stringify(incidentData),
    });
  }

  async updateIncident(id, updateData) {
    return this.request(`/incidents/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  async assignIncident(incidentId, analystId) {
    return this.request(`/incidents/${incidentId}/assign`, {
      method: "POST",
      body: JSON.stringify({ assigned_to_id: analystId }),
    });
  }

  async resolveIncident(incidentId, resolutionNotes, mitigationActions) {
    return this.request(`/incidents/${incidentId}/resolve`, {
      method: "POST",
      body: JSON.stringify({
        resolution_notes: resolutionNotes,
        mitigation_actions: mitigationActions,
      }),
    });
  }

  async suspendTargetUser(incidentId, durationMinutes = 60) {
    return this.request(`/incidents/${incidentId}/suspend-target?duration_minutes=${durationMinutes}`, {
      method: "POST",
    });
  }

  // Attack Simulator
  async seedDemo() {
    return this.request("/simulator/seed", { method: "POST" });
  }

  async triggerBruteForce(targetUsername = "john_doe", attempts = 6) {
    return this.request(`/simulator/attack/brute-force?target_username=${encodeURIComponent(targetUsername)}&attempts=${attempts}`, {
      method: "POST",
    });
  }

  async triggerImpossibleTravel(username = "sarah_connor") {
    return this.request(`/simulator/attack/impossible-travel?username=${encodeURIComponent(username)}`, {
      method: "POST",
    });
  }

  async triggerPrivilegeEscalation(username = "john_doe") {
    return this.request(`/simulator/attack/privilege-escalation?username=${encodeURIComponent(username)}`, {
      method: "POST",
    });
  }

  async triggerBenignTraffic() {
    return this.request("/simulator/traffic/benign", { method: "POST" });
  }
}

export const api = new ApiClient();
export default api;
