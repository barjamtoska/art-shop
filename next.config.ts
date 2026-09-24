import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev badge sits over the artwork in screenshots used for design review.
  devIndicators: false,
  images: {
    // 90 is reserved for artworks, where compression artefacts are visible
    // in brushwork; everything else uses the default 75.
    qualities: [75, 90],
    localPatterns: [{ pathname: "/seed/**", search: "" }],
  },
};

export default nextConfig;
