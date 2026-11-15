import https from "node:https";
import { X509Certificate } from "node:crypto";

/**
 * An HTTPS POST that trusts the machine's own certificate roots.
 *
 * On a filtered connection (NetFree and the like) the certificate chain is
 * reissued under the filter's own root. The filter installs that root in the
 * operating system, and every browser trusts it — but Node trusts only the
 * roots it ships with, so its own `fetch` refuses the very connections the
 * browser accepts. On the live host the operating system roots are the only
 * ones used; nothing here loosens that.
 *
 * The body is returned as text, and only a 2xx answer is settled as success.
 */

/** Splits PEM text into single certificates. */
function splitPem(pem: string): string[] {
  return pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
}

/** Drops entries that do not parse — one bad root would fail the handshake. */
function usableRoots(pems: string[]): string[] {
  return pems.filter((pem) => {
    try {
      new X509Certificate(pem);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * The roots to trust: the operating system's own store (Node 22.15 and later
 * can read it), plus an optional extra bundle named by `CA_BUNDLE_FILE` — a
 * chain the system store does not hold, copied into the project by hand.
 */
let cachedCA: string[] | null = null;

async function trustedCA(): Promise<string[]> {
  if (cachedCA) return cachedCA;

  // Typed locally: the project's `@types/node` predates `getCACertificates`.
  type CertStore = (type?: "default" | "system" | "bundled") => string[];
  const tls = await import("node:tls");
  const readStore = (tls as unknown as { getCACertificates?: CertStore }).getCACertificates;
  const system = typeof readStore === "function" ? readStore("system") : [];

  let extra: string[] = [];
  const bundle = process.env.CA_BUNDLE_FILE;
  if (bundle) {
    try {
      const { readFile } = await import("node:fs/promises");
      extra = splitPem(await readFile(bundle, "utf8"));
    } catch {
      // A missing bundle is not fatal: the system store still applies.
    }
  }

  cachedCA = usableRoots([...system, ...extra]);
  return cachedCA;
}

export type PostResult = { ok: boolean; status: number; body: string };

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<PostResult> {
  const ca = await trustedCA();
  const target = new URL(url);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
        // An empty list is never passed: that would trust everything.
        ...(ca.length ? { ca } : {}),
        timeout: 20_000,
      },
      (response) => {
        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          text += chunk;
        });
        response.on("end", () => {
          const status = response.statusCode ?? 0;
          resolve({ ok: status >= 200 && status < 300, status, body: text });
        });
      },
    );

    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", reject);
    request.end(body);
  });
}
