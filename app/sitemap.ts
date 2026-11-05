import type { MetadataRoute } from "next";
import { allTests, allPackages } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site-config";
import { AREAS } from "@/lib/areas";
import { GUIDES } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/tests`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/packages`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/llm-info`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/guides`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/blood-test-at-home`, changeFrequency: "monthly", priority: 0.7 },
  ];

  const guidePages = GUIDES.map((g) => ({
    url: `${SITE_URL}/guides/${g.slug}`,
    lastModified: g.updated,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const areaPages = AREAS.map((a) => ({
    url: `${SITE_URL}/blood-test-at-home/${a.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

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

  return [...staticPages, ...areaPages, ...guidePages, ...packagePages, ...testPages];
}
