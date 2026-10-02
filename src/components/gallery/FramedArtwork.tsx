import Image from "next/image";
import type { ArtworkImage, FrameStyle } from "@/lib/catalog/types";
import styles from "./FramedArtwork.module.css";

type Props = {
  /** Omit for an empty frame (the wall shows through the mat). */
  image?: ArtworkImage;
  /** Aspect ratio (width / height) of the opening when the frame is empty. */
  emptyAspectRatio?: number;
  frameStyle?: FrameStyle;
  /** Controls spotlight strength; "hero" is used for the Entrance and the artwork room. */
  size?: "hero" | "wall" | "thumb";
  /** `sizes` for the painting's responsive srcset — describe the painting's rendered width. */
  sizes?: string;
  /** Preload the image (only for the single LCP painting on a page). */
  preload?: boolean;
  /** Set when the work is not inside a link but should still respond to hover. */
  interactive?: boolean;
  /** Turn off the wall spotlight (e.g. tiny thumbnails in admin). */
  unlit?: boolean;
  className?: string;
};

/**
 * A painting in a gilded frame with an ivory mat, under a warm spotlight.
 * The component fills the width of its parent; the parent decides the size.
 */
export function FramedArtwork({
  image,
  emptyAspectRatio = 0.8,
  frameStyle = "CLASSIC",
  size = "wall",
  sizes = "100vw",
  preload = false,
  interactive = false,
  unlit = false,
  className,
}: Props) {
  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      data-size={size}
      data-reveal={unlit ? undefined : ""}
      data-interactive={interactive ? "" : undefined}
      // LightsController sets data-lit, sometimes before a streamed part of
      // the page hydrates; that attribute belongs to the client.
      suppressHydrationWarning
    >
      {!unlit && <span className={styles.spot} aria-hidden="true" />}
      <div className={styles.frame} data-style={frameStyle === "SLIM" ? "slim" : "classic"}>
        <span className={`${styles.rail} ${styles.top}`} aria-hidden="true" />
        <span className={`${styles.rail} ${styles.right}`} aria-hidden="true" />
        <span className={`${styles.rail} ${styles.bottom}`} aria-hidden="true" />
        <span className={`${styles.rail} ${styles.left}`} aria-hidden="true" />
        <div className={styles.mat}>
          <div className={styles.opening}>
            {image ? (
              <Image
                className={styles.painting}
                src={image.src}
                width={image.width}
                height={image.height}
                alt={image.alt}
                sizes={sizes}
                quality={90}
                preload={preload}
                // Ahead of the fonts: on a slow connection the painting comes first.
                fetchPriority={preload ? "high" : undefined}
                placeholder={image.blurDataURL ? "blur" : "empty"}
                blurDataURL={image.blurDataURL}
              />
            ) : (
              <div className={styles.void} style={{ aspectRatio: emptyAspectRatio }} />
            )}
          </div>
        </div>
        {!unlit && <span className={styles.shade} aria-hidden="true" />}
      </div>
    </div>
  );
}
