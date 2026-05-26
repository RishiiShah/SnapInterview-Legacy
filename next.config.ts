import type { NextConfig } from "next";
import path from "node:path";

const emptyNodeModule = path.resolve(process.cwd(), "src/lib/stt/empty-module.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  serverExternalPackages: ["pdf-parse", "@xenova/transformers"],
  turbopack: {
    // Browser-only aliases — do NOT alias path/fs globally or AWS SDK app routes break.
    resolveAlias: {
      sharp: { browser: "./src/lib/stt/empty-module.ts" },
      "onnxruntime-node": { browser: "./src/lib/stt/empty-module.ts" },
      fs: { browser: "./src/lib/stt/empty-module.ts" },
      path: { browser: "./src/lib/stt/empty-module.ts" },
      url: { browser: "./src/lib/stt/empty-module.ts" },
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp$: false,
        "onnxruntime-node$": false,
        fs: emptyNodeModule,
        path: emptyNodeModule,
        url: emptyNodeModule,
      };
    }

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
};

export default nextConfig;
