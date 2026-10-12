import { readFile, writeFile } from 'node:fs/promises';

const owner = 'sean-p-clohessy';
const tools = [
  ['EHCP Outcome Cruncher', 'EHCP-Outcome-Cruncher'],
  ['SMART Target Builder', 'SMARTTargetBuilder'],
  ['Progress Tracking Builder', 'ProgressPointBuilder'],
  ['CPD Finder', 'CPD-Finder'],
  ['Assessment Record Builder', 'AssessmentRecordBuilder'],
  ['Exam Booker', 'exam-booker'],
  ['Evidence, Please', 'evidence-please']
];
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'toolkit-update-aggregator' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const ignored = /^(merge\b|bump\b|chore\(deps\)|dependabot|renovate)|\[skip ci\]/i;
const updates = [];
for (const [tool, repository] of tools) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repository}/commits?per_page=10`, { headers });
  if (!response.ok) { console.warn(`${repository}: GitHub returned ${response.status}`); continue; }
  for (const commit of await response.json()) {
    const message = commit.commit?.message?.split('\n')[0]?.trim();
    if (!message || ignored.test(message) || commit.author?.login?.endsWith('[bot]')) continue;
    updates.push({ tool, repository, type: 'commit', summary: message, url: commit.html_url, timestamp: commit.commit.author.date, author: commit.commit.author.name });
  }
}
updates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
const latest = updates.slice(0, 10);
const path = new URL('../data/updates.json', import.meta.url);
const previous = await readFile(path, 'utf8').catch(() => '');
let previousUpdates = [];
try { previousUpdates = JSON.parse(previous).updates || []; } catch {}
if (JSON.stringify(previousUpdates) !== JSON.stringify(latest)) {
  const output = JSON.stringify({ generatedAt: new Date().toISOString(), updates: latest }, null, 2) + '\n';
  await writeFile(path, output);
}
