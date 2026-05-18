const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

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
    headers: {
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(payload),
  });
}

export async function updateProgressLog(logId, payload) {
  const csrfToken = await getCsrfToken();

  return request(`/progress/logs/${logId}/`, {
    method: "PATCH",
    headers: {
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(payload),
  });
}