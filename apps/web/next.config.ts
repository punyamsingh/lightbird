import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: ['@lightbird/core', '@lightbird/player-react', 'lucide-react'],
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
  webpack: (config, { isServer, webpack }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    if (!isServer) {
      config.output.globalObject = 'self';
      // WebTorrent (and its Node.js deps) reference `global`; polyfill it for browsers.
      config.plugins.push(
        new webpack.DefinePlugin({ global: 'globalThis' }),
      );
    }

    // Resolve workspace packages to source code so webpack can handle
    // Worker bundling (new URL(..., import.meta.url)) and "use client" directives
    // Subpaths must come before the bare specifier: webpack matches these keys
    // by prefix, so '@lightbird/core' alone would send '@lightbird/core/search'
    // to src/index.ts/search. Every subpath in the package's exports map needs
    // an entry here.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@lightbird/core/react': path.resolve(__dirname, '../../packages/lightbird/src/react/index.ts'),
      '@lightbird/core/search': path.resolve(__dirname, '../../packages/lightbird/src/search.ts'),
      '@lightbird/core': path.resolve(__dirname, '../../packages/lightbird/src/index.ts'),
      '@lightbird/player-react': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    };

    return config;
  },
};

export default nextConfig;
