"use client";

import { useEffect, useRef } from "react";

/**
 * A soft rose light that follows the cursor across the whole page.
 *
 * The light is drawn by `.rose-glow` in globals.css from two custom properties;
 * this component only supplies them. The pointer position is eased toward its
 * target on every frame, so the halo trails the hand by a moment instead of
 * snapping to it. Mouse only: touch devices and reduced-motion visitors never
 * see it (both the CSS and this listener opt out). Over the hero photograph
 * the light fades away, so it never brightens the picture's background and
 * never reveals where the image ends.
 */
export function RoseGlow() {
  const layer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = layer.current;
    if (!node) return;

    // Touch devices and reduced-motion visitors never get the light. A device
    // that reports no hover at all (some desktops behind certain settings)
    // still gets it, as long as the pointer is a mouse — the moves themselves
    // are filtered to mouse pointers below.
    const fine = window.matchMedia("(pointer: fine)");
    const hover = window.matchMedia("(hover: hover)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches || !(fine.matches || hover.matches)) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let shown = false;
    let frame = 0;

    // The hero photograph is measured on resize and on scroll (its rectangle
    // moves with the page), never on every pointer move.
    let photo: DOMRect | null = null;
    const measure = () => {
      const element = document.querySelector<HTMLElement>("[data-rose-glow-off]");
      photo = element ? element.getBoundingClientRect() : null;
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });

    /** True while the spot the light is drawn at is over the hero photograph. */
    const overPhoto = () =>
      photo !== null && x >= photo.left && x <= photo.right && y >= photo.top && y <= photo.bottom;

    const apply = () => {
      // The halo only rests where a mouse is: a keyboard-only visit never
      // shows it, and it appears from the first mouse move.
      node.style.display = "block";
    };

    const paint = () => {
      node.style.setProperty("--glow-x", `${x.toFixed(1)}px`);
      node.style.setProperty("--glow-y", `${y.toFixed(1)}px`);
    };

    // Start from the light hidden and park the halo in the middle; the first
    // mouse move shows it under the hand (see `onMove`).
    node.style.setProperty("--glow", "0");
    paint();

    const step = () => {
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      paint();
      // The halo is hidden once it reaches the photograph, and shown again
      // once it has left it — decided at the spot it is drawn at, so it fades
      // as it slides in rather than cutting out under a hand that has already
      // moved on.
      node.style.setProperty("--glow", overPhoto() ? "0" : "1");

      if (Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5) {
        frame = requestAnimationFrame(step);
      } else {
        frame = 0;
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      targetX = event.clientX;
      targetY = event.clientY;
      // The frame loop reads the hand's new place and decides the halo's
      // visibility at the spot it is drawn at (see `step`).
      if (!shown) {
        // The first sight of the light starts under the hand, without a sprint.
        shown = true;
        x = targetX;
        y = targetY;
        paint();
        // Let one frame land on the new spot before the fade-in begins.
        requestAnimationFrame(() => {
          apply();
          // Shown only after the spot is known: a hand entering straight over
          // the photograph must not bring the light up on it for a moment.
          node.style.setProperty("--glow", overPhoto() ? "0" : "1");
        });
      }
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onLeave = () => node.style.setProperty("--glow", "0");
    const onEnter = () => {
      if (!shown) return;
      // The hand may come back somewhere other than where it left; the halo
      // moves there now, so its visibility is judged at the new spot.
      x = targetX;
      y = targetY;
      paint();
      apply();
      node.style.setProperty("--glow", overPhoto() ? "0" : "1");
    };
    document.addEventListener("pointerenter", onEnter);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={layer} aria-hidden className="rose-glow" />;
}
