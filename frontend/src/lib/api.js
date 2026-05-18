const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || "Something went wrong.");
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