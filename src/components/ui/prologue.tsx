import { site } from "@/content/site";
import { InvitationRing } from "./invitation-ring";
import { Reveal } from "./reveal";
import { WatchDial } from "./watch-dial";

/**
 * The second page of the opening: a clean sheet, one centred column, the story
 * set small and even in the square type — exactly the lines as written, nothing
 * merged, nothing emphasised. The wheel closes it, under its invitation.
 */
export function Prologue() {
  const { prologue } = site;

  const lineClass =
    "text-[clamp(1.05rem,1.55vw,1.35rem)] font-medium leading-[1.95] tracking-[0.005em]";

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden border-b border-line py-24 sm:py-28">
      <div className="container-page relative">
        <div className="mx-auto flex max-w-[min(560px,100%)] flex-col items-center text-center">
          <div className="flex flex-col">
            {prologue.lines.map((line, index) => (
              <Reveal key={line} delay={index * 70}>
                <p className={`${lineClass} text-ink`}>{line}</p>
              </Reveal>
            ))}
          </div>

          {/* A breath between the two halves of the story. */}
          <div aria-hidden className="h-14 sm:h-16" />

          <div className="flex flex-col">
            {prologue.results.map((line, index) => (
              <Reveal key={line} delay={index * 90}>
                <p
                  className={`${lineClass} ${
                    index === prologue.results.length - 1 ? "text-ink-dim" : "text-ink"
                  }`}
                >
                  {line}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** The third page: the invitation, and the wheel it asks you to turn. */
export function DialSection() {
  const { prologue } = site;

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden border-b border-line py-24 sm:py-28">
      <div className="container-page relative">
        <div className="mx-auto flex max-w-[560px] flex-col items-center text-center">
          <Reveal>
            <InvitationRing>
              <div dir="rtl" className="flex flex-col gap-2">
                {prologue.invitation.map((line, index) => (
                  <p
                    key={line}
                    className={
                      index === 0
                        ? "text-[clamp(1.5rem,2.8vw,2.1rem)] font-bold leading-[1.4] text-ink"
                        : "text-[clamp(1.2rem,2.1vw,1.55rem)] font-medium leading-[1.5] text-accent"
                    }
                  >
                    {line}
                  </p>
                ))}
              </div>
            </InvitationRing>
          </Reveal>

          <Reveal delay={140}>
            <div className="mx-auto mt-12 w-full max-w-[min(420px,84vw)]">
              <WatchDial />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
