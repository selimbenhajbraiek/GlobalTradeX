import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";

import { AppProviders } from "@/components/providers/AppProviders";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata = {
  title: "GlobalTradeX — The operating system for global commerce",
  description:
    "Unify shipments, customs, documents and partners on one intelligent platform for importers, exporters, brokers and logistics teams.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans"
        style={{
          ["--font-sans"]: "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif",
          ["--font-display"]: 'var(--font-instrument), "Instrument Serif", "Times New Roman", serif',
          ["--font-mono"]: 'var(--font-jetbrains), "JetBrains Mono", ui-monospace, monospace',
        }}
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
