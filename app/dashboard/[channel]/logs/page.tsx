import { notFound } from "next/navigation";
import { isChannel } from "@/lib/channels";
import { ChannelLogsView } from "@/components/dashboard/channel/ChannelLogsView";

export default async function ChannelLogsPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  if (!isChannel(channel)) notFound();
  return <ChannelLogsView channel={channel} />;
}
