import { notFound } from "next/navigation";
import { isChannel } from "@/lib/channels";
import { ChannelTemplatesView } from "@/components/dashboard/channel/ChannelTemplatesView";

export default async function ChannelTemplatesPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  if (!isChannel(channel)) notFound();
  return <ChannelTemplatesView channel={channel} />;
}
