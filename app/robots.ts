import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/confirmation", "/cart", "/index", "/site-index"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
