import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Articles are read from content/ at runtime by routes that are not prerendered (e.g. sitemap).
  outputFileTracingIncludes: {
    "/sitemap.xml": ["./content/articles/**/*"],
    "/tools-lab": ["./content/articles/**/*"],
    "/tools-lab/[slug]": ["./content/articles/**/*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cf.shopee.co.th" },
      { protocol: "https", hostname: "down-th.img.susercontent.com" },
      { protocol: "https", hostname: "susercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https://cf.shopee.co.th https://*.susercontent.com",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;