// lang-card.mjs: generate a static SVG "most used languages" card for the profile README from real
// GitHub byte data (gh api as the account owner: own repositories, public and private, forks excluded,
// programming languages only; only language names and shares leave the account, never repository names).
// No third-party image host means it never 503s and never goes stale behind a cache.
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
    const out = execFileSync("gh", ["api", `repos/EduardF1/${repo}/languages`, "--jq", 'to_entries[] | "\\(.key)=\\(.value)"'], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    for (const line of out.trim().split(/\r?\n/).filter(Boolean)) {
      const i = line.lastIndexOf("=");
      const name = line.slice(0, i);
      const bytes = Number(line.slice(i + 1));
      if (name && Number.isFinite(bytes)) langs[name] = (langs[name] || 0) + bytes;
    }
  } catch { /* repo unreadable: skip */ }
}
const NON_PROGRAMMING = new Set(["HTML", "CSS", "MDX", "SCSS", "Jupyter Notebook", "TeX", "Makefile", "CMake", "Starlark", "Dockerfile", "Batchfile", "Shell"]);
const sorted = Object.entries(langs).filter(([n]) => !NON_PROGRAMMING.has(n)).sort((a, b) => b[1] - a[1]).slice(0, 8);
const total = sorted.reduce((s, [, b]) => s + b, 0);
const COLORS = { "TypeScript": "#3178c6", "C#": "#68217a", "JavaScript": "#f1e05a", "Rust": "#dea584", "Go": "#00ADD8", "Java": "#b07219", "Python": "#3572A5", "PHP": "#4F5D95", "PowerShell": "#012456", "C++": "#f34b7d", "C": "#555555", "TSQL": "#e38c00", "Dart": "#00B4AB", "Vue": "#41b883" };
const color = (n) => COLORS[n] || "#6ea8ff";

const W = 460, LH = 34, PAD = 16;
const rows = sorted.map(([name], i) => {
  const pct = ((sorted[i][1] / total) * 100).toFixed(1);
  return `<text x="${PAD}" y="${44 + i * LH}" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="#e6edf3">${name}</text>
<text x="${W - PAD}" y="${44 + i * LH}" text-anchor="end" font-family="Consolas, monospace" font-size="12" fill="#9aa7b4">${pct}%</text>
<rect x="${PAD}" y="${50 + i * LH}" width="${((sorted[i][1] / total) * (W - 2 * PAD)).toFixed(1)}" height="7" rx="3.5" fill="${color(name)}"/>`;
}).join("\n");
const H = 60 + sorted.length * LH;
const stamp = new Date().toISOString().slice(0, 10);
console.log(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Most used programming languages">
  <rect width="${W}" height="${H}" rx="12" fill="#0d1117" stroke="#30363d"/>
  <text x="${PAD}" y="22" font-family="Consolas, Menlo, monospace" font-size="13" fill="#58a6ff">$ du -sh languages/ (${repos.length - Object.keys(SKIP).length} own repos incl. private, no forks, no vendored trees, ${stamp})</text>
${rows}
</svg>`);
