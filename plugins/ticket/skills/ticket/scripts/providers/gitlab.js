// gitlab provider — create an issue via the GitLab REST API v4. Node built-ins only (fetch).
// Config (env): GITLAB_TOKEN, GITLAB_PROJECT (URL-encoded path or numeric id),
//               GITLAB_BASE_URL (optional, default https://gitlab.com).
// Options: dryRun.
'use strict';
const { renderMarkdown } = require('../lib/render.js');

function labelsFor(t) {
  return [`type:${t.type || 'task'}`, `priority:${t.priority || 'med'}`, ...(t.labels || [])];
}

function payloadFor(ticket) {
  // GitLab accepts raw markdown as description — pass the rendered body through unchanged.
  return {
    title: ticket.title || '',
    description: renderMarkdown(ticket, { includeTitle: false }),
    labels: labelsFor(ticket).join(','),
  };
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

// Dedupe via the project issues list (in=title keeps it narrow); this endpoint reads the
// database directly, so a just-created issue is visible immediately.
async function searchDup(base, project, headers, title) {
  const q = new URLSearchParams({ search: title, in: 'title', state: 'opened', per_page: '20' });
  const resp = await fetch(`${base}/api/v4/projects/${project}/issues?${q}`, { headers });
  if (!resp.ok) return null;
  const issues = await resp.json();
  return (Array.isArray(issues) ? issues : []).find((i) => i.title === title) || null;
}

async function emit(ticket, opts) {
  const title = (ticket.title || '').trim();
  if (!title) throw new Error('ticket has no title');

  if (opts.dryRun) {
    const base = process.env.GITLAB_BASE_URL || 'https://gitlab.com';
    const project = process.env.GITLAB_PROJECT || '<GITLAB_PROJECT>';
    return { preview: `[gitlab dry-run] POST ${base}/api/v4/projects/${encodeURIComponent(project)}/issues\n`
      + JSON.stringify(payloadFor(ticket), null, 2) };
  }

  const token = requireEnv('GITLAB_TOKEN');
  const project = encodeURIComponent(requireEnv('GITLAB_PROJECT'));
  const base = (process.env.GITLAB_BASE_URL || 'https://gitlab.com').replace(/\/+$/, '');
  const headers = { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json' };

  const dup = await searchDup(base, project, headers, title);
  if (dup) {
    process.stderr.write(
      `gitlab: an open issue with this title already exists: ${dup.web_url} (skipping create)\n`);
    return { provider: 'gitlab', ref: String(dup.iid), url: dup.web_url, deduped: true };
  }

  const resp = await fetch(`${base}/api/v4/projects/${project}/issues`, {
    method: 'POST', headers, body: JSON.stringify(payloadFor(ticket)),
  });
  if (!resp.ok) {
    const text = (await resp.text()).slice(0, 500);
    throw new Error(`gitlab create failed (${resp.status}): ${text}`);
  }
  const out = await resp.json();
  if (!out.iid || !out.web_url) throw new Error(`gitlab create returned no iid: ${JSON.stringify(out).slice(0, 300)}`);
  return { provider: 'gitlab', ref: String(out.iid), url: out.web_url };
}

module.exports = { emit };
