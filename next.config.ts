import type { NextConfig } from "next";

const cloudinaryCloud = process.env.CLOUDINARY_CLOUD_NAME;

const nextConfig: NextConfig = {
  // The dev badge sits over the artwork in screenshots used for design review.
  devIndicators: false,
  images: {
    // 90 is reserved for artworks, where compression artefacts are visible
    // in brushwork; everything else uses the default 75.
    qualities: [75, 90],
    localPatterns: [
      { pathname: "/seed/**", search: "" },
      // Development uploads, when Cloudinary is not configured.
      { pathname: "/uploads/**", search: "" },
    ],
    // Only this site's own Cloudinary account.
    remotePatterns: cloudinaryCloud
      ? [{ protocol: "https", hostname: "res.cloudinary.com", pathname: `/${cloudinaryCloud}/image/upload/**` }]
      : [],
  },
};

export default nextConfig;
