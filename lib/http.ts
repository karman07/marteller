export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5010";
const TOKEN_KEY = "marteller-admin-token";

export function assetUrl(path: string) {
  return path.startsWith("http") ? path : `${BACKEND_URL}${path}`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function parseErrorBody(res: Response) {
  const body = await res.json().catch(() => ({}));
  const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
  return message ?? `Request failed with ${res.status}`;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) throw new Error(await parseErrorBody(res));
  // A 200 with an empty body happens whenever a handler returns `null`
  // (Nest sends no body rather than the literal text "null") — treat that
  // the same as 204, not as JSON to parse, or this throws on every route
  // that can legitimately return null (e.g. "no config set for this user").
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// For multipart/form-data uploads — no Content-Type header (the browser sets
// the multipart boundary itself).
export async function requestForm<T>(path: string, formData: FormData, method = "POST"): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) throw new Error(await parseErrorBody(res));
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// A plain `<a href>` navigation never sends the Authorization header (the
// JWT lives in localStorage, not a cookie), so every protected download
// route just 401s on click. Opens a blank tab synchronously (so it isn't
// blocked as a popup — browsers only allow window.open() without a popup
// warning within the same tick as the click, not after an await), then
// fetches the file WITH auth and redirects that tab to the resulting blob.
export async function openAuthedFile(url: string) {
  const win = window.open("", "_blank");
  try {
    const token = getToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error(await parseErrorBody(res));
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    if (win) {
      win.location.href = objectUrl;
    } else {
      window.open(objectUrl, "_blank");
    }
  } catch (err) {
    win?.close();
    throw err;
  }
}
