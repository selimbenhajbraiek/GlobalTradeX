export const DEMO_THREADS = [
  {
    id: "stx-9921",
    name: "Shenzhen Linear",
    role: "supplier",
    snippet: "BL draft attached — please confirm HS codes before filing.",
    time: "2m",
    unread: 2,
    messages: [
      {
        role: "them",
        text: "Hi Marta — BL draft attached for GTX-9921. Can you confirm HS 8504.40 before we file?",
        time: "09:14",
      },
      {
        role: "me",
        text: "Thanks — reviewing now. Any change on vessel ETD?",
        time: "09:18",
      },
      {
        role: "them",
        text: "ETD unchanged Oct 18. We'll hold filing until your OK.",
        time: "09:21",
      },
    ],
  },
  {
    id: "aurora",
    name: "Aurora Lines",
    role: "broker",
    snippet: "Customs pre-file complete for EU-304 batch.",
    time: "1h",
    unread: 0,
    messages: [
      {
        role: "them",
        text: "EU-304 pre-file submitted for 7 entries. Reference batch B-441.",
        time: "08:02",
      },
      {
        role: "me",
        text: "Perfect — please send confirmation PDFs to the documents workspace.",
        time: "08:15",
      },
    ],
  },
  {
    id: "rotterdam",
    name: "Rotterdam Gateway",
    role: "partner",
    snippet: "Strike update: expect 2–4 day delays on inbound TEU.",
    time: "3h",
    unread: 1,
    messages: [
      {
        role: "them",
        text: "Strike notice extended through Friday. 14 of your units are in the affected queue.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "velocity",
    name: "Velocity Co.",
    role: "buyer",
    snippet: "QBR scheduling — can we review Q3 lane performance?",
    time: "Mon",
    unread: 0,
    messages: [
      {
        role: "them",
        text: "Can we schedule a QBR next week to review Hamburg → NYC lane margins?",
        time: "Mon 14:00",
      },
    ],
  },
];

export const FALLBACK_NOTIFICATIONS = [
  {
    id: "demo-1",
    title: "Rotterdam port strike — 14 shipments affected",
    message: "AI suggests re-routing 9 via Tanger Med.",
    type: "warning",
    is_read: false,
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-2",
    title: "EU-304 regulation active",
    message: "Pre-file recommended for 7 entries before Nov 1.",
    type: "info",
    is_read: false,
    created_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-3",
    title: "GTX-7704 delivered",
    message: "Proof of delivery uploaded to Documents.",
    type: "success",
    is_read: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-4",
    title: "Customs hold — GTX-8812",
    message: "Missing certificate of origin. Upload to release.",
    type: "warning",
    is_read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const AI_SEED_MESSAGES = [
  {
    role: "user",
    content: "What's the impact of the Rotterdam strike on our active POs?",
  },
  {
    role: "assistant",
    content:
      "14 shipments will be delayed by 2–4 days. I can re-route 9 via Tanger Med — estimated savings of 3.2 days average.",
  },
  {
    role: "user",
    content: "Draft the reroute plan and save it.",
  },
  {
    role: "assistant",
    content:
      "Done. Plan saved as RR-244. Notified brokers and updated ETAs. Estimated $48,200 in avoided demurrage.",
  },
];

export const AI_QUICK_PROMPTS = [
  "Summarize today",
  "Top at-risk shipments",
  "File EU-304 entries",
  "Compare Q3 vs Q4 lanes",
  "Translate BoL — ZH→EN",
];

export const VOICE_LANGUAGES = [
  { code: "EN", label: "English (US)" },
  { code: "FR", label: "French" },
  { code: "DE", label: "German" },
  { code: "ES", label: "Spanish" },
  { code: "ZH", label: "Chinese" },
  { code: "AR", label: "Arabic" },
  { code: "JA", label: "Japanese" },
  { code: "PT", label: "Portuguese" },
];
