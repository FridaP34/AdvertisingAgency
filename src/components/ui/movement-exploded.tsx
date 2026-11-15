"use client";

import { useRef, type PointerEvent } from "react";
import { cn } from "@/lib/cn";

/**
 * The hero picture: a photograph of an exploded watch movement that moves with
 * the pointer.
 *
 * The whole card drifts a few pixels toward the cursor and tilts a hair in
 * perspective; the photograph itself drifts the other way, and a veil of the
 * same shot — shifted and lit — sits on top, so the mechanism seems to come
 * apart as the hand passes over it. The movement is eased with a short
 * transition instead of a resting tilt, which keeps the edges crisp. Touch
 * pointers are ignored (a swipe still scrolls), and reduced-motion visitors
 * get the still photograph.
 */
export function MovementExploded({ className, alt }: { className?: string; alt: string }) {
  const frame = useRef<HTMLDivElement | null>(null);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // A finger dragging over a picture should scroll the page, not move it.
    if (event.pointerType !== "mouse") return;
    const node = frame.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5; // -0.5 … 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    node.style.setProperty("--mx", x.toFixed(3));
    node.style.setProperty("--my", y.toFixed(3));
  };

  const reset = () => {
    const node = frame.current;
    if (!node) return;
    node.style.setProperty("--mx", "0");
    node.style.setProperty("--my", "0");
  };

  return (
    <div
      ref={frame}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className={cn("movement-frame relative h-full w-full [perspective:1200px]", className)}
    >
      {/* Card: drifts toward the pointer and turns a shallow half-degree. */}
      <div className="movement-card absolute inset-0">
        {/* The photograph, cropped loose so the movement sits off-centre. */}
        <img
          src="/media/movement-exploded.jpg"
          alt={alt}
          className="movement-photo absolute inset-0 h-full w-full object-contain object-center p-[5%] lg:p-[7%]"
          draggable={false}
        />
      </div>

      {/* A second, brighter veil of the same shot that slides further than the
          photograph — no light layer on the picture: a glow around the pointer
          showed where the background of the image ends. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src="/media/movement-exploded.jpg"
          alt=""
          className="movement-veil absolute inset-0 h-full w-full object-contain object-center p-[5%] mix-blend-screen opacity-[0.28] lg:p-[7%]"
          draggable={false}
        />
      </div>

      {/* Vignette, so the photograph melts into the page instead of ending on a
          hard edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_56%,theme(colors.surface.base)_100%)]"
      />
    </div>
  );
}
