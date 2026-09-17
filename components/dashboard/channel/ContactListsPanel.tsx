"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Folder, ListChecks, Search, Square, X } from "lucide-react";
import { Contact, listContacts } from "@/lib/contacts";
import { Channel } from "@/lib/channels";

export function ContactListsPanel({
  channel,
  selectedIds,
  onToggleContact,
  onSelectList,
}: {
  channel: Channel;
  selectedIds: Set<string>;
  onToggleContact: (contact: Contact) => void;
  onSelectList: (contacts: Contact[]) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const field = channel === "email" ? "email" : "phone";

  useEffect(() => {
    listContacts(1, 500)
      .then((res) => setContacts(res.items.filter((c) => c[field])))
      .catch(() => {});
  }, [field]);

  const lists = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of contacts) {
      const key = c.list || "Uncategorized";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([list, count]) => ({ list, count }));
  }, [contacts]);

  function contactsInList(list: string) {
    return contacts.filter((c) => (list === "Uncategorized" ? !c.list : c.list === list));
  }

  const visibleContacts = useMemo(() => {
    let items = activeList ? contactsInList(activeList) : contacts;
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q),
      );
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, activeList, search]);

  if (contacts.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Contact lists</h2>
          <p className="text-xs text-ink-muted">
            {selectedIds.size} selected · {contacts.length} contact{contacts.length === 1 ? "" : "s"} total
          </p>
        </div>
        <button
          onClick={() => onSelectList(visibleContacts)}
          disabled={visibleContacts.length === 0}
          className="flex items-center gap-1.5 rounded-full border border-accent bg-accent-soft/30 px-3.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ListChecks size={12} />
          Select all{activeList ? ` in ${activeList}` : ""} ({visibleContacts.length})
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-cream-secondary/40 px-5 py-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveList(null)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              activeList === null ? "border-accent bg-accent-soft/40 text-accent" : "border-line bg-cream text-ink-soft hover:border-accent/50"
            }`}
          >
            All · {contacts.length}
          </button>
          {lists.map((l) => (
            <div
              key={l.list}
              className={`flex items-center overflow-hidden rounded-full border text-xs font-medium transition-colors ${
                activeList === l.list ? "border-accent bg-accent-soft/40 text-accent" : "border-line bg-cream text-ink-soft hover:border-accent/50"
              }`}
            >
              <button onClick={() => setActiveList(l.list)} className="flex items-center gap-1 py-1 pl-2.5 pr-1.5">
                <Folder size={11} />
                {l.list} · {l.count}
              </button>
              <button
                onClick={() => onSelectList(contactsInList(l.list))}
                title={`Select everyone in ${l.list}`}
                aria-label={`Select everyone in ${l.list}`}
                className="border-l border-current/20 px-1.5 py-1 text-current hover:bg-accent-soft/50"
              >
                <ListChecks size={11} />
              </button>
            </div>
          ))}
        </div>

        <div className="ml-auto flex w-full min-w-[220px] items-center gap-2 rounded-xl border border-line bg-cream px-3 sm:w-72">
          <Search size={13} className="shrink-0 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email…"
            className="h-9 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          {search && (
            <button onClick={() => setSearch("")} className="shrink-0 text-ink-muted hover:text-accent" aria-label="Clear search">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[28rem] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr className="border-b border-line text-xs text-ink-muted">
              <th className="w-10 px-5 py-2.5" />
              <th className="px-3 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">{field === "email" ? "Email" : "Phone"}</th>
              <th className="px-3 py-2.5 font-medium">List</th>
            </tr>
          </thead>
          <tbody>
            {visibleContacts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-xs text-ink-muted">
                  No contacts match.
                </td>
              </tr>
            ) : (
              visibleContacts.map((c) => {
                const checked = selectedIds.has(c._id);
                return (
                  <tr
                    key={c._id}
                    onClick={() => onToggleContact(c)}
                    className={`cursor-pointer border-b border-line/50 last:border-0 transition-colors hover:bg-cream-secondary ${
                      checked ? "bg-accent-soft/20" : ""
                    }`}
                  >
                    <td className="py-2.5 pl-5">
                      {checked ? (
                        <CheckSquare size={14} className="text-accent" />
                      ) : (
                        <Square size={14} className="text-ink-muted" />
                      )}
                    </td>
                    <td className="py-2.5 pr-2 font-medium text-ink">{c.name}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{c[field]}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{c.list ?? "Uncategorized"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
