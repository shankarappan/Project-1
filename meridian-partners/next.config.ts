import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    // Isolate this app from the parent Lets Split lockfile/workspace
    root: appRoot,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
