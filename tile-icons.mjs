// tile-icons.mjs: put every stack logo on one uniform tile, and decide per logo, BY MEASUREMENT,
// whether it has to be inverted to be visible.
//
// Why this exists. Eight of the 88 logos are pure black artwork (Express, Symfony, Kafka, Gradle,
// CircleCI, Splunk, Robot Framework, Angular Material). On GitHub's dark theme they rendered as
// nothing at all: not broken, not missing, just absent, and every automated check still said 88 of
// 88 images loaded. A pixel measurement is the only check that can see this, so that is the check.
//
// The rule is stated rather than eyeballed: an icon is inverted only when it is INVISIBLE on the
// tile as drawn and inverting it would actually help and it is near enough to monochrome that the
// inversion does not invent a colour. A coloured logo is never touched: MySQL is dark and would
// fail a brightness-only rule, but it is blue and orange, and inverting it produces a logo MySQL
// does not own.
//
// The tiles are dark to match the banner and the two stat cards, so the page reads as one design
// rather than a dark header above a wall of white chips.
//
// Run: node tile-icons.mjs      (writes assets/tiles/*.svg)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import http from 'node:http'
import { join, extname } from 'node:path'

const require = createRequire('C:/Users/fisch/quantum-dl/gmail-candidates.mjs')
const { chromium } = require('patchright')

const TILE = 44
const INSET = 8
const ART = TILE - INSET * 2
const RADIUS = 10
const TILE_FILL = '#161b22'
const TILE_STROKE = '#2b313a'
const PORT = 4604

/**
 * Inversion is decided by OUTCOME, not by a proxy. For every icon both variants are composited over
 * the tile fill and measured; the plain one wins unless it is invisible, and the inverted one is
 * only allowed at all for a mark close enough to monochrome that inverting it does not invent a
 * colour scheme the owner never used.
 *
 * The guard is CHROMA (max channel minus min channel), not HSV saturation, and the difference is not
 * academic. Saturation is relative to the max channel, so it goes to 1 for anything near black:
 * Gradle's #02303A scored 0.97 and was treated as a colourful logo, which left it invisible on a
 * dark tile. Chroma measures the same colour as 0.22, which is what the eye sees. Two rules died on
 * this icon set before the third one held, and both earlier ones failed silently.
 */
const MAX_CHROMA_TO_INVERT = 0.32
/** Share of the 44px tile the logo must cover, over and above what an empty tile paints by itself. */
const MIN_COVERAGE = 0.03

const tech = JSON.parse(readFileSync('assets/tech.json', 'utf8'))
mkdirSync('assets/tiles', { recursive: true })

const sourceOf = (slug) => {
  for (const ext of ['svg', 'png']) {
    const path = `assets/icons/${slug}.${ext}`
    if (existsSync(path)) return { path, ext }
  }
  return null
}

