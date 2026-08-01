import type { MetadataRoute } from "next";
import { articles } from "@/content/articles";
import { services } from "@/content/services";
import { site } from "@/content/site";
import { team } from "@/content/team";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes = [
    "",
    "/about",
    "/services",
    "/notary",
    "/articles",
    "/contact",
    "/book",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const serviceRoutes = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const teamRoutes = team.map((m) => ({
    url: `${base}/team/${m.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const articleRoutes = articles.map((a) => ({
    url: `${base}/articles/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...serviceRoutes, ...teamRoutes, ...articleRoutes];
}
