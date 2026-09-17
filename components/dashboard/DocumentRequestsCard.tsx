"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Check, Clock, FileUp, Loader2 } from "lucide-react";
import { DocumentRequestItem, listDocumentRequests, uploadDocumentRequest } from "@/lib/documentRequests";

export function DocumentRequestsCard() {
  const [requests, setRequests] = useState<DocumentRequestItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    listDocumentRequests()
      .then((items) => {
        setRequests(items);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleUpload(id: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingId(id);
    try {
      const updated = await uploadDocumentRequest(id, file);
      setRequests((prev) => prev.map((r) => (r._id === id ? updated : r)));
    } finally {
      setUploadingId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "requested");
  if (!loaded || (pending.length === 0 && requests.every((r) => r.status === "uploaded"))) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-6">
      <h2 className="text-sm font-semibold text-ink">Documents requested by our team</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Upload whatever&apos;s been asked for below — only our sales team can see these.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {requests.map((r) => (
          <div key={r._id} className="rounded-xl border border-line bg-cream px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{r.label}</p>
                {r.note && <p className="mt-0.5 truncate text-xs text-ink-muted">{r.note}</p>}
              </div>

              {r.status === "uploaded" ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-600">
                  <Check size={12} /> Uploaded
                </span>
              ) : (
                <>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[r._id] = el;
                    }}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleUpload(r._id, e)}
                  />
                  <button
                    onClick={() => fileInputRefs.current[r._id]?.click()}
                    disabled={uploadingId === r._id}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {uploadingId === r._id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <FileUp size={12} />
                    )}
                    Upload
                  </button>
                </>
              )}
            </div>
            {r.status === "requested" && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-muted">
                <Clock size={10} /> Requested
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
