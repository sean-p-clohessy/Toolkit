const icons = {
  target: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="7"/><path d="M24 3v7M24 38v7M3 24h7M38 24h7"/></svg>',
  chart: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 39V9M8 39h33M13 32l8-9 7 5 11-15"/><path d="M32 13h7v7"/></svg>',
  connections: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="12" cy="24" r="5"/><circle cx="36" cy="12" r="5"/><circle cx="36" cy="36" r="5"/><path d="m17 22 14-8M17 26l14 8"/></svg>',
  search: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="21" cy="21" r="12"/><path d="m30 30 10 10M17 21h8M21 17v8"/></svg>',
  document: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 5h18l7 7v31H12zM30 5v8h7M18 21h13M18 28h13"/><circle cx="32" cy="36" r="7"/></svg>'
};

function renderTools() {
  const grid = document.querySelector('[data-tool-grid]');
  if (!grid || !Array.isArray(window.TOOLKIT_TOOLS)) return;
  grid.innerHTML = window.TOOLKIT_TOOLS.map((tool, index) => `
    <a class="tool-card" style="--tool-accent:${tool.accent}" href="${tool.url}" target="_blank" rel="noopener noreferrer" aria-label="${tool.title} — ${tool.cta} (opens in a new tab)">
      <div class="card-top"><span class="card-index">0${index + 1}</span><span class="tool-icon">${icons[tool.icon] || icons.target}</span></div>
      <div class="card-copy"><p class="category">${tool.category}</p><h3>${tool.title}</h3><p>${tool.description}</p></div>
      <div class="card-footer"><div class="tags">${(tool.tags || []).map(tag => `<span>${tag}</span>`).join('')}</div><span class="card-cta">${tool.cta} <span aria-hidden="true">→</span></span></div>
    </a>`).join('');
}

function cleanSummary(message) {
  const firstLine = String(message || '').split('\n')[0].replace(/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\([^)]*\))?!?:\s*/i, '');
  return firstLine ? firstLine.charAt(0).toUpperCase() + firstLine.slice(1) : 'Project update';
}

function renderUpdates(items) {
  const region = document.querySelector('[data-updates]');
  if (!region) return;
  if (!Array.isArray(items) || !items.length) {
    region.innerHTML = '<div class="updates-state"><strong>No updates yet.</strong><span>Recent changes to the tools will appear here automatically.</span></div>';
    return;
  }
  region.innerHTML = items.slice(0, 8).map(item => {
    const date = new Date(item.timestamp);
    const dateText = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    return `<article class="update-item"><div><span class="update-tool">${item.tool || item.repository || 'Toolkit'}</span><time datetime="${item.timestamp || ''}">${dateText}</time></div><h3>${cleanSummary(item.summary || item.message || item.title)}</h3>${item.url ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer" aria-label="View update for ${item.tool || item.repository}">View change <span aria-hidden="true">↗</span></a>` : ''}</article>`;
  }).join('');
}

async function loadUpdates() {
  const region = document.querySelector('[data-updates]');
  if (!region || region.getAttribute('aria-busy') === 'true') return;
  const retrying = region.contains(document.activeElement);
  region.setAttribute('aria-busy', 'true');
  region.innerHTML = '<div class="updates-state">Checking for recent updates…</div>';
  try {
    const response = await fetch('data/updates.json', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('No updates file');
    const data = await response.json();
    const items = Array.isArray(data) ? data : data.updates;
    if (!Array.isArray(items)) throw new Error('Invalid updates data');
    renderUpdates(items);
    if (retrying) {
      const heading = document.querySelector('#updates-title');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  } catch (_) {
    region.innerHTML = '<div class="updates-state"><strong>Updates couldn’t be loaded.</strong><span>The tools are still available. Check your connection and try again.</span><button class="button retry-button" type="button" data-retry-updates>Try again</button></div>';
    const retry = region.querySelector('[data-retry-updates]');
    retry.addEventListener('click', loadUpdates);
    if (retrying) retry.focus({ preventScroll: true });
  } finally {
    region.setAttribute('aria-busy', 'false');
  }
}

function setupNavigation() {
  const button = document.querySelector('[data-menu-button]');
  const nav = document.querySelector('[data-nav]');
  if (!button || !nav) return;
  button.addEventListener('click', () => { const open = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!open)); nav.classList.toggle('is-open', !open); });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { button.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      button.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      button.focus();
    }
  });
}

renderTools();
loadUpdates();
setupNavigation();
document.querySelector('[data-year]').textContent = new Date().getFullYear();
