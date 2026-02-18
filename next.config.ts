import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure server-only packages don't leak into client bundles
  serverExternalPackages: [
    "@solana/web3.js",
    "@solana/spl-token",
    "@prisma/client",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node.js modules from being bundled on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
