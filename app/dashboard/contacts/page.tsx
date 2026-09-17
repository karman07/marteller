"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GripVertical, Pencil, Plus, Search, Trash2, Upload, Users, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Pagination } from "@/components/dashboard/Pagination";
import { BulkImportContactsDialog } from "@/components/dashboard/BulkImportContactsDialog";
import { ContactFolderBar } from "@/components/dashboard/ContactFolderBar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Contact,
  ContactListSummary,
  createContact,
  createContactList,
  deleteContact,
  listContactLists,
  listContacts,
  updateContact,
} from "@/lib/contacts";

const PAGE_SIZE = 15;

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<{ items: Contact[]; total: number; page: number }>({
    items: [],
    total: 0,
    page: 1,
  });
  const [open, setOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [newContactList, setNewContactList] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lists, setLists] = useState<ContactListSummary[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const isFirstRender = useRef(true);

  function load(page: number, list = activeList, searchTerm = search) {
    listContacts(page, PAGE_SIZE, list ?? undefined, searchTerm || undefined)
      .then((res) => setContacts({ items: res.items, total: res.total, page: res.page }))
      .catch(() => {});
  }

  function loadLists() {
    listContactLists().then(setLists).catch(() => {});
  }

  useEffect(() => {
    load(1);
    loadLists();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handleFilterList(list: string | null) {
    setActiveList(list);
    load(1, list);
  }

  useEffect(() => {
    if (searchParams.get("new") === "true") setOpen(true);
  }, [searchParams]);

  function resetForm() {
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setNewContactList("");
    setError(null);
  }

  function openAdd() {
    setEditingContact(null);
    resetForm();
    setOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setName(contact.name);
    setPhone(contact.phone ?? "");
    setEmail(contact.email ?? "");
    setNotes(contact.notes ?? "");
    setNewContactList(contact.list ?? "");
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError("Add a phone number or an email address.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (editingContact) {
        await updateContact(editingContact._id, { ...payload, list: newContactList || null });
      } else {
        await createContact({ ...payload, list: newContactList || undefined });
      }
      load(contacts.page);
      loadLists();
      resetForm();
      setEditingContact(null);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save contact.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingContact) return;
    await deleteContact(deletingContact._id);
    load(contacts.page);
    loadLists();
  }

  async function handleCreateList(listName: string) {
    await createContactList(listName);
    loadLists();
  }

  async function handleDropContact(contactId: string, list: string | null) {
    await updateContact(contactId, { list });
    load(contacts.page);
    loadLists();
  }

  return (
    <>
      <PageHeader
        title="Contacts"
        description="People you send WhatsApp, Email, and SMS messages to."
        action={
          <div className="flex gap-2">
            <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-1.5">
              <Upload size={15} /> Import
            </Button>
            <Button onClick={openAdd} className="gap-1.5">
              <Plus size={15} /> Add contact
            </Button>
          </div>
        }
      />

      <div className="px-8 py-6">
        <ContactFolderBar
          lists={lists}
          activeList={activeList}
          onSelect={handleFilterList}
          onCreateList={handleCreateList}
          onDropContact={handleDropContact}
        />
        <p className="mb-3 -mt-2 text-xs text-ink-muted">
          Drag a contact row onto a list above to add it, or pick a list when adding a new contact.
        </p>

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-cream px-3 sm:max-w-sm">
          <Search size={14} className="text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, or notes…"
            className="h-10 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-ink-muted hover:text-accent" aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </div>

        {contacts.items.length === 0 ? (
          search || activeList ? (
            <EmptyState
              icon={Search}
              title="No matching contacts"
              description="Try a different search term, or clear the list filter."
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No contacts yet"
              description="Add contacts one at a time, or import many at once from a CSV file or by pasting rows from Excel."
              action={
                <div className="flex gap-2">
                  <Button onClick={openAdd} variant="primary">
                    Add contact
                  </Button>
                  <Button onClick={() => setImportOpen(true)} variant="outline">
                    Import
                  </Button>
                </div>
              }
            />
          )
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-muted">
                    <th className="w-8 px-4 py-3" />
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">List</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {contacts.items.map((c) => (
                    <tr
                      key={c._id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", c._id)}
                      className="cursor-grab border-b border-line/60 last:border-0 active:cursor-grabbing"
                    >
                      <td className="px-4 py-3 text-ink-muted">
                        <GripVertical size={14} />
                      </td>
                      <td className="px-4 py-3 text-ink">{c.name}</td>
                      <td className="px-4 py-3 text-ink-soft">{c.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">{c.list ?? "Uncategorized"}</td>
                      <td className="max-w-[16rem] truncate px-4 py-3 text-ink-soft">{c.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-ink-muted hover:text-accent"
                            aria-label="Edit contact"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingContact(c)}
                            className="text-ink-muted hover:text-accent"
                            aria-label="Delete contact"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={contacts.page} limit={PAGE_SIZE} total={contacts.total} onPageChange={load} />
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingContact(null);
        }}
        title={editingContact ? "Edit contact" : "Add contact"}
      >
        <div className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-accent">{error}</p>
          )}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (+91…)"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional) — e.g. how you know them, preferences, past orders"
            rows={3}
            className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          <select
            value={newContactList}
            onChange={(e) => setNewContactList(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-cream px-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">No list (Uncategorized)</option>
            {lists
              .filter((l) => l.list !== "Uncategorized")
              .map((l) => (
                <option key={l.list} value={l.list}>
                  {l.list}
                </option>
              ))}
          </select>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving…" : editingContact ? "Save changes" : "Save contact"}
          </Button>
        </div>
      </Modal>

      <BulkImportContactsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          load(1);
          loadLists();
        }}
      />

      <ConfirmDialog
        open={!!deletingContact}
        onClose={() => setDeletingContact(null)}
        onConfirm={handleDelete}
        title="Delete this contact?"
        description={`"${deletingContact?.name}" will be permanently removed.`}
      />
    </>
  );
}
