// Loading the badge records a hit: request it once per page load, never poll it.
const isPublishedToolkit = ['edutools.uk', 'www.edutools.uk'].includes(location.hostname)
  || (location.hostname === 'sean-p-clohessy.github.io'
    && location.pathname.startsWith('/Toolkit/'));
const visitsCounter = document.querySelector('[data-visits]');
const visitsBadge = document.querySelector('[data-visits-badge]');

if (isPublishedToolkit && visitsCounter && visitsBadge) {
  visitsBadge.addEventListener('load', () => { visitsCounter.hidden = false; }, { once: true });
  visitsBadge.addEventListener('error', () => { visitsCounter.hidden = true; }, { once: true });
  visitsBadge.src = 'https://hits.sh/edutools.uk.svg?label=Visits&color=8293ad&labelColor=07152e';
}
