import { Mail, MessageCircle, MessageSquareText } from "lucide-react";
import { Channel } from "@/lib/channels";

const ICONS: Record<Channel, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: MessageSquareText,
};

export function ChannelIcon({ channel, size = 15 }: { channel: Channel; size?: number }) {
  const Icon = ICONS[channel];
  return <Icon size={size} style={{ color: `var(--series-${channel})` }} />;
}
