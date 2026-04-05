import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@lightbird/core', '@lightbird/ui', 'lucide-react'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    if (!isServer) {
      config.output.globalObject = 'self';
    }

    // Resolve workspace packages to source code so webpack can handle
    // Worker bundling (new URL(..., import.meta.url)) and "use client" directives
    config.resolve.alias = {
      ...config.resolve.alias,
      '@lightbird/core/react': path.resolve(__dirname, '../../packages/lightbird/src/react/index.ts'),
      '@lightbird/core': path.resolve(__dirname, '../../packages/lightbird/src/index.ts'),
      '@lightbird/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    };

    return config;
  },
};

export default nextConfig;
