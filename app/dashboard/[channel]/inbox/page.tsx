import { notFound } from "next/navigation";
import { isChannel } from "@/lib/channels";
import { ChannelInboxView } from "@/components/dashboard/channel/ChannelInboxView";

export default async function ChannelInboxPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  if (!isChannel(channel)) notFound();
  return <ChannelInboxView channel={channel} />;
}
