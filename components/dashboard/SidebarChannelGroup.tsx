import { LucideIcon } from "lucide-react";
import { Channel } from "@/lib/channels";
import { SidebarGroup } from "./SidebarGroup";

const SUB_TABS = [
  { key: "inbox", label: "Inbox" },
  { key: "logs", label: "Logs" },
  { key: "templates", label: "Templates" },
  { key: "send", label: "Send" },
];

// Sending infrastructure (domains, SMTP credentials) only exists for the
// self-hosted Mail backend — email-only, lives as static routes under
// /dashboard/email rather than the shared [channel] dynamic route.
const EMAIL_ONLY_SUB_TABS = [
  { key: "domains", label: "Domains" },
  { key: "credentials", label: "Credentials" },
];

export function SidebarChannelGroup({
  channel,
  label,
  icon,
}: {
  channel: Channel;
  label: string;
  icon: LucideIcon;
}) {
  const tabs = channel === "email" ? [...SUB_TABS, ...EMAIL_ONLY_SUB_TABS] : SUB_TABS;
  return <SidebarGroup base={`/dashboard/${channel}`} label={label} icon={icon} tabs={tabs} />;
}
