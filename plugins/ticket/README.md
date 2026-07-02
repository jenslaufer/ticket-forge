# ticket

A Claude Code plugin that turns a rough idea into a precise, well-scoped ticket — and files it
into a real ticketing system through a pluggable provider layer.

Coding agents made writing code cheap. The expensive part moved upstream: deciding *what* to build,
precisely enough that an agent (or a human) can execute without guessing. A vague ticket used to be
buffered by a developer who asked questions. An agent executes the ambiguity. This plugin makes the
ticket the specification.

## What it does

```
rough idea
   │
   ▼
Generator ──► Canonical Ticket Model (platform-neutral JSON)
   │              title · type · context · repro · scope in/out ·
   │              acceptance (Given/When/Then) · verification · priority · labels · links
   ├── optional: --critic quality gate (10-metric rubric, loop until it passes)
   ▼
Provider layer ──► markdown │ github │ jira │ gitlab │ <your adapter>
```

The generator knows nothing about ticket systems. The adapters know nothing about ticket writing.
The Canonical Ticket Model is the contract between them.

## Install

```
/plugin marketplace add jenslaufer/claude-ticket
/plugin install ticket@jenslaufer
```

## Use

```
/ticket users should be able to reset their password by email
/ticket file this as a GitHub issue in myorg/myrepo: rate limiting for the public API
/ticket --provider jira --critic checkout crashes when the cart is empty
/ticket --provider github --dry-run add CSV export to the report page
```

- Default provider is `markdown` (no configuration, prints/writes the ticket).
- `--dry-run` shows the exact payload without writing anything external.
- `--critic` runs the ticket through a mechanical 10-metric quality rubric and fixes what fails.
- External writes (GitHub/Jira) are always previewed before filing.

## Provider configuration

| Provider | Needs |
|---|---|
| `markdown` | nothing |
| `github` | an authenticated [GitHub CLI](https://cli.github.com/) (`gh auth login`) |
| `jira` | env vars: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` |
| `gitlab` | env vars: `GITLAB_TOKEN`, `GITLAB_PROJECT`; optional `GITLAB_BASE_URL` (self-managed) |

## Add your own ticket system

One JavaScript file: `skills/ticket/scripts/providers/<name>.js` exporting
`async emit(ticket, opts)`. Node built-ins only. The dispatcher discovers it by
filename — no core change. Contract and worked examples:
[`skills/ticket/references/adapters.md`](skills/ticket/references/adapters.md).

### Build one with your coding agent

Working in a checkout of this repo, paste this prompt into your coding agent and
replace `<SYSTEM>` with your tracker (Linear, GitLab, Azure DevOps, ...):

```text
Add a <SYSTEM> adapter to the claude-ticket plugin in this repo.

1. Read plugins/ticket/skills/ticket/references/adapters.md — it defines the
   adapter contract. Follow it exactly.
2. Copy the closest existing adapter in plugins/ticket/skills/ticket/scripts/providers/
   as your starting point: markdown.js (pure renderer), github.js (wraps a CLI),
   jira.js (REST API via fetch).
3. Create plugins/ticket/skills/ticket/scripts/providers/<system>.js exporting
   async emit(ticket, opts). Hard requirements:
   - Node >= 18 built-ins only; no npm installs.
   - Implement the opts.dryRun branch first: return {preview: <the exact payload
     you would send>} and make no external call.
   - Config via environment variables only; throw an Error naming any missing
     variable. Never log tokens.
   - Dedupe before create: query open issues for the exact title via a real-time
     endpoint (not a lagging search index); on a hit return
     {provider, ref, url, deduped: true} instead of filing twice.
   - On success return {provider: "<system>", ref: "<id>", url: "<url>"}.
     Throw on any failure — never fake success.
4. Add tests to tests/emit.test.js: the --list output, the dry-run payload shape,
   and the missing-env failure naming the variable.
5. Run node --test tests/*.test.js — every test must pass.
```

The generated adapter needs no registration: the dispatcher picks it up by filename.

## Requirements

- Node.js >= 18 on PATH (built-ins only — no npm installs). Without Node, the skill degrades
  gracefully: markdown and GitHub still work (model-rendered / via `gh`); only Jira needs Node.
- Works on Linux, macOS, and Windows

## License

MIT
