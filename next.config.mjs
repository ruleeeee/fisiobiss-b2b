/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Esto ayuda a Netlify a detectar mejor el despliegue
  output: 'standalone', 
};

export default nextConfig;