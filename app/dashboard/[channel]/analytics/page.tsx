import { notFound } from "next/navigation";
import { isChannel } from "@/lib/channels";
import { ChannelStatsHeader } from "@/components/dashboard/channel/ChannelStatsHeader";
import { LimitsSummary } from "@/components/dashboard/LimitsSummary";

export default async function ChannelAnalyticsPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  if (!isChannel(channel)) notFound();
  return (
    <div className="flex flex-col gap-6">
      <LimitsSummary channel={channel} />
      <ChannelStatsHeader channel={channel} />
    </div>
  );
}
