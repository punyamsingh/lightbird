
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
        {
            source: '/:path*',
            headers: [
                {
                    key: 'Cross-Origin-Opener-Policy',
                    value: 'same-origin',
                },
                {
                    key: 'Cross-Origin-Embedder-Policy',
                    value: 'require-corp',
                },
            ],
        },
    ];
  },
  webpack: (config, { isServer }) => {
    // Fix for ffmpeg.wasm
    config.output.webassemblyModuleFilename = isServer
      ? '../static/wasm/[modulehash].wasm'
      : 'static/wasm/[modulehash].wasm';
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true, topLevelAwait: true };
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });
    return config
  },
};

export default nextConfig;
