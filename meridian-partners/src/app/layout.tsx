import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { site } from "@/content/site";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mplaw.nz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} | Barristers & Solicitors Auckland`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_NZ",
    url: siteUrl,
    siteName: site.name,
    title: `${site.name} | Barristers & Solicitors Auckland`,
    description: site.description,
    images: [
      {
        url: "/images/logo.png",
        width: 1052,
        height: 550,
        alt: "Meridian Partners Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} | Barristers & Solicitors Auckland`,
    description: site.description,
    images: ["/images/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1F33",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: site.name,
    description: site.description,
    url: siteUrl,
    email: site.email,
    image: `${siteUrl}/images/logo.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.suburb,
      addressRegion: "Auckland",
      postalCode: site.address.postcode,
      addressCountry: "NZ",
    },
    areaServed: "New Zealand",
  };

  return (
    <html lang="en-NZ" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
