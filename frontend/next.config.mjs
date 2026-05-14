/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // typescript.ignoreBuildErrors removed — fail fast on type errors in CI.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    // Security headers applied to every non-embed route. The embed routes
    // (/api/v1/*) intentionally allow framing because that's their purpose.
    return [
      {
        source: '/((?!api/v1).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}
export default nextConfig
