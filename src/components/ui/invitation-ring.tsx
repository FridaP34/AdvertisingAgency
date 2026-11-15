"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The invitation, enclosed by a circle of soft rose light.
 *
 * There is no line at all — only one broad patch of diffused rose light, built
 * like the halo that gathers around the cursor as it moves, carried round a
 * large circle behind the text. It goes a little faster while the hand is on
 * it and settles again once the pointer leaves.
 * The text itself is untouched: the light is drawn behind it.
 *
 * The turn is written straight to the node in a frame loop, so it needs no
 * React re-render. Reduced-motion visitors get the still light.
 */
export function InvitationRing({ children }: { children: ReactNode }) {
  const ring = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ring.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const REST = 40; // degrees per second, when left alone
    const QUICK = 110; // while the hand is on it

    let turn = 0;
    let speed = REST;
    let previous = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      turn = (turn + speed * dt) % 360;
      node.style.setProperty("--ring-turn", `${turn.toFixed(2)}deg`);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    // The hand on the text quickens the light; letting go lets it settle.
    let quick = false;
    const quicken = () => {
      quick = true;
    };
    const settle = () => {
      quick = false;
    };
    const speedWatch = window.setInterval(() => {
      const target = quick ? QUICK : REST;
      speed += (target - speed) * 0.08;
    }, 50);

    node.addEventListener("pointerenter", quicken);
    node.addEventListener("pointerleave", settle);

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(speedWatch);
      node.removeEventListener("pointerenter", quicken);
      node.removeEventListener("pointerleave", settle);
    };
  }, []);

  return (
    <div className="invitation-ring">
      <div ref={ring} aria-hidden className="invitation-ring__light" />
      <div className="invitation-ring__frame">{children}</div>
    </div>
  );
}
