import { request, requestForm } from "./http";

export { getToken, setToken, clearToken, assetUrl } from "./http";

export type AccountType = "individual" | "business";
export type CompanySize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";
export type Interest = "whatsapp" | "email" | "sms" | "otp";

export const COMPANY_SIZES: CompanySize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
export const INTERESTS: { value: Interest; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "otp", label: "OTP / Verification" },
];

export type AppUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  name: string | null;
  photoUrl: string | null;
  accountType: AccountType | null;
  companyName: string | null;
  companySize: CompanySize | null;
  interests: Interest[];
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  countryIso2: string | null;
  countryDialCode: string | null;
  onboarded: boolean;
};

// Called after email/password or Google sign-in, and again after linking a
// phone number, to find-or-create the backend user and issue our session JWT.
export function syncSession(idToken: string) {
  return request<{ token: string; user: AppUser }>("/auth/sync", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export function devLinkPhone(phoneNumber: string, code: string) {
  return request<AppUser>("/auth/dev-link-phone", {
    method: "PATCH",
    body: JSON.stringify({ phoneNumber, code }),
  });
}

export function completeProfile(payload: {
  name: string;
  accountType?: AccountType;
  companyName?: string;
  companySize?: CompanySize;
  interests?: Interest[];
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryIso2?: string;
  countryDialCode?: string;
}) {
  return request<AppUser>("/auth/complete-profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadProfilePhoto(file: File) {
  const formData = new FormData();
  formData.append("photo", file);
  return requestForm<{ url: string }>("/auth/upload-photo", formData);
}

export function updatePhoto(photoUrl: string) {
  return request<AppUser>("/auth/photo", { method: "PATCH", body: JSON.stringify({ photoUrl }) });
}

export function skipOnboarding() {
  return request<AppUser>("/auth/skip-onboarding", { method: "PATCH" });
}

export function fetchMe() {
  return request<AppUser>("/auth/me");
}
