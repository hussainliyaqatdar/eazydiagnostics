/** @type {import('next').NextConfig} */
const nextConfig = {
  // The site map can't live at /index itself: the App Router treats that path
  // as the home page (a folder named "index" errors, and a rewrite to it is
  // shown as the home page after the page loads). So the page is /site-index,
  // and /index sends people there.
  async redirects() {
    return [{ source: "/index", destination: "/site-index", permanent: false }];
  },
};
module.exports = nextConfig;
