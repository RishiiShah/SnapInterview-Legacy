import type { NextConfig } from "next";
import { STATIC_SECURITY_HEADERS } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Local access through 127.0.0.1 must be allowed for Turbopack's chunks and
  // HMR connection. This is used only by the development server.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...STATIC_SECURITY_HEADERS],
      },
    ];
  },
  images: {
    // Hero / pre-join backgrounds use quality 90–100; default allowlist is [75] only.
    qualities: [75, 90, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  // pdf-parse loads its canvas dependency dynamically in Node. Externalizing
  // both packages ensures Vercel traces the native module into the function.
  // onnxruntime-node and @huggingface/transformers use native .so binaries
  // that dlopen at runtime; without externalization the shared libraries are
  // omitted from the lambda zip and we get:
  //   "libonnxruntime.so.1: cannot open shared object file"
  serverExternalPackages: [
    "pdf-parse",
    "@napi-rs/canvas",
    "onnxruntime-node",
    "@huggingface/transformers",
  ],
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/onnxruntime-node/bin/**/*"],
  },
};

export default nextConfig;
