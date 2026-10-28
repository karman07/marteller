import { notFound } from "next/navigation";
import { isChannel } from "@/lib/channels";
import { MessagingChannelLayoutClient } from "@/components/dashboard/channel/MessagingChannelLayoutClient";

export default async function MessagingChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  if (!isChannel(channel)) notFound();

  return <MessagingChannelLayoutClient channel={channel}>{children}</MessagingChannelLayoutClient>;
}
