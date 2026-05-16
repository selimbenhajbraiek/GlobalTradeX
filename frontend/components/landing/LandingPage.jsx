import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  FileText,
  LineChart,
  Link2,
  ShieldCheck,
  Ship,
  Sparkles,
} from "lucide-react";

import { WorldMap, WorldMapHeroCard } from "@/components/brand/WorldMap";

import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";

function ArrowLinkIcon({ className = "" }) {
  return <ArrowUpRight className={`h-3.5 w-3.5 text-muted-foreground/60 ${className}`} aria-hidden />;
}

function AreaChart({ className = "" }) {
  return (
    <svg viewBox="0 0 400 120" className={`w-full ${className}`} preserveAspectRatio="none" aria-hidden>
      <path
        d="M0 100 L40 85 L80 90 L120 70 L160 75 L200 55 L240 60 L280 40 L320 45 L360 25 L400 30 L400 120 L0 120 Z"
        fill="var(--foreground)"
        fillOpacity="0.95"
      />
      <path
        d="M0 100 L40 85 L80 90 L120 70 L160 75 L200 55 L240 60 L280 40 L320 45 L360 25 L400 30"
        fill="none"
        stroke="var(--kinetic)"
        strokeWidth="2.5"
      />
    </svg>
  );
}

const FEATURES = [
  {
    icon: Ship,
    title: "Shipment tracking",
    desc: "Container-level visibility with IoT, AIS and carrier feeds unified into one timeline.",
  },
  {
    icon: ShieldCheck,
    title: "Customs automation",
    desc: "OCR + AI classification handles documentation across 190+ jurisdictions.",
  },
  {
    icon: Link2,
    title: "Importer / exporter collab",
    desc: "Shared spaces for POs, invoices, and documents — version-controlled and auditable.",
  },
  {
    icon: Sparkles,
    title: "AI assistant",
    desc: "A trade copilot that reasons through delays, regulations and re-routing options.",
  },
  {
    icon: LineChart,
    title: "Trade analytics",
    desc: "Lane performance, customs SLA, supplier scorecards, sustainability metrics.",
  },
  {
    icon: FileText,
    title: "Document automation",
    desc: "Generate, sign and file BOLs, CO, packing lists and entries automatically.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "GlobalTradeX collapsed three vendors into one. Our customs SLA dropped from 18 hours to under four.",
    name: "Marta Lindqvist",
    role: "VP Logistics, Equinox Goods",
  },
  {
    quote:
      "The AI assistant doesn't just notify us — it drafts the email, files the entry, and books the truck.",
    name: "Daniel Okafor",
    role: "Head of Trade, Aurora Lines",
  },
  {
    quote: "We finally have one ledger our forwarders, brokers and finance team all trust.",
    name: "Hannah Chen",
    role: "COO, Stratum Imports",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "$499",
    period: "/mo",
    desc: "For growing importers and exporters.",
    features: ["Up to 50 shipments/mo", "Customs AI (5 jurisdictions)", "2 team seats", "Email support"],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$1,299",
    period: "/mo",
    desc: "For teams running multi-lane operations.",
    features: [
      "Unlimited shipments",
      "190+ customs jurisdictions",
      "AI assistant + video",
      "15 team seats",
      "SSO & SCIM",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For brokers, 3PLs and global programs.",
    features: ["Dedicated CSM", "Private cloud option", "Custom integrations", "24/7 SLA"],
    cta: "Talk to sales",
    highlighted: false,
  },
];

export function LandingPage() {
  return (
    <div className="grid-paper min-h-screen bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="landing-container py-16 md:py-24 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="animate-reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-kinetic animate-pulse-ring" aria-hidden />
              <span className="eyebrow !text-[10px]">Trade network · live</span>
            </span>
            <h1 className="mt-6 font-display text-5xl leading-[0.95] tracking-tight text-foreground md:text-6xl lg:text-7xl">
              The operating system for <span className="italic">global commerce</span>.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              Unify shipments, customs, documents and partners on one intelligent platform. Built
              for importers, exporters, brokers and the teams that move the world.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                Start free trial
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <a href="#assistant" className="btn-secondary">
                Meet the AI assistant
              </a>
            </div>
            <dl className="mt-14 grid grid-cols-3 gap-6 border-t border-border pt-8" data-stagger>
              {[
                { v: "190+", l: "Customs jurisdictions" },
                { v: "$84B", l: "Cargo orchestrated" },
                { v: "99.98%", l: "Uptime, 365 days" },
              ].map((kpi) => (
                <div key={kpi.l}>
                  <dt className="font-mono text-2xl tabular-nums text-foreground md:text-3xl">{kpi.v}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground md:text-sm">{kpi.l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="animate-fade lg:justify-self-end">
            <WorldMapHeroCard />
          </div>
        </div>
      </section>

      {/* Platform grid */}
      <section id="platform" className="landing-container py-16 md:py-24">
        <p className="eyebrow animate-reveal">Platform</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-end">
          <h2 className="animate-reveal font-display text-4xl tracking-tight text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">
            One platform.
            <br />
            Every leg of the journey.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground lg:pb-2">
            From quote to delivery — replace ten tabs and four spreadsheets with one workspace your
            whole network can trust.
          </p>
        </div>
        <div
          className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-paper"
          data-stagger
        >
          <div className="grid md:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const borderR = i % 3 !== 2 ? "md:border-r" : "";
              const borderB = i < 3 ? "border-b md:border-b" : i < 5 ? "md:border-b" : "";
              return (
                <div
                  key={f.title}
                  className={`group p-8 transition-transform duration-200 hover:-translate-y-0.5 ${borderR} ${borderB} border-border`}
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
                      <Icon className="h-4 w-4 text-foreground" strokeWidth={1.5} />
                    </span>
                    <ArrowLinkIcon className="opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-6 font-display text-xl text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workspace */}
      <section id="solutions" className="landing-container py-16 md:py-24">
        <p className="eyebrow">Built for every role</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 className="font-display text-4xl tracking-tight text-foreground md:text-5xl">
            A workspace that adapts to your team.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Different surfaces for different jobs — the same source of truth underneath. Switch
            context without switching tools.
          </p>
        </div>
        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-paper">
          <div className="grid border-b border-border sm:grid-cols-4">
            {[
              { role: "Importer", desc: "Track POs, ETAs, exceptions", active: true },
              { role: "Exporter", desc: "Quote-to-cash, invoicing" },
              { role: "Customs", desc: "Declarations & compliance" },
              { role: "Admin", desc: "Org, billing & roles" },
            ].map((tab) => (
              <div
                key={tab.role}
                className={`border-border p-4 sm:border-r last:sm:border-r-0 ${
                  tab.active ? "bg-kinetic/5" : ""
                }`}
              >
                <p className="text-sm font-medium text-foreground">{tab.role}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{tab.desc}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-0 lg:grid-cols-[220px_1fr_260px]">
            <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
              <p className="eyebrow !text-[10px]">Importer cockpit</p>
              <ul className="mt-4 space-y-0">
                {[
                  ["Active POs", "64"],
                  ["In customs", "7"],
                  ["Exceptions", "2"],
                  ["Suppliers", "38"],
                ].map(([label, val]) => (
                  <li
                    key={label}
                    className="flex items-center justify-between border-b border-border py-3 last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="font-mono text-sm tabular-nums text-foreground">{val}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between">
                <p className="eyebrow !text-[10px]">Lane performance · 30d</p>
                <span className="font-mono text-xs text-success">+4.8%</span>
              </div>
              <AreaChart className="mt-4 h-36" />
            </div>
            <div className="p-6">
              <p className="eyebrow !text-[10px]">AI suggestions</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-border bg-background p-3 text-sm leading-snug">
                  Suez backlog on GTX-8812 — consider{" "}
                  <span className="text-kinetic">reroute</span> via Cape (+4d, -$12k).
                </div>
                <div className="rounded-lg border border-border bg-background p-3 text-sm leading-snug">
                  Pre-file <span className="font-mono text-kinetic">EU-304</span> before vessel
                  arrival to save 6h customs.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section id="intelligence" className="landing-container py-16 md:py-24">
        <p className="eyebrow">Trade analytics</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 className="font-display text-4xl tracking-tight text-foreground md:text-5xl">
            See the network.
            <br />
            Move the numbers.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Lane economics, supplier scorecards, customs SLA and Scope 3 emissions — all in one
            editorial dashboard.
          </p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
            <div className="flex items-center justify-between">
              <p className="eyebrow !text-[10px]">Throughput · TEU / week</p>
              <span className="font-mono text-xs text-success">+11.4% MoM</span>
            </div>
            <AreaChart className="mt-6 h-44" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex-1 rounded-2xl border border-border bg-card p-6 shadow-paper">
              <p className="eyebrow !text-[10px]">Top lanes</p>
              <ul className="mt-4 space-y-0">
                {[
                  ["Shanghai → LA", "4,280 TEU"],
                  ["Rotterdam → SG", "3,910 TEU"],
                  ["Busan → Hamburg", "2,640 TEU"],
                ].map(([lane, teu]) => (
                  <li
                    key={lane}
                    className="flex justify-between border-b border-border py-3 text-sm last:border-0"
                  >
                    <span className="text-foreground">{lane}</span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{teu}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-paper">
              <p className="eyebrow !text-[10px]">Sustainability</p>
              <p className="mt-2 font-display text-4xl text-foreground">-14.2%</p>
              <p className="text-sm text-muted-foreground">CO₂ vs. last quarter</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant - dark */}
      <section id="assistant" className="bg-ink py-16 text-primary-foreground md:py-24">
        <div className="landing-container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-primary-foreground/60">AI video assistant</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              Talk to your <span className="italic">supply chain</span>.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-primary-foreground/70">
              A multilingual video assistant that watches your network 24/7, explains what changed,
              and acts on your behalf — from re-routing to filing.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Voice & video, 32 languages",
                "Real-time reasoning over your live data",
                "Drafts emails, files, declarations",
                "Auditable actions with one-click rollback",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-primary-foreground/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-kinetic" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-8 rounded-3xl opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse at center, oklch(0.55 0.22 270 / 0.35), transparent 70%)",
              }}
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-2xl border border-primary-foreground/10 bg-card/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full gradient-kinetic">
                    <Sparkles className="h-4 w-4 text-kinetic-foreground" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">TradeFlow AI</p>
                    <p className="text-xs text-primary-foreground/50">listening…</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-primary-foreground/40">v4.2 · Live</span>
              </div>
              <div className="relative mt-8 flex h-56 items-center justify-center rounded-xl bg-gradient-to-b from-kinetic/20 to-transparent">
                <div className="relative h-32 w-32 animate-orbit">
                  <div className="absolute inset-0 rounded-full border border-kinetic/40" />
                  <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-kinetic shadow-glow" />
                  <span className="absolute bottom-2 left-4 h-1.5 w-1.5 rounded-full bg-primary-foreground/40" />
                  <span className="absolute bottom-4 right-3 h-1.5 w-1.5 rounded-full bg-primary-foreground/40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="landing-container py-16 md:py-24">
        <p className="eyebrow text-center">Operators on GlobalTradeX</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-center font-display text-4xl tracking-tight text-foreground md:text-5xl">
          Built for the people moving the world.
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3" data-stagger>
          {TESTIMONIALS.map((t) => (
            <blockquote
              key={t.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-paper transition-transform duration-200 hover:-translate-y-0.5"
            >
              <p className="flex-1 font-display text-lg leading-snug text-foreground">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-8 border-t border-border pt-6">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="landing-container py-16 md:py-24">
        <p className="eyebrow text-center">Pricing</p>
        <h2 className="mx-auto mt-4 max-w-2xl text-center font-display text-4xl tracking-tight text-foreground md:text-5xl">
          Simple, scalable pricing.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-muted-foreground">
          Start free. Scale with your lanes, jurisdictions and team.
        </p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3" data-stagger>
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-8 transition-transform duration-200 hover:-translate-y-0.5 ${
                plan.highlighted
                  ? "border-kinetic/30 bg-card shadow-glow"
                  : "border-border bg-card shadow-paper"
              }`}
            >
              <p className="font-medium text-foreground">{plan.name}</p>
              <p className="mt-4 font-mono text-4xl tabular-nums text-foreground">
                {plan.price}
                <span className="text-base font-normal text-muted-foreground">{plan.period}</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
              <ul className="mt-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-kinetic" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-8 ${plan.highlighted ? "btn-kinetic" : "btn-secondary"} w-full justify-center`}
              >
                {plan.cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-container pb-16 md:pb-24">
        <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-paper md:p-16 lg:p-20">
          <p className="eyebrow">Get started</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Move freight at the speed of software.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Join importers, exporters and brokers running their entire global supply chain on
            GlobalTradeX.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary">
              Start free trial
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link href="/login" className="btn-secondary">
              Open the live demo
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
