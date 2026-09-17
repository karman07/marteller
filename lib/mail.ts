import { request, Paginated } from "./http";

export type MailDomainStatus = "pending" | "verified" | "failed";

export type MailDomain = {
  _id: string;
  domain: string;
  status: MailDomainStatus;
  dkimSelector: string;
  defaultFromLocalPart: string;
  isDefault: boolean;
  verifiedAt?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DnsRecord = { type: string; host: string; value: string; note?: string };

export type DomainDnsRecords = {
  verification: DnsRecord;
  dkim: DnsRecord;
  spf: DnsRecord;
  dmarc: DnsRecord;
};

export type MailCredentialStatus = "active" | "revoked";

export type MailCredential = {
  _id: string;
  label: string;
  username: string;
  domainId?: string;
  status: MailCredentialStatus;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
};

// The one time the raw password comes back — never retrievable again after
// this response, same convention as ApiKeysService.create.
export type CreatedMailCredential = {
  id: string;
  label: string;
  username: string;
  password: string;
  host: string;
  port: number;
  createdAt: string;
};

export type EmailMessageStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "bounced"
  | "failed"
  | "suppressed";

export type EmailMessage = {
  _id: string;
  messageId: string;
  domain: string;
  from: string;
  to: string[];
  subject: string;
  status: EmailMessageStatus;
  attempts: number;
  lastError?: string;
  costPaise: number;
  sentAt?: string;
  createdAt: string;
};

export type EmailEvent = {
  _id: string;
  type: string;
  bounceType?: string;
  diagnosticCode?: string;
  createdAt: string;
};

export type SuppressionReason = "hard_bounce" | "complaint" | "manual";

export type SuppressionEntry = {
  _id: string;
  email: string;
  reason: SuppressionReason;
  source?: string;
  createdAt: string;
};

// Domains

export function listMailDomains() {
  return request<MailDomain[]>("/mail/domains");
}

export function createMailDomain(domain: string) {
  return request<MailDomain>("/mail/domains", { method: "POST", body: JSON.stringify({ domain }) });
}

export function fetchDomainDns(id: string) {
  return request<DomainDnsRecords>(`/mail/domains/${id}/dns`);
}

export function verifyMailDomain(id: string) {
  return request<MailDomain>(`/mail/domains/${id}/verify`, { method: "POST" });
}

export function setDefaultMailDomain(id: string) {
  return request<MailDomain>(`/mail/domains/${id}/default`, { method: "POST" });
}

export function deleteMailDomain(id: string) {
  return request<{ deleted: boolean }>(`/mail/domains/${id}`, { method: "DELETE" });
}

// SMTP credentials

export function listMailCredentials() {
  return request<MailCredential[]>("/mail/credentials");
}

export function createMailCredential(label: string, domainId?: string) {
  return request<CreatedMailCredential>("/mail/credentials", {
    method: "POST",
    body: JSON.stringify({ label, domainId }),
  });
}

export function revokeMailCredential(id: string) {
  return request<{ revoked: boolean }>(`/mail/credentials/${id}`, { method: "DELETE" });
}

// Sending & message log

export function sendMail(payload: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
}) {
  return request<EmailMessage>("/mail/send", { method: "POST", body: JSON.stringify(payload) });
}

export function listMailMessages(page = 1, limit = 20) {
  return request<Paginated<EmailMessage>>(`/mail/messages?page=${page}&limit=${limit}`);
}

export function fetchMailMessage(id: string) {
  return request<{ message: EmailMessage; events: EmailEvent[] }>(`/mail/messages/${id}`);
}

// Suppression list

export function listSuppressions() {
  return request<SuppressionEntry[]>("/mail/suppressions");
}

export function addSuppression(email: string) {
  return request<SuppressionEntry>("/mail/suppressions", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function removeSuppression(id: string) {
  return request<{ deleted: boolean }>(`/mail/suppressions/${id}`, { method: "DELETE" });
}
