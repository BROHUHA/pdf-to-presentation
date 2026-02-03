import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure fresh builds on each deployment
  generateBuildId: async () => {
    // Use timestamp to force new build ID each deployment
    return `build-${Date.now()}`;
  },

  // Headers for cache control
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
