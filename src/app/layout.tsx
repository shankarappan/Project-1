import { Toaster } from "@/components/ui/sonner";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://lets-split-khaki.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Lets Split — One off spending. Clearly split.",
  description:
    "Split shared expenses with groups, track balances, and settle up — clearly and fairly.",
  applicationName: "Lets Split",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    type: "website",
    locale: "en_NZ",
    url: siteUrl,
    siteName: "Lets Split",
    title: "Lets Split — One off spending. Clearly split.",
    description:
      "Split shared expenses with groups, track balances, and settle up — clearly and fairly.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Lets Split logo",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lets Split — One off spending. Clearly split.",
    description:
      "Split shared expenses with groups, track balances, and settle up — clearly and fairly.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#4a69e2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
