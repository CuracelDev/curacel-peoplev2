/** @type {import('next').NextConfig} */
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

module.exports = (phase) => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    // Prevent `next build` from corrupting a running `next dev` by separating outputs.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    experimental: {
      serverComponentsExternalPackages: ['pg-boss'],
    },
  }

  return nextConfig
}
