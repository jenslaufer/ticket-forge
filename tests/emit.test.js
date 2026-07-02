'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const EMIT = path.join(__dirname, '..', 'plugins', 'ticket', 'skills', 'ticket', 'scripts', 'ticket_emit.js');

const TICKET = JSON.stringify({
  title: 'Add CSV export to the report page',
  type: 'feature',
  context: 'Users copy tables by hand today.',
  scope: { in: ['Export button', 'CSV with current filters'], out: ['PDF export'] },
  acceptance: [{ given: 'a filtered report', when: 'the user clicks export', then: 'a CSV of the visible rows downloads' }],
  verification: ['Manual: export a filtered report, open the CSV'],
  priority: 'med',
  labels: ['reports'],
});

function run(args, { input = TICKET, env = {} } = {}) {
  return spawnSync('node', [EMIT, ...args],
    { input, encoding: 'utf8', env: { ...process.env, ...env } });
}

test('--list names the bundled providers', () => {
  const r = run(['--list'], { input: '' });
  assert.equal(r.status, 0);
  assert.deepEqual(r.stdout.trim().split('\n'), ['github', 'gitlab', 'jira', 'markdown']);
});

test('markdown: default prints the rendered ticket', () => {
  const r = run(['--provider', 'markdown']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^# Add CSV export to the report page\n/);
  assert.ok(r.stdout.includes('## Out of scope'));
});

test('markdown: --out writes the file and reports {provider,ref,url}', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ticket-')), 'ticket.md');
  const r = run(['--provider', 'markdown', '--out', out]);
  assert.equal(r.status, 0);
  const res = JSON.parse(r.stdout);
  assert.equal(res.provider, 'markdown');
  assert.equal(res.ref, out);
  assert.ok(res.url.startsWith('file://'));
  assert.ok(fs.readFileSync(out, 'utf8').includes('## Acceptance criteria'));
});

test('github: --dry-run previews the exact command and writes nothing', () => {
  const r = run(['--provider', 'github', '--dry-run', '--repo', 'owner/name']);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('[github dry-run] gh issue create'));
  assert.ok(r.stdout.includes('repo:     owner/name'));
  assert.ok(r.stdout.includes('labels:   type:feature priority:med reports'));
});

test('jira: --dry-run previews the REST payload with type/priority mapping', () => {
  const r = run(['--provider', 'jira', '--dry-run'],
    { env: { JIRA_BASE_URL: 'https://ex.atlassian.net', JIRA_PROJECT_KEY: 'ABC' } });
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('[jira dry-run] POST https://ex.atlassian.net/rest/api/3/issue'));
  const payload = JSON.parse(r.stdout.split('\n').slice(1).join('\n'));
  assert.equal(payload.fields.project.key, 'ABC');
  assert.equal(payload.fields.issuetype.name, 'Story');
  assert.equal(payload.fields.priority.name, 'Medium');
  assert.equal(payload.fields.description.type, 'doc');
});

test('gitlab: --dry-run previews the REST payload with markdown description', () => {
  const r = run(['--provider', 'gitlab', '--dry-run'],
    { env: { GITLAB_BASE_URL: 'https://git.example.com', GITLAB_PROJECT: 'group/repo' } });
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes(
    '[gitlab dry-run] POST https://git.example.com/api/v4/projects/group%2Frepo/issues'));
  const payload = JSON.parse(r.stdout.split('\n').slice(1).join('\n'));
  assert.equal(payload.title, 'Add CSV export to the report page');
  assert.equal(payload.labels, 'type:feature,priority:med,reports');
  assert.ok(payload.description.includes('## Acceptance criteria'));
});

test('fails closed: gitlab without config names the missing variable', () => {
  const env = { GITLAB_TOKEN: '', GITLAB_PROJECT: '', GITLAB_BASE_URL: '' };
  const r = run(['--provider', 'gitlab'], { env });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /GITLAB_TOKEN not set/);
});

test('fails closed: unknown provider', () => {
  const r = run(['--provider', 'linear']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown provider 'linear'/);
});

test('fails closed: missing --provider', () => {
  const r = run([]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--provider is required/);
});

test('fails closed: invalid JSON on stdin', () => {
  const r = run(['--provider', 'markdown'], { input: '{not json' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /invalid ticket JSON/);
});

test('fails closed: ticket without title (github, even dry-run)', () => {
  const r = run(['--provider', 'github', '--dry-run'], { input: '{"type":"bug"}' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ticket has no title/);
});

test('fails closed: jira without config names the missing variable', () => {
  const env = { JIRA_BASE_URL: '', JIRA_EMAIL: '', JIRA_API_TOKEN: '', JIRA_PROJECT_KEY: '' };
  const r = run(['--provider', 'jira'], { env });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /JIRA_BASE_URL not set/);
});
