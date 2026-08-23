import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Los afiches de avisos pesan hasta 3 MB; el resto del FormData es texto.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
