const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("API error:", response.status, data);

    throw new Error(
      data?.detail ||
        data?.non_field_errors?.join(" ") ||
        JSON.stringify(data) ||
        "Something went wrong."
    );
  }

  return data;
}

export function getCollections() {
  return request("/collections/");
}

export function getRegions() {
  return request("/regions/");
}

export function getSubRegions() {
  return request("/subregions/");
}

export function getMountains(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/mountains/${query ? `?${query}` : ""}`);
}

export function getMountain(slug) {
  return request(`/mountains/${slug}/`);
}

export function getCurrentUser() {
  return request("/auth/me/");
}

export async function getCsrfToken() {
  const data = await request("/auth/csrf/");
  return data.csrfToken;
}

export async function getProgressLogs() {
  return request("/progress/logs/");
}

export async function createProgressLog(payload) {
  const csrfToken = await getCsrfToken();
  return request("/progress/logs/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function updateProgressLog(logId, payload) {
  const csrfToken = await getCsrfToken();
  return request(`/progress/logs/${logId}/`, {
    method: "PATCH",
    headers: { "X-CSRFToken": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function deleteProgressLog(logId) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${API_BASE}/progress/logs/${logId}/`, {
    method: "DELETE",
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || JSON.stringify(data) || "Delete failed.");
  }
  return true;
}

export async function registerUser(payload) {
  const csrfToken = await getCsrfToken();
  return request("/auth/register/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  const csrfToken = await getCsrfToken();
  return request("/auth/login/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function logoutUser() {
  const csrfToken = await getCsrfToken();
  return request("/auth/logout/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
  });
}

export async function updateProgressLogWithImage(logId, formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${API_BASE}/progress/logs/${logId}/`, {
    method: "PATCH",
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken },
    body: formData,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || JSON.stringify(data) || "Upload failed.");
  }
  return data;
}

export async function updateUserProfile(formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${API_BASE}/auth/profile/`, {
    method: "PATCH",
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken },
    body: formData,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || JSON.stringify(data) || "Update failed.");
  }
  return data;
}

// export addition

export async function exportLogs(format = "csv") {
  const url = `${API_BASE}/progress/export/?format=${format}`;
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Accept": format === "gpx" ? "application/gpx+xml" : "text/csv",
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "Export failed.");
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = format === "gpx" ? "summitlog-completed.gpx" : "summitlog-completed.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}