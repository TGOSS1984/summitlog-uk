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

// ── Route logging ────────────────────────────────────────────────────────────

/**
 * Search mountains by name — used in the route builder to add peaks.
 * Returns up to 20 matches.
 */
export function searchMountains(query) {
  if (!query || query.trim().length < 2) return Promise.resolve([]);
  return getMountains({ search: query.trim(), page_size: 20 });
}

/**
 * Create a multi-mountain route log.
 * The backend creates one RouteLog + one UserMountainLog per mountain.
 *
 * @param {Object} payload
 * @param {string}   payload.name              - Route name e.g. "Fairfield Horseshoe"
 * @param {string}   payload.description       - Optional notes
 * @param {string}   payload.completed_date    - ISO date string "YYYY-MM-DD"
 * @param {string}   payload.season            - "summer" | "winter" | "spring" | "autumn"
 * @param {number[]} payload.mountain_ids      - Ordered list of mountain IDs
 * @param {number}   payload.primary_mountain_id - Mountain ID that carries cumulative stats
 * @param {string}   payload.route_taken       - Route description
 * @param {number}   payload.hike_distance_km  - Total route distance
 * @param {number}   payload.hike_duration_hours
 * @param {number}   payload.steps
 * @param {number}   payload.flights_climbed
 * @param {string}   payload.notes
 */
export async function createRouteLog(payload) {
  const csrfToken = await getCsrfToken();
  return request("/progress/routes/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body: JSON.stringify(payload),
  });
}

/**
 * Get all route logs for the authenticated user.
 */
export function getRouteLogs() {
  return request("/progress/routes/list/");
}