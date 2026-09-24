import Image from "next/image";
import type { ArtworkImage, FrameStyle } from "@/lib/catalog/types";
import styles from "./FramedArtwork.module.css";

type Props = {
  image: ArtworkImage;
  frameStyle?: FrameStyle;
  /** Controls spotlight strength; "hero" is used for the Entrance and the artwork room. */
  size?: "hero" | "wall" | "thumb";
  /** `sizes` for the painting's responsive srcset — describe the painting's rendered width. */
  sizes: string;
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
  frameStyle = "CLASSIC",
  size = "wall",
  sizes,
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
    >
      {!unlit && <span className={styles.spot} aria-hidden="true" />}
      <div className={styles.frame} data-style={frameStyle === "SLIM" ? "slim" : "classic"}>
        <span className={`${styles.rail} ${styles.top}`} aria-hidden="true" />
        <span className={`${styles.rail} ${styles.right}`} aria-hidden="true" />
        <span className={`${styles.rail} ${styles.bottom}`} aria-hidden="true" />
        <span className={`${styles.rail} ${styles.left}`} aria-hidden="true" />
        <div className={styles.mat}>
          <div className={styles.opening}>
            <Image
              className={styles.painting}
              src={image.src}
              width={image.width}
              height={image.height}
              alt={image.alt}
              sizes={sizes}
              quality={90}
              preload={preload}
              placeholder={image.blurDataURL ? "blur" : "empty"}
              blurDataURL={image.blurDataURL}
            />
          </div>
        </div>
        {!unlit && <span className={styles.shade} aria-hidden="true" />}
      </div>
    </div>
  );
}
