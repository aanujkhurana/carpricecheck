import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE, buildMetadata } from "@/lib/seo";
import { ThemeBootstrap } from "@/components/shared/theme-toggle";
import { Toaster } from "sonner";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = buildMetadata({
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_TAGLINE,
  path: "/",
  imagePath: "/og-default.png",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#08090f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-AU"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <head>
        <ThemeBootstrap />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster
          theme="system"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "!rounded-xl !border-border/60 !bg-popover !text-popover-foreground !shadow-lg",
            },
          }}
        />
      </body>
    </html>
  );
}
