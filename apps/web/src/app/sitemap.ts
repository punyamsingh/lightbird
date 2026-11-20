import type { MetadataRoute } from "next";
import { publicPages, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // Do not invent last-modified dates from build or request time.
  return publicPages.map(({ path }) => ({ url: new URL(path, SITE_URL).toString() }));
}
