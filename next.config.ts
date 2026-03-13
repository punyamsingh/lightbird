
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['lucide-react'],
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
      config.output.globalObject = 'self'; // required for Web Worker bundling (client only)
    }
    return config;
  },
};

export default nextConfig;
