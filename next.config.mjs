/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // astronomy-engine publishes an ESM entry whose package metadata does not
  // mark that file as ESM. Bundle it so Vercel never asks Node to load the
  // raw `esm/astronomy.js` file as CommonJS at runtime.
  transpilePackages: ["astronomy-engine"],
  serverExternalPackages: ["moment-timezone"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob:; " +
              "font-src 'self'; " +
              "connect-src 'self'; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self';",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        // Personal readings are private by construction: never cached by a
        // shared cache, never indexed, never archived. The route also sets
        // `robots` in its own metadata; this header is the belt to that brace
        // and is what a crawler sees even for a non-HTML response.
        source: "/reading/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
      {
        // The development readiness dashboard must never be indexed even if
        // it is deliberately enabled in an environment that is reachable.
        source: "/dev/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
