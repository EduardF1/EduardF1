```text
  _____    _                     _
 | ____|__| |_   _  __ _ _ __ __| |
 |  _| / _` | | | |/ _` | '__/ _` |
 | |__| (_| | |_| | (_| | | | (_| |
 |_____\__,_|\__,_|\__,_|_|  \__,_|

 Eduard Fischer-Szava, Aarhus, Denmark
 full-stack and platform engineer, C#/.NET and TypeScript
```

Romanian mother tongue, fluent Danish and English. Nine years in Denmark, five of them shipping software for Danish companies: a national election platform, an energy company's customer self-service platform, a renewable-energy SaaS, and a mission-critical defence suite.

At home I run a small AI estate on one RTX 5090. It is not a demo: a task bus where cloud models cross-review each other's work, mechanical quality gates, a local model fleet, and a control surface I built to watch all of it. The operations layer is PowerShell; the services and MCP servers are TypeScript and Python.

```text
                          operator
                             |
                   +---------v---------+
                   |   A2A task bus    |   every task carries a spec,
                   |   claim / verdict |   a verifier and a paper trail
                   +----+---------+----+
                        |         |
         +--------------v--+   +--v----------------------+
         | local fleet     |   | cloud reviewers         |
         | RTX 5090, Ollama|   | DeepSeek, Kimi, GLM     |
         | and llama.cpp   |   | a verdict needs 3 of 3  |
         +--------+--------+   +-----------+-------------+
                  |                        |
    +-------------v------------------------v--------------+
    |  quality gates: review gate, audit gate, boundary   |
    |  gate, test coverage measured by execution trace    |
    +-------+------------------+------------------+-------+
            |                  |                  |
   +--------v-------+  +-------v--------+  +------v---------+
   | knowledge vault|  | OmniControl    |  | observability  |
   | Postgres,      |  | shell + BFF,   |  | Prometheus,    |
   | pgvector, MCP  |  | 20 modules     |  | Grafana, OTel  |
   +----------------+  +----------------+  +----------------+
```

## Open source

**45 merged pull requests across 32 upstream projects.** Small and precise, mostly docs, types and behaviour fixes: [angular](https://github.com/angular/angular), [eslint](https://github.com/eslint/eslint), [jest](https://github.com/jestjs/jest), [vite](https://github.com/vitejs/vite), [freeCodeCamp](https://github.com/freeCodeCamp/freeCodeCamp), [dotnet/aspnetcore](https://github.com/dotnet/aspnetcore), [dotnet/sdk](https://github.com/dotnet/sdk), [dotnet/EntityFramework.Docs](https://github.com/dotnet/EntityFramework.Docs), [fastify](https://github.com/fastify/fastify), [hono](https://github.com/honojs/hono), [react-hook-form](https://github.com/react-hook-form/react-hook-form), [kobalte](https://github.com/kobaltedev/kobalte), [recharts](https://github.com/recharts/recharts), [MudBlazor](https://github.com/MudBlazor/MudBlazor) and others. The forks on this profile are the evidence trail. I track the merged count rather than stars, because merged upstream work is the number somebody else signed off on.

Most of my current code is private by choice: OmniControl (the control surface above), the estate itself, and a 2021 learning archive of 56 self-study projects. Two repositories from the VIA years are public: [`viauc-dai1-s22`](https://github.com/EduardF1/viauc-dai1-s22) and [`Android_Exam_Practice`](https://github.com/EduardF1/Android_Exam_Practice).

## Where I have worked

| When | Where | What |
| --- | --- | --- |
| 2026 | Mjølner Informatics, Aarhus | Frontend engineer and consultant on Mit Norlys, the customer self-service platform of Norlys: React 19 and TypeScript in an Nx monorepo, .NET 9 backend-for-frontend on an event-sourced CQRS stack (Marten, Wolverine), the team's Playwright CI foundation, and two live Datadog dashboards |
| 2024 to 2026 | Netcompany, Aarhus | IT consultant on KOMBIT VALG, Denmark's administrative election platform: C#/.NET and Angular, plus a UI component catalog for STIL's UA.dk |
| 2021 to 2024 | Greenbyte, Horsens | Software engineer on Kalenda, a renewable-energy SaaS: .NET Core, EF Core and React, and architect of the Flutter mobile app |
| 2021 to 2022 | Boozt Fashion, Malmö | System engineer on the boozt.com backend in PHP/Symfony |
| 2021 | Systematic, Aarhus | Junior systems engineer on the SitaWare suite: Java and Angular |

MSc in Technology-Based Business Development, Aarhus University. BSc in Software Technology Engineering, VIA University College.

## Stack, as it is actually used

```text
backend    C#/.NET, ASP.NET, EF Core   Java   PHP/Symfony   Python/FastAPI
frontend   TypeScript, React, Angular, Next.js, Electron, Storybook
mobile     Flutter/Dart
data       PostgreSQL with pgvector, MS SQL, MySQL
ops        Docker, GitHub Actions, Azure DevOps, PowerShell
observe    Datadog, Prometheus, Grafana, OpenTelemetry
test       Playwright, JUnit, PHPUnit, Vitest, Robot Framework
ai         Claude Code, OpenAI Codex, Google Antigravity, DeepSeek, OpenRouter, Ollama
```

## How I work

Measured work over vibes. Every change I ship carries a test record, and a claim of done is peer-reviewed before it counts. A post-mortem that only looks at the losses gets a paired win/loss count before it is allowed to become a rule, because a feature every failure shares is usually one the successes share too.
