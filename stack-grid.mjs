// stack-grid.mjs: render the technology grid into README.md between the STACK markers.
//
// Every logo is a LOCAL tile file with a `title` attribute, which is what gives the hover name. A
// combined image from a skill-icon service cannot carry a per-logo tooltip and dies with the
// service; these are files in the repo.
//
// The tiles come from tile-icons.mjs, which puts every logo on one frame and proves by pixel
// measurement that each one is visible on it. Run that first if the icon set changes.
//
// The list, the order and the grouping come from assets/tech.json, which fetch-icons.mjs writes
// from the portfolio's src/lib/tech.ts. So this grid, eduardfischer.dev and the icon set cannot
// drift apart.
//
// Run: node stack-grid.mjs        (rewrites README.md in place)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const START = '<!-- STACK:START -->'
const END = '<!-- STACK:END -->'
/**
 * 36px plus the non-breaking space between tiles is 40px per item, so the widest category (Backend,
 * 24) lands at 960px inside GitHub's 1012px content column and every category fits on ONE row. At
 * 40px tiles the same category wrapped to 22 plus an orphan pair, which reads as a mistake rather
 * than as a grid. The number is chosen from that measurement, not from taste.
 */
const ICON_SIZE = 36

const GROUPS = [
  ['backend', 'Backend'],
  ['frontend', 'Frontend'],
  ['mobile', 'Mobile'],
  ['data', 'Data'],
  ['testing', 'Quality'],
  ['ops', 'Operations'],
]

const tech = JSON.parse(readFileSync('assets/tech.json', 'utf8'))
const tilePath = (slug) => (existsSync(`assets/tiles/${slug}.svg`) ? `assets/tiles/${slug}.svg` : null)
const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const blocks = []
let placed = 0
for (const [category, heading] of GROUPS) {
  const items = tech.filter((entry) => entry.category === category)
  if (items.length === 0) continue
  const images = items.map((entry) => {
    const path = tilePath(entry.slug)
    if (!path) return ''
    placed += 1
    // title gives the hover name; alt gives the same text to a screen reader and to anyone whose
    // images do not load.
    return `<img src="${path}" alt="${escape(entry.name)}" title="${escape(entry.name)}" width="${ICON_SIZE}" height="${ICON_SIZE}" />`
  // ONE LINE, no newline between the images. A newline inside an HTML block makes GitHub's renderer
  // treat each img as its own block, and 88 logos then stack vertically down 6500px instead of
  // flowing into a grid. Seen in a render, not guessed: the first version did exactly that.
  }).filter(Boolean).join('&nbsp;')
  blocks.push(`<strong>${heading}</strong>&nbsp;<sub>${items.length}</sub><br />${images}`)
}

// No blank line ANYWHERE inside the div. A blank line hands the contents back to the markdown
// parser, which wraps every category in its own <p> and stacks paragraph margins on top of the
// breaks; that is what left a screenful of dead space between categories even after the breaks were
// cut to one. Kept as a single raw HTML block, the only vertical spacing is the <br /> count here,
// which is the whole reason for controlling it in this file.
const grid = `<div align="center">\n${blocks.join('<br /><br />\n')}\n</div>`

const readme = readFileSync('README.md', 'utf8')
const startAt = readme.indexOf(START)
const endAt = readme.indexOf(END)
if (startAt === -1 || endAt === -1) {
  console.error(`README.md has no ${START} / ${END} markers; nothing written.`)
  process.exit(2)
}
if (placed < tech.length) {
  console.error(`REFUSING: only ${placed} of ${tech.length} technologies have a tile. Run tile-icons.mjs first.`)
  process.exit(3)
}
writeFileSync('README.md', readme.slice(0, startAt + START.length) + '\n\n' + grid + '\n\n' + readme.slice(endAt), 'utf8')

console.log(`stack grid written: ${placed} tiles across ${blocks.length} categories`)
for (const [category, heading] of GROUPS) {
  console.log(`  ${heading.padEnd(12)} ${tech.filter((entry) => entry.category === category).length}`)
}
