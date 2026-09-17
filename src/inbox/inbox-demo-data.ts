import type { Channel } from '../templates/schemas/template.schema';
import type { AiSentiment } from '../ai/ai-reply.service';

// Dev-only sample conversations so a fresh account's per-channel inbox isn't
// empty while exploring the UI — never persisted, only ever returned when
// the real query for that channel came back empty and the dev bypass is on.
export type DemoMessage = {
  minutesAgo: number;
  text: string;
  reply: string;
  sentiment: AiSentiment;
  inDomain: boolean;
  interested: boolean;
};

export type DemoThread = {
  contact: string;
  messages: DemoMessage[];
};

export const DEMO_THREADS: Record<Channel, DemoThread[]> = {
  whatsapp: [
    {
      contact: '+919812345670',
      messages: [
        {
          minutesAgo: 180,
          text: "Hi! Do you have a plan for small businesses? What's the pricing?",
          reply:
            'Hi there! Yes — our Starter plan is built for small businesses and covers WhatsApp, Email, and SMS. Want me to send over the pricing breakdown?',
          sentiment: 'positive',
          inDomain: true,
          interested: true,
        },
      ],
    },
    {
      contact: '+919812345671',
      messages: [
        {
          minutesAgo: 60,
          text: "This is the third time my message hasn't been delivered — pretty frustrating.",
          reply:
            "I'm really sorry about that. I've flagged this for our support team to look into right away — someone will follow up shortly.",
          sentiment: 'negative',
          inDomain: true,
          interested: false,
        },
      ],
    },
    {
      contact: '+919812345672',
      messages: [
        {
          minutesAgo: 20,
          text: "What's the weather like today?",
          reply:
            "That's a bit outside what I can help with here — but happy to answer anything about our WhatsApp, Email, or SMS platform!",
          sentiment: 'neutral',
          inDomain: false,
          interested: false,
        },
      ],
    },
  ],
  email: [
    {
      contact: 'priya.sharma@example.com',
      messages: [
        {
          minutesAgo: 240,
          text: 'Hello, I would like to know more about your Enterprise plan and whether it supports custom templates.',
          reply:
            'Hi Priya, thanks for reaching out! Yes, the Enterprise plan includes custom templates plus dedicated onboarding — I can set up a quick call if that helps.',
          sentiment: 'positive',
          inDomain: true,
          interested: true,
        },
      ],
    },
    {
      contact: 'arjun.mehta@example.com',
      messages: [
        {
          minutesAgo: 90,
          text: 'My last campaign email bounced for half my list, can someone explain why?',
          reply:
            "Sorry for the trouble — bounce spikes like that are usually a sender-domain verification issue. I've escalated this to our deliverability team.",
          sentiment: 'negative',
          inDomain: true,
          interested: false,
        },
      ],
    },
  ],
  sms: [
    {
      contact: '+919812345680',
      messages: [
        {
          minutesAgo: 45,
          text: 'Can I get a demo of the SMS automation feature?',
          reply:
            "Of course! I'll have someone on the team send over a demo link shortly.",
          sentiment: 'positive',
          inDomain: true,
          interested: true,
        },
      ],
    },
    {
      contact: '+919812345681',
      messages: [
        {
          minutesAgo: 15,
          text: 'STOP',
          reply: "You've been unsubscribed from SMS updates.",
          sentiment: 'neutral',
          inDomain: true,
          interested: false,
        },
      ],
    },
  ],
};

export function findDemoThread(channel: Channel, contact: string) {
  return DEMO_THREADS[channel].find((t) => t.contact === contact);
}
