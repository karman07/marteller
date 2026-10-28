export type Channel = "whatsapp" | "email" | "sms";

export const CHANNELS: Channel[] = ["whatsapp", "email", "sms"];

// Validated categorical palette (dataviz skill) — blue/aqua/red, deliberately
// skipping the palette's "orange" slot since the app's own accent color is
// already warm orange and would be misread as identity rather than accent.
// Actual hex values live in globals.css as --series-* custom properties so
// light/dark switching follows the app's existing theming mechanism.
export const CHANNEL_COLORS: Record<Channel, { cssVar: string; label: string }> = {
  whatsapp: { cssVar: "var(--series-whatsapp)", label: "WhatsApp" },
  email: { cssVar: "var(--series-email)", label: "Email" },
  sms: { cssVar: "var(--series-sms)", label: "SMS" },
};

export function channelLabel(channel: Channel): string {
  return CHANNEL_COLORS[channel].label;
}

export function isChannel(value: string): value is Channel {
  return (CHANNELS as string[]).includes(value);
}
