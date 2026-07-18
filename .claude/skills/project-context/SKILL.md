---
name: project-context
description: Create and maintain a durable CONTEXT.md of hard-to-rediscover project facts — live URLs, dashboards, deploy commands, platform gotchas, and decisions with their reasons. Use when starting work in an unfamiliar repo, when the user asks to "write up project context" / "document how this deploys" / "set up context docs", when a painful fact was just rediscovered (a deploy gotcha, a real repo URL, a workaround), or before trusting an existing context doc.
---

# Project context docs

Long-lived projects accumulate facts that live nowhere in the code: which Vercel project deploys this, why `prisma migrate deploy` was removed from the build, what the production alias actually is. Rediscovering them costs a session every time. This skill captures them once, in a form that resists rot.

## The one rule

**Write only what the repo cannot answer for itself.**

A fact belongs in `CONTEXT.md` if answering it requires a dashboard login, an outage, or someone's memory. It does not belong there if `git`, `ls`, `package.json`, or a grep answers it.

| Belongs | Does not belong |
|---|---|
| Production URL and who aliases it | Directory tree |
| Deploy command, in order, with flags | Dependency list |
| "Don't do X in the build — it timed out" | File or route counts |
| Why a schema change is applied manually | Lines of code, "45 packages" |
| Which DB the local `.env` points at | Feature checklists, "✅ Complete" |
| A decision **and the reason for it** | Restating what a function does |

The right-hand column is where context docs go to die. It reads as authoritative, it is trivially checkable, and nobody ever checks it. Enumerating derivable facts is not documentation — it is a snapshot with a decaying half-life.

## Before you trust an existing context doc

Context docs are point-in-time claims, not live state. Treat any file you did not write this session as **unverified**. Before acting on a claim, verify it — especially the ones that look most confident.

Cheap checks that catch most rot:

```bash
git remote get-url origin        # vs. the repo URL the doc names
git log -1 --format=%cd          # how stale is the tree vs. the doc's date
node -e "console.log(new URL(process.env.DATABASE_URL).hostname)"   # local vs. prod DB
```

Correct what you find, in the doc, in the same session. A wrong context doc is worse than none: it converts a five-minute lookup into an hour chasing a URL that never existed.

If a fact is load-bearing and unverifiable right now, mark it rather than deleting it:

```markdown
- Production alias: helpdesk.example.gov  <!-- UNVERIFIED 2026-07-09 — dashboard access needed -->
```

## Writing it

Start from `templates/CONTEXT.md` in this skill directory. Adapt the headings to the project; drop sections that would be empty. An empty section is an invitation to pad it.

Each entry follows one shape:

> **The fact.** Why it is true, or what broke when it wasn't.

The "why" is the part that survives. `Build command is prisma generate && next build` decays into a line someone deletes during a refactor. `Build command is prisma generate && next build — do not add prisma migrate deploy, it timed out the Vercel build` defends itself.

Date-stamp absolutely (`2026-07-09`), never relatively ("last week", "recently"). Relative dates are unreadable the moment the doc outlives the memory of when it was written.

## Maintaining it

Add a fact the moment it costs you something to learn. The signal is having just said, or thought, *"I wish I'd known that."* That is the entry. Write it before finishing the task that surfaced it, while the reason is still in your head — the fact is easy to reconstruct later, the reason is not.

When a documented fact turns out wrong, fix it in place and keep a one-line history of what it used to say. The correction is itself a fact worth having; someone will hit the old value in a cached config or an old branch.

## Where it goes, and what else lives nearby

Three stores, three jobs. Do not merge them.

**`CONTEXT.md`** — durable facts about the project. Committed. Everyone on the team reads it, including future you.

**`CLAUDE.md`** — instructions *to Claude* about how to work in this repo: conventions, commands to prefer, things not to touch. Committed. If it reads like documentation rather than instruction, it belongs in `CONTEXT.md`.

**Memory directory** — cross-session, personal, uncommitted. Facts about *you* and your working style, not about the project. If a teammate would need the fact, it goes in `CONTEXT.md` instead.

The failure mode is a project with nine markdown files where three would do: an index of the docs, a summary of the docs, and a manifest of the files, each stale in a different direction. Prefer one `CONTEXT.md` that is right over a documentation suite that is comprehensive and wrong. When you find yourself creating `DOCUMENTATION_INDEX.md`, you have too many documents, and the fix is to delete some.

## Bootstrapping in a new repo

1. Read `README.md`, `package.json` scripts, and any CI or deploy config.
2. Run `git remote -v` and check for `vercel.json`, `.vercel/`, `Dockerfile`, `.github/workflows/`.
3. Ask the user only for what you genuinely cannot observe: dashboard URLs, why a workaround exists, which environment is authoritative. Do not ask for anything a command answers.
4. Write `CONTEXT.md`. Leave a section out rather than guessing at it.
5. Tell the user which entries you inferred rather than confirmed, so they can correct you while it is cheap.
