import type { NextConfig } from "next";
import path from "node:path";

// The Expo client in ./mobile has its own package-lock.json. Pin the workspace
// root so Next does not treat the repository parent as a monorepo.
const root = __dirname;

const nextConfig: NextConfig = {
  turbopack: {
    root,
  },
  outputFileTracingRoot: root,
};

export default nextConfig;
