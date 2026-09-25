"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { copy } from "@/config/copy";
import type { ArtworkImage } from "@/lib/catalog/types";

/*
 * "Inspect the brushwork": a full-screen, dark viewer for the high-resolution
 * image. Drag to pan, wheel or pinch to zoom around the pointer, keyboard
 * (+ − 0 arrows), double-click to toggle. The image never leaves the screen.
 */

const MAX_SCALE = 5;
const STEP = 1.6;

type View = { scale: number; x: number; y: number };
const INITIAL: View = { scale: 1, x: 0, y: 0 };

const ZoomContext = createContext<(() => void) | null>(null);

type Props = {
  image: ArtworkImage;
  /** URL of the largest available image. */
  zoomSrc: string;
  title: string;
  children: ReactNode;
};

export function ArtworkZoom({ image, zoomSrc, title, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);

  const open = useCallback(() => {
    setOpenCount((n) => n + 1);
    dialog.current?.showModal();
  }, []);

  return (
    <ZoomContext.Provider value={open}>
      {children}
      <dialog ref={dialog} className="zoom-dialog" aria-label={copy.zoom.label(title)}>
        {openCount > 0 && (
          <Viewer key={openCount} image={image} zoomSrc={zoomSrc} onClose={() => dialog.current?.close()} />
        )}
      </dialog>
    </ZoomContext.Provider>
  );
}

/** A visible trigger ("Inspect the brushwork"). */
export function ZoomButton({ className = "", children }: { className?: string; children: ReactNode }) {
  const open = useContext(ZoomContext);
  return (
    <button type="button" onClick={open ?? undefined} aria-haspopup="dialog" className={className}>
      {children}
    </button>
  );
}

/**
 * Makes the painting itself clickable with a zoom cursor. Pointer-only: the
 * keyboard route is the visible ZoomButton, so this adds no extra tab stop.
 */
export function ZoomSurface() {
  const open = useContext(ZoomContext);
  return <div aria-hidden="true" onClick={open ?? undefined} className="absolute inset-0 z-[4] cursor-zoom-in" />;
}

function Viewer({ image, zoomSrc, onClose }: { image: ArtworkImage; zoomSrc: string; onClose: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [view, setView] = useState<View>(INITIAL);
  const [gliding, setGliding] = useState(true);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);

  /** Keep the image covering the stage when zoomed, and centred when not. */
  const clampView = useCallback((v: View): View => {
    const s = stage.current;
    const i = img.current;
    if (!s || !i) return v;
    const maxX = Math.max(0, (i.offsetWidth * v.scale - s.clientWidth) / 2);
    const maxY = Math.max(0, (i.offsetHeight * v.scale - s.clientHeight) / 2);
    const clamp = (n: number, m: number) => Math.min(m, Math.max(-m, n));
    return { scale: v.scale, x: clamp(v.x, maxX), y: clamp(v.y, maxY) };
  }, []);

  /** Zoom so the point (px, py) — relative to the stage centre — stays under the pointer. */
  const zoomAt = useCallback(
    (nextScale: (s: number) => number, px = 0, py = 0) => {
      setView((v) => {
        const scale = Math.min(MAX_SCALE, Math.max(1, nextScale(v.scale)));
        const k = scale / v.scale;
        return clampView({ scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
      });
    },
    [clampView],
  );

  const fromCentre = (clientX: number, clientY: number) => {
    const rect = stage.current!.getBoundingClientRect();
    return { px: clientX - rect.left - rect.width / 2, py: clientY - rect.top - rect.height / 2 };
  };

  // Wheel zoom needs a non-passive listener so the page behind doesn't scroll.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setGliding(false);
      const { px, py } = fromCentre(e.clientX, e.clientY);
      zoomAt((s) => s * Math.exp(-e.deltaY * 0.0015), px, py);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGliding(false);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const { px, py } = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance;
      const target = pinch.current.scale * ratio;
      zoomAt(() => target, px, py);
    } else if (pointers.current.size === 1) {
      const dx = e.clientX - previous.x;
      const dy = e.clientY - previous.y;
      setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    setGliding(true);
    const { px, py } = fromCentre(e.clientX, e.clientY);
    zoomAt((s) => (s > 1.2 ? 1 : 2.5), px, py);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const pan = (dx: number, dy: number) => setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }));
    const actions: Record<string, () => void> = {
      "+": () => zoomAt((s) => s * STEP),
      "=": () => zoomAt((s) => s * STEP),
      "-": () => zoomAt((s) => s / STEP),
      "0": () => setView(INITIAL),
      ArrowLeft: () => pan(80, 0),
      ArrowRight: () => pan(-80, 0),
      ArrowUp: () => pan(0, 80),
      ArrowDown: () => pan(0, -80),
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      setGliding(true);
      action();
    }
  };

  const zoomed = view.scale > 1.01;
  const control =
    "min-w-11 px-3 py-2 font-caps text-label tracking-caps text-ivory-muted transition-colors duration-500 hover:text-ivory disabled:opacity-40";

  return (
    <div className="flex h-full flex-col" onKeyDown={onKeyDown}>
      <div className="flex items-center justify-end px-4 py-4 sm:px-8">
        <button type="button" onClick={onClose} className={control}>
          {copy.zoom.close}
        </button>
      </div>

      <div
        ref={stage}
        className={`relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden select-none ${
          zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <Image
          ref={img}
          src={zoomSrc}
          width={image.width}
          height={image.height}
          alt={image.alt}
          unoptimized
          draggable={false}
          placeholder={image.blurDataURL ? "blur" : "empty"}
          blurDataURL={image.blurDataURL}
          className="max-h-full max-w-full object-contain"
          style={{
            width: "auto",
            height: "auto",
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
            transition: gliding ? "transform 450ms var(--ease-gallery)" : "none",
            willChange: "transform",
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-2 px-4 py-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={control}
            aria-label={copy.zoom.zoomOut}
            disabled={!zoomed}
            onClick={() => (setGliding(true), zoomAt((s) => s / STEP))}
          >
            −
          </button>
          <span className="w-16 text-center text-placard text-ivory-muted tabular-nums" aria-live="polite">
            {Math.round(view.scale * 100)}%
          </span>
          <button
            type="button"
            className={control}
            aria-label={copy.zoom.zoomIn}
            disabled={view.scale >= MAX_SCALE}
            onClick={() => (setGliding(true), zoomAt((s) => s * STEP))}
          >
            +
          </button>
          <button
            type="button"
            className={control}
            disabled={!zoomed}
            onClick={() => (setGliding(true), setView(INITIAL))}
          >
            {copy.zoom.reset}
          </button>
        </div>
        <p className="text-placard text-ivory-muted">{copy.zoom.hint}</p>
      </div>
    </div>
  );
}
