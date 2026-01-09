/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'static.nike.com',
            },
            {
                protocol: 'https',
                hostname: 'secure-static.vans.com.br',
            },
            {
                protocol: 'https',
                hostname: 'images.vans.com',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'imgnike-a.akamaihd.net',
            },
            {
                protocol: 'https',
                hostname: 'images.puma.com',
            },
        ],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
