"use client";

import { useMemo } from "react";
import Image from "next/image";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

type Client = (typeof site.clients.names)[number];

const ROWS = 3;

/** Spread the clients over `ROWS` rows in order, so no name is repeated. */
function splitRows(clients: Client[]): Client[][] {
  const rows: Client[][] = Array.from({ length: ROWS }, () => []);
  clients.forEach((client, index) => rows[index % ROWS].push(client));
  return rows;
}

/**
 * The "built with us" wall: three rows of names, still and settled — a wall,
 * not a ticker. The name under the cursor is answered with a rose light
 * around it; there is no frame around any name.
 *
 * Three rows is a rule, not a preference: the rows share the width evenly and
 * never wrap, so a long name is cut with an ellipsis rather than opening a
 * fourth line and taking height the section does not have to spare.
 *
 * A real logo will drop in without a change here: add `logo` to that client in
 * `site.clients.names` and the mark is drawn in place of the name.
 */
export function ClientWall({ className }: { className?: string }) {
  const clients = site.clients.names;
  const rows = useMemo(() => splitRows(clients), [clients]);

  if (clients.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-col">
        {/* Three rows only: a name too wide for the row is cut with an
            ellipsis rather than pushed to a fourth line. */}
        {rows.map((row, index) => (
          <ul
            key={index}
            className="flex items-stretch justify-center gap-1.5 py-1.5 sm:gap-2 sm:py-2"
          >
            {row.map((client) => (
              <ClientItem key={client.name} client={client} />
            ))}
          </ul>
        ))}
      </div>

      <p className="mt-5 text-center text-[0.78rem] tracking-[0.2em] text-ink-faint">
        {site.clients.more}
      </p>
    </div>
  );
}

function ClientItem({ client }: { client: Client }) {
  return (
    <li className="min-w-0 flex-1 basis-0">
      {/* The three rows share the width evenly; the pill may narrow, the name
          inside it is cut with an ellipsis instead of wrapping to a new line. */}
      <span className="group relative flex h-[2.9rem] w-full items-center justify-center px-1.5 text-center sm:h-[3.2rem] sm:px-2">
        {/* Rose light around the name under the cursor — light only, no frame. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 ease-smooth [background:radial-gradient(ellipse_at_center,rgba(199,134,122,0.28),rgba(199,134,122,0.1)_55%,transparent_75%)] group-hover:opacity-100"
        />

        <span className="relative z-10 flex w-full min-w-0 flex-col items-center">
          {client.logo ? (
            <Image
              src={client.logo}
              alt={client.name}
              width={220}
              height={80}
              sizes="200px"
              className="h-auto max-h-6 w-auto max-w-full object-contain brightness-0 invert opacity-80 transition-opacity duration-500 group-hover:opacity-100"
            />
          ) : (
            <span className="block max-w-full truncate text-[0.86rem] font-bold leading-tight tracking-[0.04em] text-white transition-colors duration-300 group-hover:text-accent sm:text-[0.94rem]">
              {client.name}
            </span>
          )}
          {client.field ? (
            <span className="mt-0.5 block max-w-full truncate text-[0.58rem] tracking-[0.14em] text-ink-faint">
              {client.field}
            </span>
          ) : null}
        </span>
      </span>
    </li>
  );
}
