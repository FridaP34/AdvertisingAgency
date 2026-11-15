"use client";

import { useRef, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { cn } from "@/lib/cn";
import { site } from "@/content/site";

/**
 * The turning wheel at the end of the opening.
 *
 * One polished brass wheel, drawn in line — a ring of teeth, an inset ring,
 * spokes and a turned hub — turned by the pointer and, after the hand lets go,
 * slowing down to rest. A smaller wheel turns against it, teeth for teeth, and
 * light runs around the rim as it moves: the only thing that shows the wheel is
 * alive.
 *
 * The turn follows the angle of the hand around the centre, so it feels like
 * turning a dial rather than swiping it. Movement is gentle: softly weighted,
 * slowed at the edges. A finger keeps scrolling (touch-pan-y) and reduced-motion
 * visitors get the still wheel.
 */

/** Teeth of each wheel — the driven one turns in the inverse of the ratio. */
const MAIN_TEETH = 48;
const DRIVEN_TEETH = 18;

export function WatchDial({ className }: { className?: string }) {
  const angle = useRef(0);
  const velocity = useRef(0); // degrees per second
  const gliding = useRef(false);
  const lastAngle = useRef<number | null>(null);
  const spin = useRef<HTMLDivElement | null>(null);
  const dial = useRef<HTMLDivElement | null>(null);

  const paint = (turn: number) => {
    const node = spin.current;
    if (!node) return;
    node.style.transform = `rotate(${turn.toFixed(2)}deg)`;
    node.style.setProperty("--wheel", `${turn.toFixed(2)}deg`);
  };

  /**
   * Gives the wheel a turn and lets it glide to a stop. The loop ends itself
   * once the wheel settles, so nothing keeps running in the background.
   */
  const turnBy = (degrees: number) => {
    angle.current += degrees;
    paint(angle.current);
    if (gliding.current || typeof requestAnimationFrame === "undefined") return;

    gliding.current = true;
    let previous = performance.now();
    const glide = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      // Slow friction: the wheel keeps most of its way for a second or so.
      velocity.current *= Math.pow(0.3, dt);
      if (Math.abs(velocity.current) < 3) {
        velocity.current = 0;
        gliding.current = false;
        return;
      }
      angle.current += velocity.current * dt;
      paint(angle.current);
      requestAnimationFrame(glide);
    };
    requestAnimationFrame(glide);
  };

  /** The bearing of the pointer from the wheel's centre, in degrees. */
  const bearing = (event: PointerEvent<HTMLDivElement>) => {
    const node = spin.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    lastAngle.current = bearing(event);
    velocity.current = 0;
    dial.current?.focus();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const from = lastAngle.current;
    if (from === null) return;
    const to = bearing(event);
    if (to === null) return;
    // Wrap across the seam at ±180°, so a hand passing it does not jump a turn.
    let delta = to - from;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastAngle.current = to;
    // The hand must move a fair way before the wheel answers: no twitch.
    const degrees = delta * 0.42;
    velocity.current = degrees * 9;
    angle.current += degrees;
    paint(angle.current);
  };

  const release = () => {
    lastAngle.current = null;
    turnBy(0); // start the glide from the last velocity
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    // RTL reading: the left key turns the wheel forward.
    velocity.current = event.key === "ArrowLeft" ? 160 : -160;
    turnBy(event.key === "ArrowLeft" ? 45 : -45);
  };

  // A small nudge per notch — never a full-screen capture, so the page still scrolls.
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    velocity.current = 0;
    turnBy(event.deltaY > 0 ? 9 : -9);
  };

  return (
    <div className={cn("relative select-none", className)}>
      <div
        ref={dial}
        role="img"
        aria-label={site.prologue.dialLabel}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerLeave={release}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        className="group relative mx-auto aspect-square w-full max-w-[min(420px,100%)] cursor-grab touch-pan-y outline-none focus-visible:ring-1 focus-visible:ring-accent/50 active:cursor-grabbing"
      >
        <div ref={spin} className="watch-spin absolute inset-0">
          <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible" fill="none">
            <defs>
              <radialGradient id="wheel-fill" cx="50%" cy="38%" r="66%">
                <stop offset="0%" stopColor="#241a1c" />
                <stop offset="65%" stopColor="#140f11" />
                <stop offset="100%" stopColor="#0b0b0c" />
              </radialGradient>
              <radialGradient id="wheel-glow" cx="50%" cy="42%" r="55%">
                <stop offset="0%" stopColor="#c7867a" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#c7867a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="wheel-brass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e2b3a6" />
                <stop offset="100%" stopColor="#a3655a" />
              </linearGradient>
            </defs>

            {/* The plate the wheel sits on: a soft pool of warm light. */}
            <circle cx="200" cy="200" r="196" fill="url(#wheel-glow)" />

            {/* The main wheel, drawn around (0,0) and moved to the centre. */}
            <g transform="translate(200 200)" id="wheel-main">
              {Array.from({ length: MAIN_TEETH }, (_, i) => (
                <path
                  key={i}
                  d="M-3.2 -150 H3.2 L2.2 -138 H-2.2 Z"
                  transform={`rotate(${(360 / MAIN_TEETH) * i})`}
                  fill="none"
                  stroke="url(#wheel-brass)"
                  strokeWidth="1.15"
                />
              ))}
              <circle r="138" fill="url(#wheel-fill)" stroke="url(#wheel-brass)" strokeWidth="1.15" />
              <circle r="128" fill="none" stroke="rgba(226,179,166,0.28)" strokeWidth="0.7" />
              <circle r="112" fill="none" stroke="rgba(226,179,166,0.14)" strokeWidth="0.7" />
              {/* Spokes: six, cut from the hub to the inner ring. */}
              {Array.from({ length: 6 }, (_, i) => (
                <g key={i} transform={`rotate(${60 * i + 30})`}>
                  <path
                    d="M-5 -20 V-112 H5 V-20"
                    fill="none"
                    stroke="url(#wheel-brass)"
                    strokeWidth="1"
                  />
                </g>
              ))}
              {/* The turned hub, seen from the side: three fine rings. */}
              <circle r="30" fill="url(#wheel-fill)" stroke="url(#wheel-brass)" strokeWidth="1.1" />
              <circle r="21" fill="none" stroke="rgba(226,179,166,0.5)" strokeWidth="0.7" />
              <circle r="12" fill="none" stroke="rgba(226,179,166,0.35)" strokeWidth="0.7" />
              <circle r="4" fill="#c7867a" />
            </g>

            {/* The driven wheel: held against the rim, its centre touching the
                main wheel's. It turns the other way, in the ratio of teeth. */}
            <g transform="translate(296 252)" id="wheel-driven">
              {Array.from({ length: DRIVEN_TEETH }, (_, i) => (
                <path
                  key={i}
                  d="M-2.4 -66 H2.4 L1.6 -56 H-1.6 Z"
                  transform={`rotate(${(360 / DRIVEN_TEETH) * i})`}
                  fill="none"
                  stroke="url(#wheel-brass)"
                  strokeWidth="1.05"
                />
              ))}
              <circle r="56" fill="url(#wheel-fill)" stroke="url(#wheel-brass)" strokeWidth="1.05" />
              <circle r="47" fill="none" stroke="rgba(226,179,166,0.22)" strokeWidth="0.6" />
              {Array.from({ length: 4 }, (_, i) => (
                <path
                  key={i}
                  d="M-3.5 -14 V-47 H3.5 V-14"
                  transform={`rotate(${90 * i + 45})`}
                  fill="none"
                  stroke="url(#wheel-brass)"
                  strokeWidth="0.9"
                />
              ))}
              <circle r="15" fill="url(#wheel-fill)" stroke="url(#wheel-brass)" strokeWidth="1" />
              <circle r="3" fill="#c7867a" />
            </g>
          </svg>
        </div>

        {/* The light that runs around the rim — it moves with the wheel. */}
        <div aria-hidden className="wheel-rim pointer-events-none absolute inset-0 rounded-full" />
      </div>
    </div>
  );
}
