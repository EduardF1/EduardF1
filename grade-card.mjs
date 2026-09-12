// grade-card.mjs: the compact stats card with the grade ring, in the github-readme-stats shape but
// generated HERE and committed as a file.
//
// Why not the hosted service: it 503s under load and the profile then shows a broken image. Why not
// the Action that commits for you: it is the same idea with a scheduled runner and a token, and this
// repo already had a working local generator to extend. The card is a FILE, so the profile renders
// whether or not anyone else's server is awake.
//
// The grade is computed from this account's own numbers and the formula is printed below, because a
// letter grade with a hidden formula is decoration, not a measurement.
//
// Run: node grade-card.mjs > assets/grade-card.svg
import { execFileSync } from 'node:child_process'

const QUERY = `query($login: String!) {
  user(login: $login) {
    createdAt
    followers { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false) { totalCount }
    repositoriesContributedTo(contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, PULL_REQUEST_REVIEW], includeUserRepositories: false) { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      restrictedContributionsCount
      contributionCalendar { totalContributions }
    }
  }
}`

const raw = execFileSync('gh', ['api', 'graphql', '-f', `query=${QUERY}`, '-f', 'login=EduardF1'], { encoding: 'utf8' })
const user = JSON.parse(raw).data.user
const contrib = user.contributionsCollection
const stamp = new Date().toISOString().slice(0, 10)
const fmt = (value) => value.toLocaleString('en-US')

const commits = contrib.totalCommitContributions + contrib.restrictedContributionsCount
const prs = contrib.totalPullRequestContributions
const reviews = contrib.totalPullRequestReviewContributions
const issues = contrib.totalIssueContributions
const contributedTo = user.repositoriesContributedTo.totalCount
const repos = user.repositories.totalCount

/**
 * The grade, stated so it can be argued with. Each component is a share of a stated target, capped
 * at 1, and the grade is the weighted mean. The targets are deliberately ordinary yearly numbers for
 * an active engineer, not records: a scale nobody can reach makes every grade the same letter.
 */
const COMPONENTS = [
  { label: 'commits', value: commits, target: 1000, weight: 3 },
  { label: 'pull requests', value: prs, target: 150, weight: 2 },
  { label: 'reviews', value: reviews, target: 50, weight: 1 },
  { label: 'issues', value: issues, target: 50, weight: 1 },
  { label: 'repos contributed to', value: contributedTo, target: 40, weight: 2 },
  { label: 'own repositories', value: repos, target: 40, weight: 1 },
]
const totalWeight = COMPONENTS.reduce((sum, part) => sum + part.weight, 0)
const score = COMPONENTS.reduce((sum, part) => sum + Math.min(part.value / part.target, 1) * part.weight, 0) / totalWeight

const BANDS = [
  [0.95, 'A++'], [0.85, 'A+'], [0.75, 'A'], [0.65, 'B+'],
  [0.55, 'B'], [0.45, 'C+'], [0.0, 'C'],
]
const grade = BANDS.find(([floor]) => score >= floor)[1]

const ROWS = [
  ['Total Commits', fmt(commits), 'public and private, last 12 months'],
  ['Total PRs', fmt(prs), 'opened in the window'],
  ['Total Reviews', fmt(reviews), 'pull requests reviewed'],
  ['Total Issues', fmt(issues), 'opened in the window'],
  ['Contributed to', fmt(contributedTo), "other people's repositories, all time"],
]

const WIDTH = 500
const HEIGHT = 200
const PAD = 24
const ROW_TOP = 74
const ROW_HEIGHT = 23
const RING_X = 400
const RING_Y = 108
const RING_R = 38
const CIRC = 2 * Math.PI * RING_R
const dash = CIRC * score

const icons = ['●', '◆', '▲', '■', '✦']
const rows = ROWS.map(([label, value], index) => {
  const y = ROW_TOP + index * ROW_HEIGHT
  return `  <text x="${PAD}" y="${y}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="12" fill="#7aa8d4">${icons[index]}</text>
  <text x="${PAD + 20}" y="${y}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="12.5" fill="#8b949e">${label}:</text>
  <text x="${RING_X - 70}" y="${y}" text-anchor="end" font-family="Consolas, Menlo, monospace" font-size="13.5" font-weight="700" fill="#e6edf3">${value}</text>`
}).join('\n')

process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="GitHub statistics for EduardF1: ${fmt(commits)} commits, ${fmt(prs)} pull requests, ${fmt(reviews)} reviews, ${fmt(issues)} issues, ${fmt(contributedTo)} repositories contributed to, grade ${grade}, measured ${stamp}">
  <rect width="${WIDTH}" height="${HEIGHT}" rx="12" fill="#0d1117" stroke="#30363d"/>
  <text x="${PAD}" y="34" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#58a6ff">Eduard Fischer-Szava</text>
  <text x="${PAD}" y="52" font-family="Consolas, Menlo, monospace" font-size="11" fill="#8b949e">last 12 months, measured ${stamp}</text>
${rows}
  <circle cx="${RING_X}" cy="${RING_Y}" r="${RING_R}" fill="none" stroke="#21262d" stroke-width="7"/>
  <circle cx="${RING_X}" cy="${RING_Y}" r="${RING_R}" fill="none" stroke="#7aa8d4" stroke-width="7"
          stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${(CIRC - dash).toFixed(1)}"
          transform="rotate(-90 ${RING_X} ${RING_Y})"/>
  <text x="${RING_X}" y="${RING_Y}" text-anchor="middle" dominant-baseline="central"
        font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#e6edf3">${grade}</text>
</svg>
`)

console.error(`grade ${grade} from score ${score.toFixed(3)}`)
for (const part of COMPONENTS) {
  console.error(`  ${part.label.padEnd(22)} ${String(part.value).padStart(6)} / ${part.target}  weight ${part.weight}  -> ${Math.min(part.value / part.target, 1).toFixed(2)}`)
}
