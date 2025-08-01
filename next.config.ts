
import type {NextConfig} from 'next';
import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';

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
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    
    if (!isServer) {
        config.plugins = config.plugins || [];
        config.plugins.push(
            new CopyPlugin({
                patterns: [
                    {
                        from: path.join(path.dirname(require.resolve('@ffmpeg/core/package.json')), 'dist/umd'),
                        to: path.join(__dirname, 'public/vendor/ffmpeg'),
                    },
                ],
            })
        );
    }
    
    return config;
  },
};

export default nextConfig;
