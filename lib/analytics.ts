"use client";

import { BACKEND_URL, getToken } from "./http";

// Client for POST /analytics/track (backend/src/analytics) — see that
// module for the full design. Buffers events and flushes periodically or
// on tab-hide, using fetch's `keepalive` option (not navigator.sendBeacon)
// specifically so the JWT can still be attached via a normal Authorization
// header on every flush, including the final one before unload.

const ANONYMOUS_ID_KEY = "marteller-anonymous-id";
const SESSION_ID_KEY = "marteller-session-id";
const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 20;

type EventType = "page_view" | "click" | "feature_interest" | "funnel_step" | "custom";

type QueuedEvent = {
  anonymousId: string;
  sessionId: string;
  app: "frontend";
  type: EventType;
  name: string;
  path?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getAnonymousId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = uuid();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function ensureFlushLoop() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}

function flush() {
  if (queue.length === 0) return;
  const events = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);

  const token = getToken();
  fetch(`${BACKEND_URL}/analytics/track`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ events }),
  }).catch(() => {
    // Best-effort — analytics must never surface an error to the user or
    // block anything it's attached to.
  });
}

export function track(
  type: EventType,
  name: string,
  options: { path?: string; metadata?: Record<string, unknown> } = {},
) {
  if (typeof window === "undefined") return;
  ensureFlushLoop();
  queue.push({
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    app: "frontend",
    type,
    name,
    path: options.path ?? window.location.pathname,
    referrer: document.referrer || undefined,
    metadata: options.metadata,
  });
  if (queue.length >= MAX_BATCH) flush();
}

export function trackPageView(path?: string) {
  track("page_view", "page_view", { path });
}

export function trackFunnelStep(name: string, metadata?: Record<string, unknown>) {
  track("funnel_step", name, { metadata });
}

export function trackFeatureInterest(name: string, metadata?: Record<string, unknown>) {
  track("feature_interest", `feature_click:${name}`, { metadata });
}
