import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/onboarding/", "/recordings/", "/share/"],
    },
    sitemap: "https://snapinterview.app/sitemap.xml",
  };
}
