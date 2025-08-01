
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
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };

    // This is required to make ffmpeg.wasm work.
    // It makes sure that the worker files are copied to the public folder.
    config.module.rules.push({
      test: /ffmpeg.*\.js$/,
      loader: 'file-loader',
      options: {
        name: 'static/media/[name].[hash].[ext]',
      },
    });

    return config;
  },
};

export default nextConfig;
