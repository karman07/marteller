"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCheck,
  Mail,
  MailOpen,
  MessageCircle,
  MessageSquareText,
  Send,
} from "lucide-react";
import { Container } from "./ui/Container";
import { SectionLabel } from "./ui/Pill";
import { Reveal } from "./Reveal";

type FilterKey = "all" | "whatsapp" | "email" | "sms";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
];

const stats = [
  { label: "Messages Sent", value: "284,920", icon: Send },
  { label: "Delivered", value: "96.4%", icon: CheckCheck },
  { label: "Opened", value: "52.1%", icon: MailOpen },
  { label: "Failed", value: "0.8%", icon: AlertTriangle },
  { label: "Active Campaigns", value: "12", icon: Activity },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const barsByFilter: Record<FilterKey, number[]> = {
  all: [55, 68, 60, 74, 70, 86, 92],
  whatsapp: [60, 72, 58, 80, 76, 90, 95],
  email: [40, 50, 46, 58, 54, 66, 70],
  sms: [70, 75, 68, 82, 78, 88, 94],
};

const distribution: { key: FilterKey; label: string; value: number; icon: typeof MessageCircle }[] = [
  { key: "whatsapp", label: "WhatsApp", value: 54, icon: MessageCircle },
  { key: "email", label: "Email", value: 31, icon: Mail },
  { key: "sms", label: "SMS", value: 15, icon: MessageSquareText },
];

const activity: {
  channel: FilterKey;
  text: string;
  time: string;
  status: string;
}[] = [
  { channel: "whatsapp", text: "Order #4821 confirmation delivered", time: "2m ago", status: "Delivered" },
  { channel: "email", text: "Welcome series — step 2 opened", time: "6m ago", status: "Opened" },
  { channel: "sms", text: "OTP verification delivered", time: "9m ago", status: "Delivered" },
  { channel: "whatsapp", text: "Abandoned cart reminder sent", time: "14m ago", status: "Sent" },
  { channel: "email", text: "Monthly newsletter batch queued", time: "21m ago", status: "Queued" },
  { channel: "sms", text: "Appointment reminder delivered", time: "27m ago", status: "Delivered" },
];

export function DashboardSection() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const bars = barsByFilter[filter];
  const items =
    filter === "all" ? activity : activity.filter((a) => a.channel === filter);

  return (
    <section className="bg-cream-secondary/50 py-24 sm:py-32">
      <Container>
        <Reveal className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <SectionLabel>Unified Dashboard</SectionLabel>
            <h2 className="mt-4 text-balance text-4xl font-black tracking-tight text-ink sm:text-5xl">
              Everything in one place.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              Monitor campaigns, message delivery, customer engagement, and
              communication performance without switching between platforms.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface p-1.5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  filter === f.key
                    ? "bg-accent text-cream"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={100} className="mt-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <stat.icon size={18} className="text-accent" />
                <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-ink-soft">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={150} className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-line bg-surface p-6 lg:col-span-2 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Message activity</p>
              <p className="text-xs text-ink-soft">Last 7 days</p>
            </div>
            <div className="mt-6 flex h-48 items-end gap-3 sm:gap-4">
              {bars.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end">
                    <div
                      className="w-full rounded-lg bg-accent transition-all duration-500"
                      style={{
                        height: `${h}%`,
                        opacity: 0.4 + (i / bars.length) * 0.6,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-ink-soft">{days[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-line bg-surface p-6">
              <p className="text-sm font-semibold text-ink">
                Channel distribution
              </p>
              <div className="mt-5 space-y-4">
                {distribution.map((d) => (
                  <div key={d.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-ink">
                        <d.icon size={13} className="text-accent" />
                        {d.label}
                      </span>
                      <span className="font-semibold text-ink-soft">
                        {d.value}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-cream-secondary">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-700"
                        style={{ width: `${d.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={200} className="mt-6">
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <p className="text-sm font-semibold text-ink">Recent activity</p>
            <div className="mt-5 divide-y divide-line">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                      {item.channel === "whatsapp" && <MessageCircle size={14} />}
                      {item.channel === "email" && <Mail size={14} />}
                      {item.channel === "sms" && <MessageSquareText size={14} />}
                    </span>
                    <p className="text-sm text-ink">{item.text}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs text-ink-soft sm:inline">
                      {item.time}
                    </span>
                    <span className="rounded-full bg-cream-secondary px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
