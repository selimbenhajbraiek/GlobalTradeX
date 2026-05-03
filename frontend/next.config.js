/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["react-leaflet", "leaflet"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  /**
   * Next.js dev (Webpack) uses `eval` for Fast Refresh / source maps. Without
   * `script-src 'unsafe-eval'`, Chrome logs CSP violations and some tooling breaks.
   * This header is applied only in development. Production builds should not rely
   * on unsafe-eval; we omit this in production.
   */
  async headers() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    const devCsp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' blob: data: https:",
      "font-src 'self' https: data:",
      "connect-src 'self' http://127.0.0.1:* http://localhost:* ws: wss: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: devCsp }],
      },
    ];
  },
};

module.exports = nextConfig;
