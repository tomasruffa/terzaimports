/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.t3.storageapi.dev' },
      { protocol: 'https', hostname: 'terzaimports.com.ar' },
    ],
  },
  transpilePackages: ['@terza/shared'],
}

module.exports = nextConfig
