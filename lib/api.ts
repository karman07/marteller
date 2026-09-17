import { request } from "./http";

export { getToken, setToken, clearToken } from "./http";

export type UserRole = "customer" | "sales" | "admin";

export type AppUser = {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  name: string | null;
  role: UserRole;
};

export function syncSession(idToken: string) {
  return request<{ token: string; user: AppUser }>("/auth/sync", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export function fetchMe() {
  return request<AppUser>("/auth/me");
}

// Dev-only bootstrap for the first admin account — see backend
// AuthController.devSetRole. Disabled outside dev.
export function devSetRole(role: UserRole) {
  return request<AppUser>("/auth/dev-set-role", {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
