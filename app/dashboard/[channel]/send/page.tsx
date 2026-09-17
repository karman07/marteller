import { notFound } from "next/navigation";
import { isChannel } from "@/lib/channels";
import { ChannelSendView } from "@/components/dashboard/channel/ChannelSendView";

export default async function ChannelSendPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  if (!isChannel(channel)) notFound();
  return <ChannelSendView channel={channel} />;
}
