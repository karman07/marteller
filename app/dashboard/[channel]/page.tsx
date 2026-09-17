import { redirect } from "next/navigation";
import { isChannel } from "@/lib/channels";

export default async function ChannelIndexPage({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const { channel } = await params;
  if (!isChannel(channel)) redirect("/dashboard");
  redirect(`/dashboard/${channel}/logs`);
}
