const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.peoplewelike.club";

export { API_BASE };

export async function apiFetch(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("pwl_token") : null;
  const guestToken = typeof window !== "undefined" ? localStorage.getItem("pwl_guest_token") : null;
  const authToken = options.token || token || guestToken;

  const headers = { "Content-Type": "application/json", ...options.headers };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
