import { request, Paginated } from "./http";

export type Contact = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  list?: string;
};

export type ContactListSummary = { list: string; count: number };

export function listContacts(page = 1, limit = 20, list?: string, search?: string) {
  const listParam = list ? `&list=${encodeURIComponent(list)}` : "";
  const searchParam = search?.trim() ? `&search=${encodeURIComponent(search.trim())}` : "";
  return request<Paginated<Contact>>(`/contacts?page=${page}&limit=${limit}${listParam}${searchParam}`);
}

export function listContactLists() {
  return request<ContactListSummary[]>("/contacts/lists");
}

export function createContactList(name: string) {
  return request<{ name: string }>("/contacts/lists", { method: "POST", body: JSON.stringify({ name }) });
}

export function createContact(payload: { name: string; phone?: string; email?: string; notes?: string; list?: string }) {
  return request<Contact>("/contacts", { method: "POST", body: JSON.stringify(payload) });
}

export function updateContact(
  id: string,
  payload: { name?: string; phone?: string; email?: string; notes?: string; list?: string | null },
) {
  return request<Contact>(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function bulkCreateContacts(
  contacts: { name: string; phone?: string; email?: string; notes?: string }[],
  list?: string,
) {
  return request<{ created: number; skipped: number }>("/contacts/bulk", {
    method: "POST",
    body: JSON.stringify({ contacts, list }),
  });
}

export function deleteContact(id: string) {
  return request<{ deleted: boolean }>(`/contacts/${id}`, { method: "DELETE" });
}

export type ParsedContactRow = { name: string; phone?: string; email?: string; notes?: string };

// Handles both real CSV file content and text pasted straight out of Excel/
// Google Sheets (which comes through tab-separated when pasted into a plain
// textarea) — no binary .xlsx parsing dependency needed for either case.
export function parseContactsText(text: string): ParsedContactRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const splitLine = (line: string) => line.split(delimiter).map((cell) => cell.trim());

  let rows = lines.map(splitLine);
  const firstCell = rows[0][0]?.toLowerCase();
  if (firstCell === "name") rows = rows.slice(1); // drop header row

  return rows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => ({
      name: cells[0] ?? "",
      phone: cells[1] || undefined,
      email: cells[2] || undefined,
      notes: cells[3] || undefined,
    }));
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
