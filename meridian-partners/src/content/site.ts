export const site = {
  name: "Meridian Partners",
  legalName: "Meridian Partners",
  tagline: "Barristers & Solicitors",
  description:
    "Meridian Partners is an Auckland law firm specialising in property, litigation, tax disputes, employment and family law. Free 10-minute consultation available.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://mplaw.nz",
  email: "info@mplaw.nz",
  phoneDisplay: "Contact via consultation form",
  address: {
    street: "97 Great South Road",
    suburb: "Epsom",
    city: "Auckland",
    postcode: "1051",
    country: "New Zealand",
  },
  addressLine: "97 Great South Road, Epsom, Auckland 1051",
  social: {
    linkedin: "https://www.linkedin.com/company/meridian-partners-nz",
    facebook: "https://www.facebook.com/",
  },
  nav: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/notary", label: "Notary Public" },
    { href: "/articles", label: "Articles" },
    { href: "/contact", label: "Contact" },
  ],
} as const;

export const pillars = [
  "Barristers & Solicitors",
  "Notary Public",
  "Fixed Fee Options",
  "Free 10-Min Consultation",
  "Auckland Based",
] as const;
