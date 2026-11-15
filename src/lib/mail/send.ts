import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { postJson } from "@/lib/http";

/**
 * Sending the contact message through Resend.
 *
 * Why this is not a plain `fetch`: on a filtered connection (NetFree and the
 * like) the certificate chain is reissued under the filter's own root. The
 * filter installs that root where the operating system looks for it, so
 * browsers and the Windows HTTP client accept it — but Node carries its own
 * bundle and refuses the connection. Nothing is loosened here: the message is
 * still sent over TLS to Resend, and the certificates are still verified —
 * only by the system store instead of Node's copy.
 *
 * Order of attempts:
 *  1. `fetch` — works on any normal host (production included).
 *  2. A request that trusts the operating system store (src/lib/http.ts).
 *  3. On Windows only: the same POST through PowerShell's HttpClient, which
 *     uses the system store. This path exists solely for the filtered local
 *     machine; elsewhere it is never reached.
 */

export type SendResult = { ok: true } | { ok: false; status: number; detail: string };

const RESEND_URL = "https://api.resend.com/emails";

/** Keeps the key out of the server log, whatever an error text echoes. */
function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join("re_***") : text;
}

type Message = {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
};

/** Sends through PowerShell's HttpClient (system certificate store). */
function postWithSystemClient(
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<SendResult> {
  return new Promise((resolve) => {
    // Written to a temporary .ps1 and run with -File: piped scripts through
    // -Command read their UTF-8 input in the console's codepage, and a Hebrew
    // subject would arrive mangled.
    const file = join(tmpdir(), `mindy-mail-${randomUUID()}.ps1`);

    // The body and headers travel as base64 in environment variables, so no
    // quoting or encoding step can mangle Hebrew text or the key.
    const script = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Net.Http
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$handler = [System.Net.Http.HttpClientHandler]::new()
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(25)
$bodyBytes = [byte[]][Convert]::FromBase64String($env:MAIL_BODY_B64)
$content = [System.Net.Http.ByteArrayContent]::new($bodyBytes)
# The request's own headers (the key goes here), then the body's type.
$headers = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:MAIL_HEADERS_B64)) | ConvertFrom-Json
foreach ($name in $headers.PSObject.Properties.Name) {
  if ($name -eq 'Content-Type') { continue }
  [void]$client.DefaultRequestHeaders.TryAddWithoutValidation($name, [string]$headers.$name)
}
$content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new([string]$headers.'Content-Type')
$response = $client.PostAsync($env:MAIL_URL, $content).GetAwaiter().GetResult()
$text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
Write-Output ([int]$response.StatusCode)
Write-Output '---BODY---'
Write-Output $text
`;

    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", file],
      {
        env: {
          ...process.env,
          MAIL_URL: url,
          MAIL_BODY_B64: Buffer.from(body, "utf8").toString("base64"),
          MAIL_HEADERS_B64: Buffer.from(JSON.stringify(headers), "utf8").toString("base64"),
        },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));

    const timer = setTimeout(() => child.kill(), 30_000);

    child.on("error", (error) => {
      clearTimeout(timer);
      removeFile();
      resolve({ ok: false, status: 0, detail: `powershell: ${error.message}` });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      removeFile();
      const [statusLine = "", , ...rest] = stdout.split(/\r?\n/);
      const status = Number.parseInt(statusLine.trim(), 10);
      const text = rest.join("\n").trim();
      if (code !== 0 || !Number.isFinite(status)) {
        resolve({ ok: false, status: 0, detail: stderr.trim() || text || `exit ${code}` });
        return;
      }
      resolve(
        status >= 200 && status < 300
          ? { ok: true }
          : { ok: false, status, detail: text || `HTTP ${status}` },
      );
    });

    const removeFile = () => {
      try {
        unlinkSync(file);
      } catch {
        // Already gone — nothing to do.
      }
    };

    try {
      writeFileSync(file, `﻿${script}`, "utf8");
    } catch (error) {
      clearTimeout(timer);
      resolve({ ok: false, status: 0, detail: `powershell: ${(error as Error).message}` });
      return;
    }
  });
}

export async function sendMessage(message: Message): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY ?? "";
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const body = JSON.stringify(message);

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) return { ok: true };
    const detail = await response.text().catch(() => "");
    // A 4xx answer is the server speaking — the connection was fine.
    if (response.status >= 400 && response.status < 500) {
      return { ok: false, status: response.status, detail };
    }
    console.error("[contact] Resend answered", response.status, detail);
  } catch (error) {
    console.error("[contact] fetch failed:", (error as Error).message);
  }

  try {
    const result = await postJson(RESEND_URL, headers, body);
    if (result.ok) return { ok: true };
    if (result.status >= 400 && result.status < 500) {
      return { ok: false, status: result.status, detail: result.body };
    }
    console.error("[contact] system-trust request answered", result.status, result.body);
  } catch (error) {
    console.error("[contact] system-trust request failed:", (error as Error).message);
  }

  if (process.platform === "win32") {
    const result = await postWithSystemClient(RESEND_URL, headers, body);
    if (result.ok) return result;
    console.error(
      "[contact] PowerShell request failed",
      result.status,
      redact(result.detail, apiKey),
    );
    return result;
  }

  return { ok: false, status: 0, detail: "network" };
}
