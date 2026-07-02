# Provider adapters — the ticket-system connection layer

An adapter is the only thing that knows a specific ticket system. It receives a platform-neutral
**Canonical Ticket Model** and does the system-specific work of filing it. Add a new system by adding
one file — no core change.

## The contract

Each adapter is one Node.js module at `scripts/providers/<name>.js` exporting:

```js
async function emit(ticket, opts) { ... }
module.exports = { emit };
```

The dispatcher `scripts/ticket_emit.js` discovers adapters by filename, reads the ticket JSON from
stdin, and calls `emit`. Everything is **Node.js >= 18 built-ins only** — no npm installs, no shell
tools (`jq`, `curl`, `bash`). This keeps the plugin platform-agnostic (Linux, macOS, Windows) with a
single runtime probe: `node`.

`opts` carries: `dryRun` (bool), `out` (string|null), `repo` (string|null), `noLabels` (bool),
`extra` (array of unparsed args).

Every adapter MUST honour:

| Aspect | Rule |
|---|---|
| **Return: preview** | `{preview: <text>}` — printed as-is. Used for `--dry-run` (the exact payload it *would* send) and for renderers whose output *is* the deliverable. No external write may happen. |
| **Return: result** | `{provider: "<name>", ref: "<id>", url: "<url>"}` after a successful create (plus `deduped: true` when it skipped an existing ticket). Printed as one JSON line. |
| **Config** | Read only from environment variables (or an already-authenticated CLI like `gh`). Document them in the header comment. Never read from a hard-coded path. |
| **Dedupe** | Before creating, search the target for an open ticket with the same title; on a hit, return it with `deduped: true` instead of double-filing. |
| **Failure** | Throw an `Error` with a clear message. The dispatcher prints it to stderr and exits non-zero. Never return a fake success. Fail closed. |
| **Secrets** | Never echo tokens. If a required env var is missing, throw naming the variable. |

## Portability rules (this is a distributable plugin)

- Node >= 18 built-ins only (`fetch`, `child_process`, `fs`, `path`). If a future adapter truly needs
  a dependency, reconsider — a ticket API that can't be reached with `fetch` is rare.
- Reference bundled files only relative to the module's own path (`__dirname`), and from the skill via
  `${CLAUDE_PLUGIN_ROOT}` — never `~/.claude`, `~/.secrets`, or absolute home paths.
- All configuration comes from env/argv. The plugin ships no credentials.
- Use `spawnSync(cmd, args, ...)` (argument arrays), never string interpolation into a shell.

## Bundled adapters (v1)

- **markdown** — no config. Renders the model to a Markdown ticket (stdout, or `--out FILE`).
  The zero-dependency default and the reference renderer (`lib/render.js`).
- **github** — needs an authenticated `gh` CLI. Maps to `gh issue create` (title, `--body-file -`,
  `--label`, `--assignee`); dedupes via `gh issue list --search`; falls back to label-less create when
  the repo lacks the labels. Honours `--repo OWNER/NAME`.
- **jira** — needs `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`. Maps to
  `POST /rest/api/3/issue` (summary, issuetype, ADF description, priority, labels) via `fetch`;
  dedupes via JQL search.
- **gitlab** — needs `GITLAB_TOKEN`, `GITLAB_PROJECT` (path or numeric id); optional
  `GITLAB_BASE_URL` (default `https://gitlab.com`). Maps to `POST /api/v4/projects/:id/issues`
  (title, markdown description, comma-joined labels) via `fetch`; dedupes via the real-time
  project issues list (`in=title`).

## Field mapping cheat-sheet

| Canonical | Markdown | GitHub | Jira |
|---|---|---|---|
| `title` | `# ` heading | `--title` | `fields.summary` |
| `type` | badge line | label `type:<t>` | `fields.issuetype.name` (bug→Bug, feature→Story, chore/spike→Task, epic→Epic) |
| `context` | `## Context` | body | ADF description |
| `repro` | `## Reproduction` | body | ADF description |
| `scope.in/out` | `## Scope` / `## Out of scope` | body | ADF description |
| `acceptance` | `## Acceptance criteria` task-list | body `- [ ]` | ADF description |
| `verification` | `## Verification` task-list | body `- [ ]` | ADF description |
| `priority` | badge line | label `priority:<p>` | `fields.priority.name` |
| `labels` | badge line | `--label` (repeated) | `fields.labels` |
| `assignee` | badge line | `--assignee` | (v2) |
| `links.*` | `## Links` | body refs (`Part of #N`) | (v2: issue links) |

## Adding a new provider

1. Copy `providers/markdown.js` (simplest) or `providers/github.js` (CLI-based) or
   `providers/jira.js` (REST-based) as a starting point.
2. Implement `emit(ticket, opts)`: map fields to the target's payload.
3. Implement the `dryRun` branch first — return `{preview: ...}` with the exact payload.
4. Implement create: dedupe, then file, then return `{provider, ref, url}`. Throw on any error.
5. Document required env vars in the header comment. Add a test in `tests/emit.test.js` (repo).
   Done — the dispatcher finds it by filename.
