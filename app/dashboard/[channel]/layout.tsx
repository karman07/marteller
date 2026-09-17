import { notFound } from "next/navigation";
import { isChannel } from "@/lib/channels";
import { ChannelLayoutClient } from "@/components/dashboard/channel/ChannelLayoutClient";

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  if (!isChannel(channel)) notFound();

  return <ChannelLayoutClient channel={channel}>{children}</ChannelLayoutClient>;
}
