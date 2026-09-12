// banner.mjs: the header. A quiet one, where the LAYOUT carries the meaning.
//
// Three things learned by rendering it and looking, rather than by assuming:
//  1. A ``` block cannot hold figlet art on GitHub. Code blocks render at line-height 1.45, which
//     pulls the rows of a letterform apart and turns a name into noise.
//  2. Moving the same art into an SVG fixed the spacing but not the legibility: at any size that
//     fits a header, the underscores of one row sit on the pipes of the next.
//  3. The name did not belong here at all. The profile is already titled EduardF1, so a giant
//     wordmark repeats what the page above it already says and spends the whole header doing it.
//
// So the header says what the profile cannot: the shape of the work. The left column is a title
// block, the right column is the system drawn as layers, and reading it top to bottom is reading
// the stack from the screen down to the metal. Hairlines, one accent, no glow.
//
// The animation is declared INSIDE the svg, so it survives being loaded through <img>, and it is a
// single staggered fade. No blinking, nothing that keeps moving after you have read it.
//
// Run: node banner.mjs > assets/banner.svg
const WIDTH = 880
const HEIGHT = 180
const PAD = 34
const MONO = 'ui-monospace, SFMono-Regular, Consolas, Menlo, monospace'
const SANS = "'Segoe UI', Helvetica, Arial, sans-serif"

const EYEBROW = 'AARHUS, DENMARK'
const HEADLINE = 'full-stack and platform engineer'
const LINES = ['measured work over vibes', 'a check that cannot fail proves nothing']

/** Top to bottom: the screen down to the metal. Every name here is in the verified record. */
const LAYERS = [
  ['interface', 'React, Next.js, Angular'],
  ['api', 'ASP.NET Core, Node'],
  ['domain', 'event sourcing, CQRS'],
  ['data', 'Postgres, pgvector'],
  ['platform', 'Docker, CI, one RTX 5090'],
]

const COLUMN_X = 470
const COLUMN_W = WIDTH - COLUMN_X - PAD
const ROW_H = 22
const ROW_GAP = 7
const STACK_H = LAYERS.length * ROW_H + (LAYERS.length - 1) * ROW_GAP
const STACK_TOP = Math.round((HEIGHT - STACK_H) / 2)
const RAIL_X = COLUMN_X - 14

const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const rows = LAYERS.map(([name, detail], index) => {
  const y = STACK_TOP + index * (ROW_H + ROW_GAP)
  // The accent deepens downward: the foundation carries the most weight, and the eye reads the
  // gradient as depth without a single label having to say "layer".
  const weight = (0.3 + (index / (LAYERS.length - 1)) * 0.7).toFixed(2)
  return `  <g class="row" style="animation-delay:${(0.25 + index * 0.07).toFixed(2)}s">
    <rect x="${COLUMN_X}" y="${y}" width="${COLUMN_W}" height="${ROW_H}" rx="4" fill="#10151c" stroke="#21262d"/>
    <rect x="${COLUMN_X}" y="${y}" width="3" height="${ROW_H}" rx="1.5" fill="#7aa8d4" opacity="${weight}"/>
    <circle cx="${RAIL_X}" cy="${y + ROW_H / 2}" r="2" fill="#30363d"/>
    <text x="${COLUMN_X + 16}" y="${y + 15}" class="layer">${escape(name)}</text>
    <text x="${COLUMN_X + COLUMN_W - 14}" y="${y + 15}" text-anchor="end" class="detail">${escape(detail)}</text>
  </g>`
}).join('\n')

const tagline = LINES.map((line, index) => `  <text x="${PAD}" y="${128 + index * 17}" class="tag" opacity="${index === 0 ? 1 : 0.62}"
        style="animation-delay:${(0.5 + index * 0.08).toFixed(2)}s">${escape(line)}</text>`).join('\n')

process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}"
     viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img"
     aria-label="Full-stack and platform engineer in Aarhus, Denmark. The stack from the screen down: interface in React, Next.js and Angular; api in ASP.NET Core and Node; domain built on event sourcing and CQRS; data in Postgres with pgvector; platform on Docker, CI and one RTX 5090.">
  <style>
    .eyebrow  { font-family: ${MONO}; font-size: 9.5px; fill: #6f7f95; letter-spacing: 2.4px; }
    .headline { font-family: ${SANS}; font-size: 19.5px; font-weight: 600; fill: #e6edf3; letter-spacing: -0.2px; }
    .tag      { font-family: ${MONO}; font-size: 11.5px; fill: #8b949e; }
    .layer    { font-family: ${MONO}; font-size: 10.5px; fill: #adbac7; letter-spacing: 0.5px; }
    .detail   { font-family: ${MONO}; font-size: 10.5px; fill: #6f7f95; }
    .row, .tag, .headline, .eyebrow, .rule { opacity: 0; animation: in 0.5s ease-out forwards; }
    .eyebrow  { animation-delay: 0.05s }
    .headline { animation-delay: 0.15s }
    .rule     { animation-delay: 0.3s }
    .row      { animation-name: slide }
    @keyframes in    { to { opacity: 1 } }
    @keyframes slide { from { opacity: 0; transform: translateX(6px) } to { opacity: 1; transform: translateX(0) } }
    .tag { animation-name: in; }
    @media (prefers-reduced-motion: reduce) {
      .row, .tag, .headline, .eyebrow, .rule { animation: none; opacity: 1 }
    }
  </style>

  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="12" fill="#0d1117" stroke="#30363d"/>

  <text x="${PAD}" y="58" class="eyebrow">${escape(EYEBROW)}</text>
  <text x="${PAD}" y="90" class="headline">${escape(HEADLINE)}</text>
  <rect x="${PAD}" y="103" width="46" height="2" rx="1" fill="#7aa8d4" class="rule"/>
${tagline}

  <line x1="${WIDTH / 2 - 10}" y1="${STACK_TOP}" x2="${WIDTH / 2 - 10}" y2="${STACK_TOP + STACK_H}" stroke="#21262d"/>
  <line x1="${RAIL_X}" y1="${STACK_TOP + ROW_H / 2}" x2="${RAIL_X}" y2="${STACK_TOP + STACK_H - ROW_H / 2}" stroke="#21262d"/>
${rows}
</svg>
`)
