"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CHANNELS, Channel, channelLabel } from "@/lib/channels";
import { ChannelIcon } from "@/components/dashboard/ChannelIcon";

// Admin has no per-channel sidebar dropdown the way the tenant dashboard
// does, so the channel switcher (whatsapp/email/sms) and the
// overview/templates sub-tabs live inline here instead.
export function MessagingChannelLayoutClient({ channel, children }: { channel: Channel; children: ReactNode }) {
  const pathname = usePathname();
  const onTemplates = pathname.endsWith("/templates");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 sm:px-8 py-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Messaging</h1>
          <p className="mt-1 text-sm text-ink-soft">Cross-tenant activity, across every tenant on the platform.</p>
        </div>
        <div className="flex gap-1.5">
          {CHANNELS.map((c) => (
            <Link
              key={c}
              href={onTemplates ? `/messaging/${c}/templates` : `/messaging/${c}`}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                c === channel
                  ? "border-accent bg-accent-soft/40 text-accent"
                  : "border-line text-ink-soft hover:text-ink"
              }`}
            >
              <ChannelIcon channel={c} size={13} />
              {channelLabel(c)}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 border-b border-line px-4 sm:px-8 pt-4">
        <Link
          href={`/messaging/${channel}`}
          className={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
            !onTemplates ? "border-b-2 border-accent text-accent" : "text-ink-soft hover:text-ink"
          }`}
        >
          Overview
        </Link>
        <Link
          href={`/messaging/${channel}/templates`}
          className={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
            onTemplates ? "border-b-2 border-accent text-accent" : "text-ink-soft hover:text-ink"
          }`}
        >
          Templates
        </Link>
      </div>

      <div className="px-4 sm:px-8 py-6">{children}</div>
    </>
  );
}
