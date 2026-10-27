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
  // Every trailing dot goes: "127.0.0.1.." is not an IP literal to the URL parser, but "127.0.0.1." is, and
  // assigning the hostname back below would re-parse it into one. The checks run on the stripped name.
  const host = u.hostname.toLowerCase().replace(/\.+$/, "");
  // The URL parser has already turned 2130706433, 0x7f.1 and friends into dotted decimal, so one
  // pattern catches every IPv4 literal (private ones included); IPv6 literals keep their brackets.
  const ipLiteral = host.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const internal = !host.includes(".") || /(^|\.)(localhost|local|internal|localdomain|lan)$/.test(host) || host.endsWith(".home.arpa");
  if (ipLiteral || internal) return { error: "That address is private or an IP literal. Use a public docs site hostname." };
  u.hostname = host; // drops the trailing dots, so the sitemap URLs the site lists still match
  return { site: u.origin, host };
}

// docs.example.com -> docs-example-com: kebab-case, at most 64 characters (the Agent Skills name rule).
export const skillName = (host) =>
  host.replace(/^www\./, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/, "") || "docs";

// The rate-limit key for a visitor. An IPv6 customer owns at least a /64 and can pick any address in it, so the
// key is the /64 (the first four groups, with "::" expanded first: "2001:db8::1:2" and "2001:db8:0:0:1:2:0:0"
// share a prefix that a plain split on ":" would not show). IPv4 and IPv4-mapped addresses are kept whole.
export function limitKey(ip) {
  if (!ip.includes(":") || ip.includes(".")) return ip;
  const [head, tail] = ip.toLowerCase().split("::");
  const a = head ? head.split(":") : [];
  const b = tail ? tail.split(":") : [];
  const groups = tail === undefined ? a : [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b];
  return groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":");
}

// A reference file in the response is cut to its first lines: the pane shows what the file looks like, the CLI writes the page.
export const REFERENCE_LINES = 40;
export const REFERENCE_CHARS = 3000;
export function referenceHead(text) {
  const lines = text.split("\n");
  if (lines.length <= REFERENCE_LINES && text.length <= REFERENCE_CHARS) return text;
  return lines.slice(0, REFERENCE_LINES).join("\n").slice(0, REFERENCE_CHARS) + "\n";
}
