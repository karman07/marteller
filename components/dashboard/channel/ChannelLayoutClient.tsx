import { ReactNode } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Channel, channelLabel } from "@/lib/channels";

// Navigation between Logs/Templates/Send lives in the sidebar dropdown now —
// this stays a stable, non-remounting header so switching tabs never shifts
// the page title.
export function ChannelLayoutClient({ channel, children }: { channel: Channel; children: ReactNode }) {
  return (
    <>
      <PageHeader title={channelLabel(channel)} />
      <div className="px-8 py-6">{children}</div>
    </>
  );
}
