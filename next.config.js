/** @type {import('next').NextConfig} */
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

module.exports = (phase) => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    // Prevent `next build` from corrupting a running `next dev` by separating outputs.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    // Required for Docker deployment
    output: 'standalone',
    experimental: {
      serverComponentsExternalPackages: ['pg-boss'],
      instrumentationHook: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    async redirects() {
      return [
        {
          source: '/recruiting/:path*',
          destination: '/hiring/:path*',
          permanent: true,
        },
      ]
    },
  }

  return nextConfig
}
