// The demo's limits and input guards. They live apart from worker.mjs because a Worker entry module may only
// export handlers; tests import them from here.

export const MAX_PAGES = 5; // hard cap: a client value above this is ignored
export const MIN_CREDITS = 100; // refuse to start below this many credits left
// Exported so tests can shorten the batch wait.
export const limits = { pollIntervalMs: 2000, timeoutMs: 60_000 };

// ---------------------------------------------------------------- input guard

// Returns { site, host } for a public http(s) site, else { error }. Spicrawl also blocks private
// targets (ERR::SECURITY::SSRF_BLOCKED); this keeps them from ever costing a request.
export function parseTarget(input) {
  if (typeof input !== "string" || !input.trim()) return { error: "Enter a docs site URL." };
  const raw = input.trim();
  if (raw.length > 2048) return { error: "That URL is too long (2048 characters at most)." };
  let u;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { error: "That does not look like a URL." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { error: "Only http and https URLs work." };
  if (u.username || u.password) return { error: "Remove the username and password from the URL." };
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  // The URL parser has already turned 2130706433, 0x7f.1 and friends into dotted decimal, so one
  // pattern catches every IPv4 literal (private ones included); IPv6 literals keep their brackets.
  const ipLiteral = host.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const internal = !host.includes(".") || /(^|\.)(localhost|local|internal|localdomain|lan)$/.test(host) || host.endsWith(".home.arpa");
  if (ipLiteral || internal) return { error: "That address is private or an IP literal. Use a public docs site hostname." };
  u.hostname = host; // drops a trailing dot, so the sitemap URLs the site lists still match
  return { site: u.origin, host };
}

// docs.example.com -> docs-example-com: kebab-case, at most 64 characters (the Agent Skills name rule).
export const skillName = (host) =>
  host.replace(/^www\./, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/, "") || "docs";
