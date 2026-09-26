import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The digest preview moved into Settings ("Today's email"). Redirected here,
  // before any rendering, rather than from a page: under the signed-in area's
  // loading screen a page redirect would stream a 200 and redirect in the browser.
  async redirects() {
    return [{ source: "/digest", destination: "/settings#email-preview", permanent: false }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
