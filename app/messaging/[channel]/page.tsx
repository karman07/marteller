import { notFound } from "next/navigation";
import { isChannel } from "@/lib/channels";
import { ChannelLogsView } from "@/components/dashboard/channel/ChannelLogsView";

// Global cross-tenant view — stats + logs, with a Tenant column (showTenant)
// since rows span every tenant. No send/inbox at this level: those stay
// scoped to a single applicant, in the applicant detail page's Messaging tab.
export default async function MessagingChannelPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  if (!isChannel(channel)) notFound();
  return <ChannelLogsView channel={channel} showTenant />;
}
