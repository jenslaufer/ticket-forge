# Your coding agent is only as good as your ticket

We automated the cheap part.

Coding agents write functions, tests, whole features. The code that used to take a day now takes
minutes. But watch what happens before the agent starts: someone types two vague sentences into a
prompt and hopes.

That step — turning an idea into a precise piece of work — was never automated. It was never even
respected. I spent years in software teams and I can count the genuinely precise tickets I received
on one hand. "Improve the export" was a normal Tuesday.

## Vague tickets used to be survivable

Here's the thing: vague tickets mostly worked, because a human sat on the other side.

A developer reads "improve the export", frowns, and walks over to ask what's actually broken. They
fill the gaps with domain knowledge, taste, and memory of the last three export bugs. The ambiguity
gets absorbed by a person before it becomes code.

An agent doesn't frown. It picks one plausible interpretation and executes it — fast, confidently,
five hundred lines deep. Ambiguity a human would have absorbed ships as a defect.

So the leverage flipped. The ticket is no longer a note that precedes the real spec. **The ticket is
the spec.** It's the last place where intent exists in writing before something acts on it.

## What a precise ticket looks like

Precision is not length. A precise ticket answers a fixed set of questions and stops:

- **One imperative title.** "Add password reset via email link." If you can't write this sentence,
  the work isn't ready.
- **Context.** What's broken, who's affected, why now.
- **Scope — in AND out.** The out-list is the highest-leverage field on the whole ticket. Silence is
  permission; an agent reads an unstated boundary as an invitation.
- **Acceptance criteria.** Given/When/Then, each one binary. Outcome, not method.
- **Verification.** The command or check that proves it's done.
- **Repro steps** for bugs. A bug report without expected-vs-actual is a rumor.

Nothing exotic. Teams have known this for decades. The difference is that the cost of skipping it
used to be a follow-up question. Now it's a wrong pull request.

## Two lines in, a ticket out

Here's what that looks like in practice. The input is the kind of sentence product people actually
say:

```
/ticket users should be able to delete their own account
```

The output — generated, not hand-polished:

> # Let users delete their own account
>
> `feature` · priority: `high` · `account` `gdpr` · estimate: 2-3 days
>
> **Context** — Users who want to leave have to email support and wait. That frustrates the user,
> creates support load, and is a GDPR risk: deletion requests must be honored without undue delay.
>
> **Scope** — "Delete account" action in account settings, behind a confirmation step · hard-delete
> of profile and personal data; anonymize rows other users depend on · confirmation email after
> deletion.
>
> **Out of scope** — Data export before deletion (separate ticket) · admin-initiated deletion ·
> soft-delete / grace-period restore.
>
> **Acceptance criteria**
> - [ ] Given a signed-in user in account settings, when they confirm account deletion, then they
>   are signed out and can no longer log in
> - [ ] Given a deleted account, when its data is looked up in the database, then personal data is
>   gone and shared records are anonymized
> - [ ] Given a deletion request, when it completes, then a confirmation email is sent to the
>   account's address
>
> **Verification**
> - [ ] Automated test: delete account → login rejected, personal rows gone, shared rows anonymized
> - [ ] Manual: confirmation email arrives; support inbox receives nothing

Look at the out-of-scope list. That's where the three-day rabbit holes live — the data export
someone "quickly" adds, the soft-delete debate. They're named and excluded before anyone burns a
day on them.

This is the ticket I wish someone had handed me back when I was the developer on the other side of
"add delete account".

## Separate the precision from the plumbing

There's a second trap: coupling the thinking to the tool. Ticket quality advice always seems to come
wrapped in a specific system — Jira rituals, GitHub templates. Then you switch tools and lose the
practice.

These are two different problems:

1. **Precision** — turning intent into an unambiguous, testable unit of work.
2. **Plumbing** — getting that unit into whatever system your team uses.

So I built the split into a tool. A generator turns a rough idea into a canonical, platform-neutral
ticket model: title, type, context, scope in/out, Given/When/Then acceptance, verification, priority,
links. It knows nothing about ticket systems. A thin adapter layer takes that model and files it —
GitHub Issues via the `gh` CLI, Jira via its REST API, or plain Markdown if you just want the text.
Adding a system means adding one file, not touching the core.

And because precision claims are cheap, the tool can grade itself: an optional critic scores every
ticket against a fixed rubric — title quality, scope boundaries, testable acceptance, executor
readiness — and loops until it passes. Not because a score is truth, but because a mechanical
checklist catches the ambiguity you stopped seeing.

## Try it

It's an agent plugin — host-agnostic, open source, MIT. In Claude Code:

```
/plugin marketplace add jenslaufer/ticket-forge
/plugin install ticket@jenslaufer

/ticket users should be able to reset their password by email
/ticket --provider github --critic rate limiting for the public API
```

In OpenAI Codex, the same plugin installs via
`codex plugin marketplace add jenslaufer/ticket-forge` and `codex plugin add ticket@jenslaufer` —
one repo, one skill, two hosts. The precision layer doesn't care which agent runs it, just as it
doesn't care which tracker it files into.

The repo is at [github.com/jenslaufer/ticket-forge](https://github.com/jenslaufer/ticket-forge).
Adapters are one JavaScript file each — if your team lives in Linear or GitLab, the contract is
documented and small.

The agents will keep getting better at writing code. The scarce skill is now upstream: saying what
you want, precisely enough that it survives execution. That was always the job. Now it's the whole
job.

Want the plugin? Drop **ticket-forge** in the comments and I'll send you the link.
