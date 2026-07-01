/** @type {import('next').NextConfig} */
const productionApiUrl = 'https://terzaapi-production.up.railway.app'

const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.VERCEL ? productionApiUrl : 'http://localhost:4000'),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  transpilePackages: ['@terza/shared'],
}

module.exports = nextConfig
