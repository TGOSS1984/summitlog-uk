const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// Extracts a human-readable message from a Django REST Framework error
// response, handling every shape DRF can return:
//   { detail: "..." }                    → top-level error string
//   { non_field_errors: ["..."] }        → non-field validation errors
//   { username: ["..."], email: [...] }  → field-level validation errors
//   null / empty body                    → generic fallback
function extractErrorMessage(data) {
  if (!data) return "Something went wrong. Please try again.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.non_field_errors?.length) return data.non_field_errors.join(" ");

  // Field-level validation errors — collect all and join with a space
  const fieldMessages = Object.entries(data)
    .filter(([, v]) => Array.isArray(v))
    .map(([field, msgs]) => {
      const label = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ");
      return `${label}: ${msgs.join(", ")}`;
    });
  if (fieldMessages.length) return fieldMessages.join(" ");

  return "Something went wrong. Please try again.";
}

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
    throw new Error(extractErrorMessage(data));
  }

  return data;
}

export function getCollections() { return request("/collections/"); }
export function getRegions() { return request("/regions/"); }
export function getSubRegions() { return request("/subregions/"); }

export function getMountains(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/mountains/${query ? `?${query}` : ""}`);
}

export function getMountain(slug) { return request(`/mountains/${slug}/`); }
export function getCurrentUser() { return request("/auth/me/"); }

export async function getCsrfToken() {
  const data = await request("/auth/csrf/");
  return data.csrfToken;
}

export async function getProgressLogs() { return request("/progress/logs/"); }

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
  if (!response.ok) throw new Error(data?.detail || JSON.stringify(data) || "Upload failed.");
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
  if (!response.ok) throw new Error(data?.detail || JSON.stringify(data) || "Update failed.");
  return data;
}

export async function getShareSettings() {
  return request("/auth/share-settings/");
}

export async function updateShareSettings(payload) {
  const csrfToken = await getCsrfToken();
  return request("/auth/share-settings/", {
    method: "PATCH",
    headers: { "X-CSRFToken": csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function exportLogs(format = "csv") {
  const url = `${API_BASE}/progress/export/?format=${format}`;
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Accept": format === "gpx" ? "application/gpx+xml" : "text/csv" },
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

export function searchMountains(query) {
  if (!query || query.trim().length < 2) return Promise.resolve([]);
  return getMountains({ search: query.trim(), page_size: 20 });
}

export async function createRouteLog(payload) {
  const csrfToken = await getCsrfToken();
  return request("/progress/routes/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body: JSON.stringify(payload),
  });
}

export function getRouteLogs(status = null) {
  const url = status
    ? `/progress/routes/list/?status=${status}`
    : "/progress/routes/list/";
  return request(url);
}

/** Fetch a single route log by ID (for edit form). */
export function getRouteLog(id) {
  return request(`/progress/routes/${id}/`);
}

/**
 * Update route metadata + primary summit stats.
 * Does NOT change the mountain list.
 */
export async function updateRouteLog(id, payload) {
  const csrfToken = await getCsrfToken();
  return request(`/progress/routes/${id}/`, {
    method: "PATCH",
    headers: { "X-CSRFToken": csrfToken },
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a route and all its linked mountain logs.
 */
export async function deleteRouteLog(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${API_BASE}/progress/routes/${id}/`, {
    method: "DELETE",
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "Delete failed.");
  }
  return response.json().catch(() => ({ detail: "Deleted." }));
}

// ── Collection notes ─────────────────────────────────────────────────────────

export function getCollectionNote(collectionId) {
  return request(`/progress/collection-notes/?collection=${collectionId}`);
}

export async function saveCollectionNote(collectionId, collectionSlug, body) {
  const csrfToken = await getCsrfToken();
  return request("/progress/collection-notes/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body: JSON.stringify({
      collection_id_ref: collectionId,
      collection_slug:   collectionSlug,
      body,
    }),
  });
}

export async function deleteCollectionNote(noteId) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${API_BASE}/progress/collection-notes/${noteId}/`, {
    method: "DELETE",
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "Delete failed.");
  }
  return true;
}

export async function getNotificationPreferences() {
  return request("/progress/notifications/");
}

export async function updateNotificationPreferences(payload) {
  const csrfToken = await getCsrfToken();
  return request("/progress/notifications/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    body: JSON.stringify(payload),
  });
}