import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Habilita el entorno Cloudflare en desarrollo local
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
