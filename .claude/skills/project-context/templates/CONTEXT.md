# <Project> — Context

Durable facts that are expensive to rediscover. Not a substitute for reading the code.
Everything here is a point-in-time claim: verify before relying on it.

**Last updated:** YYYY-MM-DD

## Core links

- Production: <url> — the alias users actually hit
- Staging / preview: <url>
- Repository: <org/repo> — verify with `git remote get-url origin`
- Hosting dashboard: <url>
- Database dashboard: <url>
- Error tracking / logs: <url>

## Environments

Which one is authoritative, and how to tell them apart from inside the code.

- Local `.env` points at: <host/db> — confirm before running any migration
- Production database: <where it lives, how it is reached>
- The dangerous confusion: <the two that look alike and are not>

## Deploying

The exact sequence, in order, with flags.

```bash
<command>
<command>
```

- Code and data migrations land in this order: <which first, and why the other order breaks>
- For env-var-only changes: <the shortcut, if one exists>

## Platform gotchas

Each line is a scar. Keep the reason attached — it is what stops someone re-adding the thing.

- <Do not do X.> It caused <what broke>, on <date>.
- <Y must be Z.> Otherwise <failure mode>.

## Decisions

Choices that look arbitrary from the code, and the reasoning that makes them not arbitrary.

- <Decision.> Because <reason>. Revisit if <the condition that would change the answer>.

## Security and operations

- Secrets that must never be committed: <files>
- Access that is non-obvious: <who can reach what>
- Known outstanding risks: <item> — <status, date>

## Corrections

When a fact here turns out to be wrong, record what it used to say. Someone will meet the old
value in a stale config, an old branch, or their own memory.

- YYYY-MM-DD: <field> was documented as `<old>`, is actually `<new>`. Found via <how>.