const escapeAttr = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/probe.html')) {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<!doctype html><body></body>')
    return
  }
  const file = join(process.cwd(), decodeURIComponent(req.url.split('?')[0]).replace(/^\//, ''))
  if (!existsSync(file)) { res.writeHead(404); res.end(''); return }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((resolve) => server.listen(PORT, resolve))

const targets = tech.map((entry) => ({ ...entry, source: sourceOf(entry.slug) }))
const missing = targets.filter((entry) => !entry.source)

const ctx = await chromium.launchPersistentContext('', { headless: true })
const tab = ctx.pages()[0] || (await ctx.newPage())
await tab.goto(`http://127.0.0.1:${PORT}/probe.html`)

// Measure the raw artwork the way the tile will actually show it: composited over the tile fill,
// once as drawn and once inverted, plus how monochrome it is.
const measured = await tab.evaluate(async ({ list, size, inset, fill, lift }) => {
  const load = (url) => new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
  const bg = [parseInt(fill.slice(1, 3), 16), parseInt(fill.slice(3, 5), 16), parseInt(fill.slice(5, 7), 16)]
  const out = []
  for (const item of list) {
    const img = await load(item.url)
    if (!img) { out.push({ slug: item.slug, error: 'failed to load' }); continue }
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.clearRect(0, 0, size, size)
    context.drawImage(img, inset, inset, size - inset * 2, size - inset * 2)
    const data = context.getImageData(0, 0, size, size).data
    let painted = 0
    let chroma = 0
    let plain = 0
    let lifted = 0
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255
      if (alpha < 0.16) continue
      const channels = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255]
      const max = Math.max(...channels)
      const min = Math.min(...channels)
      painted += 1
      chroma += max - min
      // Composite over the tile fill exactly as the browser will, then score the contrast.
      const over = (values) => values.reduce((sum, value, index) => sum + Math.abs(value * 255 * alpha + bg[index] * (1 - alpha) - bg[index]), 0)
      if (over(channels) > 90) plain += 1
      if (over(channels.map((value) => Math.min(1, Math.max(0, lift - value)))) > 90) lifted += 1
    }
    out.push({
      slug: item.slug,
      painted: Number((painted / (size * size)).toFixed(3)),
      chroma: painted ? Number((chroma / painted).toFixed(3)) : 0,
      plain: Number((plain / (size * size)).toFixed(3)),
      lifted: Number((lifted / (size * size)).toFixed(3)),
    })
  }
  return out
}, {
  list: targets.filter((entry) => entry.source).map((entry) => ({
    slug: entry.slug,
    url: `http://127.0.0.1:${PORT}/${entry.source.path.split('\\').join('/')}`,
  })),
  size: TILE,
  inset: INSET,
  fill: TILE_FILL,
  lift: 0.92,
})
const stats = new Map(measured.map((row) => [row.slug, row]))

const inverted = []
const skipped = []
for (const entry of targets) {
  if (!entry.source) continue
  const stat = stats.get(entry.slug)
  const invert = Boolean(stat) && !stat.error
    && stat.plain < MIN_COVERAGE
    && stat.lifted > stat.plain
    && stat.chroma <= MAX_CHROMA_TO_INVERT
  if (invert) inverted.push(entry.slug)

  let art
  if (entry.source.ext === 'svg') {
    const raw = readFileSync(entry.source.path, 'utf8')
      .replace(/<\?xml[^>]*\?>/g, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .trim()
    const open = raw.match(/<svg\b[^>]*>/i)
    if (!open) { skipped.push(entry.slug); continue }
    const explicitBox = open[0].match(/viewBox\s*=\s*"([^"]+)"/i)
    const width = open[0].match(/width\s*=\s*"([\d.]+)/i)
    const height = open[0].match(/height\s*=\s*"([\d.]+)/i)
    const viewBox = explicitBox ? explicitBox[1] : `0 0 ${width ? width[1] : 128} ${height ? height[1] : 128}`
    const inner = raw.slice(open.index + open[0].length, raw.lastIndexOf('</svg>'))
    // A nested <svg> rather than an <image href="data:..."> : self contained, no base64 bloat, and
    // nothing for a renderer to refuse to fetch.
    art = `<svg x="${INSET}" y="${INSET}" width="${ART}" height="${ART}" viewBox="${viewBox}">${inner}</svg>`
  } else {
    const base64 = readFileSync(entry.source.path).toString('base64')
    art = `<image x="${INSET}" y="${INSET}" width="${ART}" height="${ART}" href="data:image/png;base64,${base64}" preserveAspectRatio="xMidYMid meet"/>`
  }

  // The lift maps each channel to 0.92 minus the pixel's LUMINANCE, so a dark mark comes back as a
  // neutral light one: the white-on-dark variant most brands publish themselves. A plain per-channel
  // inversion was tried first and turned Gradle's dark teal elephant PINK, which is a logo Gradle
  // does not own. Landing at 0.92 rather than pure white keeps it reading as artwork on the tile
  // instead of as a light source.
  const L = [0.2126, 0.7152, 0.0722]
  const filter = '<filter id="lift" color-interpolation-filters="sRGB">'
    + `<feColorMatrix type="matrix" values="${[0, 1, 2].map(() => `${(-L[0]).toFixed(4)} ${(-L[1]).toFixed(4)} ${(-L[2]).toFixed(4)} 0 0.92`).join('  ')}  0 0 0 1 0"/>`
    + '</filter>'
  const body = invert ? `<g filter="url(#lift)">${art}</g>` : art
  const defs = invert ? `  <defs>${filter}</defs>\n` : ''

  // xmlns:xlink is declared on every tile, not only where it is needed: several Devicon sources use
  // xlink:href internally, and a nested svg that references an undeclared namespace makes the whole
  // file unparseable. Maven failed to load for exactly this reason and nothing else reported it.
  writeFileSync(`assets/tiles/${entry.slug}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}" role="img" aria-label="${escapeAttr(entry.name)}">
${defs}  <rect x="0.5" y="0.5" width="${TILE - 1}" height="${TILE - 1}" rx="${RADIUS}" fill="${TILE_FILL}" stroke="${TILE_STROKE}"/>
  ${body}
</svg>
`, 'utf8')
}

// Now verify the OUTPUT, not the intent: measure each finished tile against the tile's own fill and
// fail the build if any logo is still invisible on it. An empty tile is written and measured first,
// so the floor is set against what the frame alone scores rather than against a guess at it.
writeFileSync('assets/tiles/.baseline.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">
  <rect x="0.5" y="0.5" width="${TILE - 1}" height="${TILE - 1}" rx="${RADIUS}" fill="${TILE_FILL}" stroke="${TILE_STROKE}"/>
</svg>
`, 'utf8')
const tiles = ['.baseline.svg', ...readdirSync('assets/tiles').filter((name) => name.endsWith('.svg') && !name.startsWith('.'))]
const verified = await tab.evaluate(async ({ names, port, fill, size }) => {
  const load = (url) => new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
  const bg = [parseInt(fill.slice(1, 3), 16), parseInt(fill.slice(3, 5), 16), parseInt(fill.slice(5, 7), 16)]
  const out = []
  for (const name of names) {
    const img = await load(`http://127.0.0.1:${port}/assets/tiles/${name}`)
    if (!img) { out.push({ name, coverage: 0, error: 'failed to load' }); continue }
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(img, 0, 0, size, size)
    const data = context.getImageData(0, 0, size, size).data
    let visible = 0
    for (let i = 0; i < data.length; i += 4) {
      const distance = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2])
      if (distance > 90) visible += 1
    }
    out.push({ name, coverage: Number((visible / (size * size)).toFixed(3)) })
  }
  return out
}, { names: tiles, port: PORT, fill: TILE_FILL, size: TILE })

