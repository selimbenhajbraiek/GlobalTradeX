import { Fraunces, Outfit } from "next/font/google";

import { AppProviders } from "@/components/providers/AppProviders";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata = {
  title: "GlobalTradeX",
  description: "International trade operations platform",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      {/* Browser extensions (e.g. Grammarly) inject attributes on <body>; suppress avoids dev hydration noise */}
      <body className="font-sans" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
