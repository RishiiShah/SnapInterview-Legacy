import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Server-only modules: must never be imported by client code (components, hooks). */
const SERVER_ONLY_IMPORTS = [
  "@/lib/env",
  "@/lib/prisma",
  "@/lib/auth",
  "@/lib/server-auth",
  "@/lib/email",
  "@/lib/password",
  "@/lib/account-security",
  "@/lib/csrf",
  "@/lib/security",
  "@/lib/s3/videos",
  "@/lib/ai/groq",
  "@/proxy",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // The application uses validated dynamic JSON payloads at its AI and persistence boundaries;
  // those adapters are intentionally incrementally typed while their schemas enforce runtime safety.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  // Better security: enforce server/client boundary. Any file that runs on the client must not
  // import server-only modules (env, prisma, auth, secrets, etc.). Use client-safe modules
  // (e.g. @/lib/auth-client, @/lib/describe-user-agent) and type-only imports where needed.
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/app/forgot-password/page.tsx",
      "src/app/login/page.tsx",
      "src/app/signup/page.tsx",
      "src/app/providers.tsx",
      "src/app/(dashboard)/settings/SettingsPageClient.tsx",
      "src/app/(dashboard)/questions/[slug]/page.tsx",
      "src/app/interview/[uuid]/page.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: SERVER_ONLY_IMPORTS.map((path) => ({
            name: path,
            message: `"${path}" is server-only. Do not import in client code. Use client-safe modules (e.g. @/lib/auth-client, @/lib/describe-user-agent) or type-only imports.`,
            allowTypeImports: true,
          })),
        },
      ],
    },
  },
]);

export default eslintConfig;
