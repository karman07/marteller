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
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
