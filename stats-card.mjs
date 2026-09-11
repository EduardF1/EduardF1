// stats-card.mjs: a static "git stats" card for the profile README from the GitHub GraphQL API (gh api graphql,
// as the account owner). Static on purpose: the hosted stats services 503 under load and the image then breaks
// on the profile page; a file in the repo cannot. Every number carries the window it was measured over.
// Run: node stats-card.mjs > assets/stats-card.svg
import { execFileSync } from "node:child_process";

const query = `query($login: String!) {
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
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
  }
}`;
const out = execFileSync("gh", ["api", "graphql", "-f", `query=${query}`, "-f", "login=EduardF1"], { encoding: "utf8" });
const u = JSON.parse(out).data.user;
const c = u.contributionsCollection;
const days = c.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
let longest = 0, run = 0, current = 0;
for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; if (run > longest) longest = run; }
for (let i = days.length - 1; i >= 0; i--) { if (days[i].contributionCount > 0) current++; else if (i === days.length - 1) continue; else break; }
const activeDays = days.filter((d) => d.contributionCount > 0).length;
const since = new Date(u.createdAt).getFullYear();
const stamp = new Date().toISOString().slice(0, 10);
const fmt = (n) => n.toLocaleString("en-US");

const rows = [
  ["contributions", fmt(c.contributionCalendar.totalContributions), "commits, PRs, reviews and issues on the calendar"],
  ["commits, public", fmt(c.totalCommitContributions), "commit contributions to public repositories"],
  ["private contributions", fmt(c.restrictedContributionsCount), "commits and pull requests in private repositories, counted, never listed"],
  ["pull requests", fmt(c.totalPullRequestContributions), "opened in the window; the merged upstream count is in the text above"],
  ["repos contributed to", fmt(u.repositoriesContributedTo.totalCount), "other people's repositories, all time"],
  ["active days", fmt(activeDays) + " of 365", "longest streak " + longest + " days, current " + current],
  ["own repositories", fmt(u.repositories.totalCount), "public and private, forks excluded; on GitHub since " + since],
];
const W = 760, PAD = 16, LH = 30, TOP = 48;
const H = TOP + rows.length * LH + PAD;
const lines = rows.map(([k, v, note], i) => {
  const y = TOP + i * LH;
  return `<text x="${PAD}" y="${y}" font-family="Consolas, Menlo, monospace" font-size="13" fill="#8b949e">${k}</text>
<text x="${PAD + 190}" y="${y}" font-family="Consolas, Menlo, monospace" font-size="15" font-weight="700" fill="#e6edf3">${v}</text>
<text x="${PAD + 330}" y="${y}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="12" fill="#8b949e">${note}</text>`;
}).join("\n");
console.log(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub statistics for EduardF1 over the last twelve months, measured ${stamp}">
  <rect width="${W}" height="${H}" rx="12" fill="#0d1117" stroke="#30363d"/>
  <text x="${PAD}" y="24" font-family="Consolas, Menlo, monospace" font-size="13" fill="#58a6ff">$ git stats --since "12 months ago"</text>
  <text x="${W - PAD}" y="24" text-anchor="end" font-family="Consolas, Menlo, monospace" font-size="11" fill="#8b949e">measured ${stamp}</text>
${lines}
</svg>`);
