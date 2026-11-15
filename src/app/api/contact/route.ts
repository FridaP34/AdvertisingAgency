import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/mail/send";

/**
 * Contact form endpoint.
 *
 * Delivery is intentionally pluggable: set RESEND_API_KEY and CONTACT_TO_EMAIL
 * in the environment and the submission is mailed out through Resend.
 * Without those variables the request is rejected rather than silently lost,
 * so the form never tells a visitor "sent" when nothing was delivered.
 */

type Payload = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  website?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  // Honeypot: a filled "website" field means a bot.
  if (body.website) return NextResponse.json({ ok: true });

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (name.length < 2) {
    return NextResponse.json({ error: "נא למלא שם" }, { status: 422 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "כתובת הדואר אינה תקינה" }, { status: 422 });
  }
  if (message.length < 5) {
    return NextResponse.json({ error: "נא לכתוב הודעה" }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL ?? "onboarding@resend.dev";

  if (!apiKey || !to) {
    console.error("[contact] RESEND_API_KEY / CONTACT_TO_EMAIL are not configured");
    return NextResponse.json({ error: "שליחת ההודעות אינה מוגדרת עדיין" }, { status: 503 });
  }

  const result = await sendMessage({
    from,
    to: [to],
    reply_to: email,
    subject: `פנייה חדשה מהאתר — ${name}`,
    text: [
      `שם: ${name}`,
      `דואר: ${email}`,
      phone ? `טלפון: ${phone}` : null,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      console.error("[contact] Resend rejected the key", result.status, result.detail);
      return NextResponse.json(
        { error: "ההגדרות לשליחת ההודעות אינן תקינות" },
        { status: 502 },
      );
    }
    console.error("[contact] send failed", result.status, result.detail);
    return NextResponse.json({ error: "שליחת ההודעה נכשלה, נסו שוב" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
