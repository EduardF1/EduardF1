// lang-card.mjs: the "most used languages" card, from real GitHub byte data.
//
// gh api as the account owner: own repositories, public and private, forks excluded, programming
// languages only. Only language names and shares leave the account, never repository names. No
// third-party image host, so it never 503s and never goes stale behind someone else's cache.
//
// It is 500x200, the SAME box as grade-card.svg, on purpose. Two cards of different heights placed
// side by side in a README do not sit level, and the eye reads that as carelessness before it reads
// a single number. Matching the box is the whole fix.
//
// The caption is laid out to FIT: the previous version wrote an 85-character line into a 460px card
// and GitHub clipped it mid-sentence ("no forks, no"), which a byte count of the SVG would never have
// caught. Anything that has to be said gets its own line, and the widths are checked below.
//
// Run: node lang-card.mjs > assets/lang-card.svg
import { execFileSync } from "node:child_process";

const langs = {};
const repos = execFileSync("gh", ["api", "user/repos?affiliation=owner&per_page=100", "--paginate", "--jq", ".[] | select(.fork | not) | .name"], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
// Repositories whose byte counts are third-party code checked in for research, not mine; listed by name
// with the reason so the exclusion is visible rather than silent.
const SKIP = { "twin-ai-rnd": "49 MB of vendored C++ (llama.cpp and related sources) kept for R&D builds" };
for (const repo of repos) {
  if (SKIP[repo]) continue;
  try {
    // @tsv, so the jq filter carries no quote or backslash of its own. The previous filter used jq
    // string interpolation, lost a backslash level on its way through a shell, and then produced the
    // literal text "(.key)=(.value)" for every repository. Every byte count parsed as NaN, the
    // catch never fired, and the card rendered EMPTY rather than failing. Hence also the floor below.
    const out = execFileSync("gh", ["api", `repos/EduardF1/${repo}/languages`, "--jq", "to_entries[] | [.key, .value] | @tsv"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    for (const line of out.trim().split(/\r?\n/).filter(Boolean)) {
      const [name, raw] = line.split("\t");
      const bytes = Number(raw);
      if (name && Number.isFinite(bytes) && bytes > 0) langs[name] = (langs[name] || 0) + bytes;
    }
  } catch { /* repo unreadable: skip */ }
}
const NON_PROGRAMMING = new Set(["HTML", "CSS", "MDX", "SCSS", "Jupyter Notebook", "TeX", "Makefile", "CMake", "Starlark", "Dockerfile", "Batchfile", "Shell"]);
const sorted = Object.entries(langs).filter(([n]) => !NON_PROGRAMMING.has(n)).sort((a, b) => b[1] - a[1]).slice(0, 8);
const total = sorted.reduce((s, [, b]) => s + b, 0);

// A floor, not a hope. An account with 48 repositories that reports fewer than four languages or no
// bytes at all has a broken collector, not a quiet portfolio, and writing that card out would replace
// a good one with an empty box that still looks like a card.
if (sorted.length < 4 || total <= 0) {
  console.error(`REFUSING to write the card: ${sorted.length} languages, ${total} bytes from ${repos.length} repositories. Fix the collector.`);
  process.exit(3);
}
const COLORS = { "TypeScript": "#3178c6", "C#": "#68217a", "JavaScript": "#f1e05a", "Rust": "#dea584", "Go": "#00ADD8", "Java": "#b07219", "Python": "#3572A5", "PHP": "#4F5D95", "PowerShell": "#4d6fa8", "C++": "#f34b7d", "C": "#8b949e", "TSQL": "#e38c00", "Dart": "#00B4AB", "Vue": "#41b883" };
const color = (n) => COLORS[n] || "#6ea8ff";

const W = 500, H = 200, PAD = 22;
const BAR_Y = 86, BAR_H = 12, BAR_W = W - 2 * PAD;
const LEGEND_TOP = 122, LEGEND_LH = 20, COL_W = BAR_W / 2;
const stamp = new Date().toISOString().slice(0, 10);
const counted = repos.length - Object.keys(SKIP).length;
const escape = (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// One stacked bar instead of eight separate ones: the shares are parts of a whole, and drawing them
// as a whole says so without a caption.
let cursor = PAD;
const segments = sorted.map(([name, bytes]) => {
  const width = (bytes / total) * BAR_W;
  const piece = `  <rect x="${cursor.toFixed(1)}" y="${BAR_Y}" width="${width.toFixed(1)}" height="${BAR_H}" fill="${color(name)}"/>`;
  cursor += width;
  return piece;
}).join("\n");

const legend = sorted.map(([name, bytes], index) => {
  const column = index % 2;
  const row = Math.floor(index / 2);
  const x = PAD + column * (COL_W + 4);
  const y = LEGEND_TOP + row * LEGEND_LH;
  const pct = ((bytes / total) * 100).toFixed(1);
  return `  <rect x="${x}" y="${y - 8}" width="9" height="9" rx="2" fill="${color(name)}"/>
  <text x="${x + 16}" y="${y}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="12.5" fill="#adbac7">${escape(name)}</text>
  <text x="${(x + COL_W - 16).toFixed(0)}" y="${y}" text-anchor="end" font-family="Consolas, Menlo, monospace" font-size="11.5" fill="#8b949e">${pct}%</text>`;
}).join("\n");

console.log(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Most used programming languages by byte count across ${counted} own repositories, public and private, forks and vendored trees excluded, measured ${stamp}: ${sorted.map(([n, b]) => `${n} ${((b / total) * 100).toFixed(1)} percent`).join(", ")}">
  <defs>
    <clipPath id="bar"><rect x="${PAD}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="12" fill="#0d1117" stroke="#30363d"/>
  <text x="${PAD}" y="34" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#58a6ff">Languages by byte count</text>
  <text x="${PAD}" y="52" font-family="Consolas, Menlo, monospace" font-size="11" fill="#8b949e">${counted} own repos, public and private, measured ${stamp}</text>
  <text x="${PAD}" y="68" font-family="Consolas, Menlo, monospace" font-size="11" fill="#6f7f95">forks, vendored trees and markup excluded; top 8 shown</text>
  <g clip-path="url(#bar)">
${segments}
  </g>
${legend}
</svg>`);

// The check that the caption fits, run every time the card is generated rather than trusted once.
// 11px Consolas advances about 6.05px per character; the box is W minus both paddings.
const CAPTIONS = [
  [`${counted} own repos, public and private, measured ${stamp}`, 6.05],
  ["forks, vendored trees and markup excluded; top 8 shown", 6.05],
  ["Languages by byte count", 9.1],
];
for (const [text, advance] of CAPTIONS) {
  const width = text.length * advance;
  if (width > BAR_W) console.error(`CAPTION OVERFLOWS: "${text}" is about ${width.toFixed(0)}px in a ${BAR_W}px box`);
}
console.error(`lang card: ${sorted.length} languages, ${counted} repos, shares sum ${sorted.reduce((s, [, b]) => s + (b / total) * 100, 0).toFixed(1)}%`);
