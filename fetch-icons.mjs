// fetch-icons.mjs: pull every technology logo into assets/icons/ so the README never depends on a
// CDN at render time. Same reasoning as the static stats cards: a hosted service that 503s leaves a
// broken image on the profile, and a file in the repo cannot.
//
// Source of truth for the list is the portfolio's src/lib/tech.ts, so the README and
// eduardfischer.dev cannot drift apart.
//
// Four sources are tried in order, because no single one covers 88 technologies:
//   1. the icon field in tech.ts, if it is a full URL (Simple Icons, GitHub org avatars)
//   2. devicons, across its five naming variants
//   3. Simple Icons by slug
//   4. a monogram tile generated locally, so every technology has SOMETHING and the grid never
//      shows a broken image
//
// Run: node fetch-icons.mjs
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const TECH_TS = 'D:/projects/portfolio/src/lib/tech.ts'
const OUT_DIR = 'assets/icons'
const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons'
const SIMPLE = 'https://cdn.simpleicons.org'
const VARIANTS = ['original', 'plain', 'original-wordmark', 'plain-wordmark', 'line']
/** Devicon slugs that differ from the tech.ts icon field, or that live under another name. */
const DEVICON_ALIASES = {
  aspnet: 'dotnetcore', 'ef-core': 'dotnetcore', jboss: 'java', 'jax-rs': 'java', 'jax-ws': 'java',
  doctrine: 'php', twig: 'php', guzzle: 'php', 'lexik-jwt': 'php', phpunit: 'php', behat: 'php',
  mockery: 'php', xunit: 'csharp', cucumber: 'ruby', 'robot-framework': 'python',
  mongoose: 'mongodb', realm: 'mongodb', teamcity: 'jetbrains', rider: 'jetbrains',
  webstorm: 'webstorm', 'jetbrains-toolbox': 'jetbrains', circleci: 'circleci', cmd: 'windows11',
  splunk: 'splunk',
}

mkdirSync(OUT_DIR, { recursive: true })

const source = readFileSync(TECH_TS, 'utf8')
const entries = []
for (const match of source.matchAll(/slug:\s*"([^"]+)"([\s\S]*?)(?=slug:\s*"|$)/g)) {
  const [, slug, body] = match
  const name = (/name:\s*"([^"]+)"/.exec(body) ?? [])[1]
  const category = (/category:\s*"([^"]+)"/.exec(body) ?? [])[1]
  const iconMatch = /icon:\s*(null|"([^"]*)")/.exec(body)
  const icon = !iconMatch || iconMatch[1] === 'null' ? null : iconMatch[2]
  if (name && category) entries.push({ slug, name, category, icon })
}
console.log(`tech entries: ${entries.length}`)

async function fetchAsset(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (type.includes('svg')) {
      const text = await res.text()
      return text.includes('<svg') ? { ext: 'svg', body: text } : null
    }
    if (type.includes('png')) {
      const buf = Buffer.from(await res.arrayBuffer())
      return buf.length > 200 ? { ext: 'png', body: buf } : null
    }
    const text = await res.text()
    return text.includes('<svg') ? { ext: 'svg', body: text } : null
  } catch {
    return null
  }
}

/** A readable tile for a technology with no published logo. Never a broken image. */
function monogram(name) {
  const letters = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="26" fill="#1f2430"/>
  <text x="64" y="64" fill="#7aa8d4" font-family="Segoe UI, Helvetica, Arial, sans-serif"
        font-size="46" font-weight="700" text-anchor="middle" dominant-baseline="central">${letters}</text>
</svg>`
}

const already = new Set(readdirSync(OUT_DIR).map((file) => file.replace(/\.(svg|png)$/, '')))
let fetched = 0
let drawn = 0
const sources = {}

for (const entry of entries) {
  if (already.has(entry.slug)) { sources[entry.slug] = 'cached'; continue }
  const candidates = []
  if (entry.icon?.startsWith('http')) candidates.push(entry.icon)
  const deviconSlug = DEVICON_ALIASES[entry.slug] ?? (entry.icon && !entry.icon.startsWith('http') ? entry.icon : entry.slug)
  for (const variant of VARIANTS) candidates.push(`${DEVICON}/${deviconSlug}/${deviconSlug}-${variant}.svg`)
  candidates.push(`${SIMPLE}/${entry.slug}`)
  candidates.push(`${SIMPLE}/${entry.slug.replace(/-/g, '')}`)

  let asset = null
  for (const url of candidates) {
    asset = await fetchAsset(url)
    if (asset) { sources[entry.slug] = url; break }
  }
  if (asset) {
    writeFileSync(join(OUT_DIR, `${entry.slug}.${asset.ext}`), asset.body)
    fetched++
    process.stdout.write('.')
  } else {
    writeFileSync(join(OUT_DIR, `${entry.slug}.svg`), monogram(entry.name), 'utf8')
    sources[entry.slug] = 'monogram'
    drawn++
    process.stdout.write('m')
  }
}

const onDisk = readdirSync(OUT_DIR)
console.log(`\nicons on disk: ${onDisk.length} for ${entries.length} technologies`)
console.log(`fetched this run: ${fetched}, monograms drawn: ${drawn}`)
const mono = Object.entries(sources).filter(([, value]) => value === 'monogram').map(([key]) => key)
if (mono.length) console.log(`monogram tiles (no published logo found): ${mono.join(', ')}`)
writeFileSync('assets/tech.json', JSON.stringify(entries, null, 1), 'utf8')
console.log('wrote assets/tech.json')
