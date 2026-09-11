// stack-cards.mjs (local generator): builds assets/stack-<category>.svg from the portfolio checkout at
// D:/projects/portfolio; run it after the portfolio tech list changes. Run: node stack-cards.mjs
// stack-cards.mjs: build one self-contained SVG card per portfolio category (the six of
// D:/projects/portfolio/src/lib/tech.ts, same items, same order, same light/dark plate rule as
// src/lib/tech-icon-plates.json), with every logo embedded as a data URI so the card renders on
// GitHub through camo with no third-party host at view time. Output: <repo>/assets/stack-<cat>.svg
// plus stack-manifest.json (names per category for the README's text fallback).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const TECH = "D:/projects/portfolio/src/lib/tech.ts";
const PLATES = "D:/projects/portfolio/src/lib/tech-icon-plates.json";
const OUT = process.argv[2] || "D:/projects/EduardF1/assets";
mkdirSync(OUT, { recursive: true });

const src = readFileSync(TECH, "utf8");
const plates = JSON.parse(readFileSync(PLATES, "utf8"));
const techs = [];
const re = /\{\s*slug:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*category:\s*"([^"]+)",[\s\S]*?icon:\s*(?:"([^"]*)"|null)/g;
let m;
while ((m = re.exec(src))) techs.push({ slug: m[1], name: m[2], category: m[3], icon: m[4] || null });
const LABELS = { backend: "Backend", frontend: "Frontend", mobile: "Mobile", data: "Data", testing: "Quality", ops: "Operations" };
const ORDER = ["backend", "frontend", "mobile", "data", "testing", "ops"];
console.log("techs parsed:", techs.length, ORDER.map((c) => c + "=" + techs.filter((t) => t.category === c).length).join(" "));

function iconUrls(icon) {
  if (!icon) return [];
  if (icon.startsWith("http")) return [icon];
  return [
    `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${icon}/${icon}-original.svg`,
    `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${icon}/${icon}-plain.svg`,
  ];
}
async function fetchIcon(t) {
  for (const u of iconUrls(t.icon)) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) continue;
      const ct = (r.headers.get("content-type") || "").toLowerCase();
      const buf = Buffer.from(await r.arrayBuffer());
      const mime = ct.includes("svg") || u.endsWith(".svg") ? "image/svg+xml" : ct.includes("png") || u.includes(".png") ? "image/png" : ct.split(";")[0] || "image/png";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {}
  }
  return null;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const COLS = 8, TILE_W = 98, TILE_H = 74, GAP = 8, PAD = 16, TITLE = 30;
function card(label, items) {
  const rows = Math.ceil(items.length / COLS);
  const W = PAD * 2 + COLS * TILE_W + (COLS - 1) * GAP;
  const H = PAD + TITLE + rows * TILE_H + (rows - 1) * GAP + PAD;
  const tiles = items.map((t, i) => {
    const x = PAD + (i % COLS) * (TILE_W + GAP);
    const y = PAD + TITLE + Math.floor(i / COLS) * (TILE_H + GAP);
    const light = plates[t.slug]?.onDark === "light";
    const plate = light ? "#e6edf3" : "#161b22";
    const cx = x + TILE_W / 2;
    const logo = t.data
      ? `<image href="${t.data}" x="${cx - 16}" y="${y + 9}" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>`
      : `<text x="${cx}" y="${y + 31}" text-anchor="middle" font-family="Consolas, Menlo, monospace" font-size="15" font-weight="700" fill="${light ? "#0d1117" : "#e6edf3"}">${esc(t.name.slice(0, 2).toUpperCase())}</text>`;
    return `<rect x="${x}" y="${y}" width="${TILE_W}" height="${TILE_H}" rx="8" fill="${plate}" stroke="#30363d"/>\n<rect x="${cx - 21}" y="${y + 4}" width="42" height="42" rx="6" fill="${plate}"/>\n${logo}\n<text x="${cx}" y="${y + 63}" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${t.name.length > 13 ? 9.5 : 10.5}" fill="${light ? "#24292f" : "#c9d1d9"}">${esc(t.name.length > 18 ? t.name.slice(0, 17) + "." : t.name)}</text>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}: ${esc(items.map((t) => t.name).join(", "))}">
<rect width="${W}" height="${H}" rx="12" fill="#0d1117" stroke="#30363d"/>
<text x="${PAD}" y="${PAD + 16}" font-family="Consolas, Menlo, monospace" font-size="13" fill="#58a6ff">$ ls stack/${label.toLowerCase()}</text>
<text x="${W - PAD}" y="${PAD + 16}" text-anchor="end" font-family="Consolas, Menlo, monospace" font-size="11" fill="#8b949e">${items.length} entries</text>
${tiles}
</svg>`;
}

const manifest = {};
let missing = [];
for (const cat of ORDER) {
  const items = techs.filter((t) => t.category === cat);
  for (const t of items) { t.data = await fetchIcon(t); if (!t.data) missing.push(t.slug); }
  const svg = card(LABELS[cat], items);
  writeFileSync(`${OUT}/stack-${cat}.svg`, svg);
  manifest[cat] = { label: LABELS[cat], names: items.map((t) => t.name), bytes: Buffer.byteLength(svg) };
  console.log(`${cat}: ${items.length} tiles, ${(Buffer.byteLength(svg) / 1024).toFixed(0)} KB`);
}
writeFileSync(`${OUT}/stack-manifest.json`, JSON.stringify(manifest, null, 2));
console.log("logos missing (monogram fallback):", missing.length ? missing.join(", ") : "none");
