import Link from "next/link";
import { copy } from "@/config/copy";
import type { Artwork } from "@/lib/catalog/types";
import { formatDimensionsCm, formatDimensionsIn, formatPrice } from "@/lib/format";
import styles from "./Placard.module.css";

type Props = {
  artwork: Artwork;
  /** "wall" is the compact label under a hung work; "room" is the full label beside it. */
  variant?: "wall" | "room";
  /** When set, the title links to the artwork room. */
  href?: string;
  /** Stretch the title link over the nearest positioned ancestor (the hung work). */
  stretch?: boolean;
  className?: string;
};

export function Placard({ artwork, variant = "wall", href, stretch = false, className }: Props) {
  const { artist, title, yearLabel, mediumDescription, heightCm, widthCm, depthCm, status } = artwork;
  const room = variant === "room";
  const classes = [styles.placard, room && styles.room, className].filter(Boolean).join(" ");
  const titleText = <cite>{title}</cite>;

  return (
    <dl className={classes}>
      <dt className="sr-only">{copy.placard.artist}</dt>
      <dd className={styles.artist}>{artist.name}</dd>

      <dt className="sr-only">{copy.placard.title}</dt>
      <dd className={styles.title}>
        {href ? (
          <Link href={href} className={stretch ? `${styles.titleLink} ${styles.stretched}` : styles.titleLink}>
            {titleText}
          </Link>
        ) : (
          titleText
        )}
        , <span className={styles.year}>{yearLabel}</span>
      </dd>

      <dt className="sr-only">{copy.placard.medium}</dt>
      <dd className={room ? styles.meta : `${styles.meta} ${styles.inline}`}>{mediumDescription}</dd>

      <dt className="sr-only">{copy.placard.dimensions}</dt>
      <dd className={room ? styles.detail : styles.inline}>
        {formatDimensionsCm(heightCm, widthCm, depthCm)}
        {room && ` (${formatDimensionsIn(heightCm, widthCm, depthCm)})`}
      </dd>

      {room && artwork.inscription && (
        <>
          <dt className="sr-only">Inscription</dt>
          <dd className={styles.detail}>{artwork.inscription}</dd>
        </>
      )}
      {room && artwork.framingNote && (
        <>
          <dt className="sr-only">Framing</dt>
          <dd className={styles.detail}>{artwork.framingNote}</dd>
        </>
      )}

      {status === "AVAILABLE" ? (
        <>
          <dt className="sr-only">{copy.placard.price}</dt>
          <dd className={styles.price}>{formatPrice(artwork.priceCents)}</dd>
        </>
      ) : (
        <>
          <dt className="sr-only">{copy.placard.status}</dt>
          <dd className={styles.status}>
            {status === "SOLD" ? copy.placard.sold : room ? copy.placard.reserved : copy.placard.reservedShort}
          </dd>
        </>
      )}
    </dl>
  );
}