await ctx.close()
server.close()

const baseline = verified.find((row) => row.name === '.baseline.svg')
if (!baseline || baseline.error) {
  console.error('the empty baseline tile did not render, so no floor can be trusted')
  process.exit(5)
}
const floor = baseline.coverage + MIN_COVERAGE
const logos = verified.filter((row) => row.name !== '.baseline.svg')
const failed = logos.filter((row) => row.error || row.coverage < floor)
rmSync('assets/tiles/.baseline.svg', { force: true })

console.log(`tiles written: ${logos.length} of ${tech.length}`)
console.log(`inverted by measurement (${inverted.length}): ${inverted.join(', ') || 'none'}`)
console.log(`empty tile scores ${baseline.coverage}, so the floor is ${floor.toFixed(3)}`)
if (missing.length) console.log(`no source icon for: ${missing.map((entry) => entry.slug).join(', ')}`)
if (skipped.length) console.log(`no svg root, skipped: ${skipped.join(', ')}`)
if (failed.length) {
  console.error(`STILL INVISIBLE on the tile (${failed.length}):`)
  for (const row of failed) {
    const stat = stats.get(row.name.replace('.svg', '')) ?? {}
    console.error(`  ${row.name.padEnd(28)} coverage ${row.coverage} ${row.error ?? ''}  [painted ${stat.painted} chroma ${stat.chroma} plain ${stat.plain} lifted ${stat.lifted} inverted ${inverted.includes(row.name.replace('.svg', ''))}]`)
  }
  process.exit(4)
}
const weakest = logos.slice().sort((a, b) => a.coverage - b.coverage).slice(0, 3)
console.log(`every tile verified above the floor. Thinnest three: ${weakest.map((row) => `${row.name.replace('.svg', '')} ${row.coverage}`).join(', ')}`)
