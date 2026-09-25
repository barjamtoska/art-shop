import type { Artwork } from "@/lib/catalog/types";
import { hangSize } from "@/lib/hang";
import { FramedArtwork } from "./FramedArtwork";
import { Placard } from "./Placard";
import styles from "./Hang.module.css";

type Props = {
  works: Artwork[];
  /** Smaller works and tighter spacing, e.g. "Also in the collection". */
  compact?: boolean;
  /** Accessible name for the list of works. */
  label: string;
};

/** Framed, lit works hung on the wall, each with its label and a link to its room. */
export function Hang({ works, compact = false, label }: Props) {
  return (
    <ul className={compact ? `${styles.hang} ${styles.compact}` : styles.hang} aria-label={label}>
      {works.map((artwork) => {
        const size = hangSize(artwork.widthCm, artwork.heightCm, compact ? 0.72 : 1);
        return (
          <li key={artwork.slug} className={styles.item} style={{ width: size.width }} data-hover-light="">
            <FramedArtwork image={artwork.image} frameStyle={artwork.frameStyle} sizes={size.sizes} />
            <div className={styles.label}>
              <Placard artwork={artwork} href={`/collection/${artwork.slug}`} stretch />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
