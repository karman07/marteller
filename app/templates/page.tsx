"use client";

import { useState } from "react";
import { ChannelIcon } from "@/components/dashboard/ChannelIcon";
import { ChannelTemplatesView } from "@/components/dashboard/channel/ChannelTemplatesView";
import { CHANNELS, Channel, channelLabel } from "@/lib/channels";

// Read-only browse of the shared template library — only admin
// creates/edits/deletes templates; sales just looks and previews.
export default function TemplatesPage() {
  const [channel, setChannel] = useState<Channel>("whatsapp");

  return (
    <>
      <div className="border-b border-line px-4 sm:px-8 py-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Templates</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Browse the shared template library used for sending messages to applicants.
        </p>
      </div>

      <div className="px-4 sm:px-8 py-6">
        <div className="mb-4 flex gap-1.5">
          {CHANNELS.map((c) => (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                channel === c
                  ? "border-accent bg-accent-soft/40 text-accent"
                  : "border-line text-ink-soft hover:text-ink"
              }`}
            >
              <ChannelIcon channel={c} size={13} />
              {channelLabel(c)}
            </button>
          ))}
        </div>

        <ChannelTemplatesView channel={channel} />
      </div>
    </>
  );
}
