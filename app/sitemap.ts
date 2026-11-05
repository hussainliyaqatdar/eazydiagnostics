import type { MetadataRoute } from "next";
import { allTests, allPackages } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/llm-info`, changeFrequency: "monthly", priority: 0.7 },
  ];

  const packagePages = allPackages.map((p) => ({
    url: `${SITE_URL}/packages/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const testPages = allTests.map((t) => ({
    url: `${SITE_URL}/tests/${t.slug}`,
    changeFrequency: "weekly" as const,
    priority: t.popular ? 0.8 : 0.5,
  }));

  return [...staticPages, ...packagePages, ...testPages];
}
