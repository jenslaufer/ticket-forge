# Your coding agent is only as good as your ticket

We automated the cheap part. Agents write the code in minutes. The step before — turning an idea
into precise work — is still two vague lines and hope.

Vague tickets used to be survivable. A developer would frown, walk over, ask. A human absorbed the
ambiguity. An agent doesn't frown. It picks one plausible interpretation and executes it — five
hundred lines deep.

The ticket is the spec now.

So I built **ticket-forge**. You type:

```
/ticket users should be able to delete their own account
```

You get a ticket with context, scope, Given/When/Then acceptance criteria, verification steps —
and an explicit out-of-scope list, where the three-day rabbit holes live:

> **Out of scope** — data export before deletion (separate ticket) · admin-initiated deletion ·
> soft-delete / grace-period restore

Filed straight into GitHub Issues, Jira, or GitLab. Works in Claude Code and OpenAI Codex.
Open source, MIT.

This is the ticket I wish someone had handed me back when I was the developer.

Want the plugin? Drop **ticket-forge** in the comments and I'll send you the link.
