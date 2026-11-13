import { address, arrayTrace, choices, flowTrace, formatByte, linkedTrace, queueOrder, startingValues } from './model.js';

const get = (id) => document.getElementById(id);
const positions = { array: 0, linked: 0, flow: 0 };
const checkedChoices = new Map();
let format = 'decimal';
let predictionResult = '';

function slot(value, index, caption, markers = []) {
  return `<div class="slot${markers.length ? ' marked' : ''}">
    <span class="slot-index">${index}</span>
    <strong class="slot-value${value === null ? ' empty' : ''}">${formatByte(value, format)}</strong>
    <span class="slot-address">${caption}</span>
    ${markers.length ? `<span class="slot-mark">${markers.join(' · ')}</span>` : ''}
  </div>`;
}

function updateControls(id, step, length) {
  const next = step.next ? `Next · ${step.next}` : 'Trace complete. Reset to run it again.';
  get(`${id}-next`).textContent = `${positions[id] + 1} / ${length} · ${next}`;
  get(`${id}-step`).setAttribute('aria-disabled', String(!step.next));
  const result = get(`${id}-result`);
  if (result.textContent !== step.result) result.textContent = step.result;
}

function renderArray() {
  const step = arrayTrace[positions.array];
  const slots = step.slots.map((value, index) => {
    const marks = [];
    if (step.read === index) marks.push('Read');
    if (step.write === index) marks.push('Write');
    return slot(value, `Index ${index}`, address(step.base + index), marks);
  });
  get('array-diagram').innerHTML = `
    <p class="diagram-meta">Start ${address(step.base)} · Size ${step.size} · Capacity ${step.slots.length} slots</p>
    <div class="slots">${slots.join('')}</div>`;
  updateControls('array', step, arrayTrace.length);
}

function renderLinked() {
  const step = linkedTrace[positions.linked];
  const nodes = [...step.nodes].sort((a, b) => a.at - b.at).map((node) => {
    const mark = step.active === node.at ? ['Current node'] : [];
    return slot(node.value, `At ${address(node.at)}`, `Next → ${address(node.next)}`, mark);
  });
  const visits = step.visited.map(address).join(' → ');
  get('linked-diagram').innerHTML = `
    <p class="diagram-meta">Head → ${address(step.head)} · Nodes shown by address</p>
    <div class="slots">${nodes.join('')}</div>
    ${visits ? `<p class="visit-path">Visited ${visits}</p>` : ''}`;
  updateControls('linked', step, linkedTrace.length);
}

function renderFlow() {
  const step = flowTrace[positions.flow];
  const stack = step.stack.map((value, index) => slot(
    value, `Slot ${index}`, address(0x70 + index),
    index === step.stackSize - 1 ? ['Top'] : [],
  ));
  const queue = step.queue.map((value, index) => {
    const marks = [];
    if (step.queueSize && index === step.front) marks.push('Front');
    if (step.queueSize && index === (step.front + step.queueSize - 1) % step.queue.length) marks.push('Rear');
    if (step.queueSize < step.queue.length && index === step.nextWrite) marks.push('Next write');
    return slot(value, `Slot ${index}`, address(0x80 + index), marks);
  });
  get('stack-diagram').innerHTML = `<div class="slots">${stack.join('')}</div>`;
  get('queue-diagram').innerHTML = `<div class="slots">${queue.join('')}</div>`;
  get('stack-rule').textContent = step.stackSize
    ? `Next pop comes from slot ${step.stackSize - 1}.`
    : 'The stack is empty.';
  const order = queueOrder(step).map((value) => formatByte(value, format)).join(' → ');
  get('queue-rule').textContent = `Front to rear · ${order || 'Empty'}`;

  const canPredict = step.next === 'Pop and dequeue once';
  get('prediction').hidden = !canPredict;
  for (const id of ['predict-stack', 'predict-queue']) {
    const select = get(id);
    const previous = select.value;
    select.replaceChildren(
      new Option('Choose a value', ''),
      ...startingValues.map((value) => new Option(formatByte(value, format), String(value))),
    );
    select.value = previous;
  }
  const feedback = get('prediction-feedback');
  feedback.hidden = !predictionResult;
  if (feedback.textContent !== predictionResult) feedback.textContent = predictionResult;
  updateControls('flow', step, flowTrace.length);
}

const simulations = {
  array: { steps: arrayTrace, render: renderArray },
  linked: { steps: linkedTrace, render: renderLinked },
  flow: { steps: flowTrace, render: renderFlow },
};

for (const [id, { steps, render }] of Object.entries(simulations)) {
  get(`${id}-step`).addEventListener('click', () => {
    if (positions[id] >= steps.length - 1) return;
    const previous = steps[positions[id]];
    positions[id] += 1;
    if (id === 'flow' && previous.next === 'Pop and dequeue once') {
      const stackGuess = get('predict-stack').value;
      const queueGuess = get('predict-queue').value;
      const { stack, queue } = steps[positions.flow].firstRemoval;
      if (stackGuess && queueGuess) {
        const stackMatched = Number(stackGuess) === stack;
        const queueMatched = Number(queueGuess) === queue;
        predictionResult = `Stack prediction ${stackMatched ? 'matched' : 'needs review'}. Queue prediction ${queueMatched ? 'matched' : 'needs review'}.`;
      }
    }
    render();
    refreshTracePreview();
  });
  get(`${id}-reset`).addEventListener('click', () => {
    positions[id] = 0;
    if (id === 'flow') {
      predictionResult = '';
      get('predict-stack').value = '';
      get('predict-queue').value = '';
    }
    render();
    refreshTracePreview();
  });
  render();
}

for (const input of document.querySelectorAll('input[name="format"]')) {
  input.addEventListener('change', () => {
    format = input.value;
    for (const { render } of Object.values(simulations)) render();
  });
}

get('choice-grid').innerHTML = choices.map(({ id, title, request }) => `
  <form class="panel choice" data-case="${id}">
    <h3>${title}</h3>
    <p>${request}</p>
    <label class="field" for="choice-${id}">Structure for ${title.toLowerCase()}</label>
    <select id="choice-${id}" required>
      <option value="">Choose a structure</option>
      <option>Array</option><option>Linked list</option><option>Stack</option><option>Queue</option>
    </select>
    <button type="submit">Check choice</button>
    <p class="choice-result" role="status"></p>
  </form>`).join('');

for (const choice of choices) {
  const form = document.querySelector(`[data-case="${choice.id}"]`);
  const select = get(`choice-${choice.id}`);
  const feedback = form.querySelector('.choice-result');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const matched = select.value === choice.answer;
    checkedChoices.set(choice.id, { value: select.value, matched });
    feedback.dataset.result = matched ? 'correct' : 'review';
    feedback.textContent = matched ? `Correct. ${choice.explanation}` : `Try again. ${choice.clue}`;
    refreshTracePreview();
  });
  select.addEventListener('change', () => {
    feedback.textContent = '';
    checkedChoices.delete(choice.id);
    refreshTracePreview();
  });
}

function buildEvidence() {
  const blocks = ['Data Structures Lab · Level 3'];
  for (const [id, title] of [['array', 'Array-backed list'], ['linked', 'Linked list'], ['flow', 'Stack and circular queue']]) {
    const done = simulations[id].steps.slice(1, positions[id] + 1);
    if (done.length) blocks.push(`${title}\n${done.map(({ result }) => `- ${result}`).join('\n')}`);
  }
  if (predictionResult) blocks.push(predictionResult);
  const matches = choices.flatMap(({ id, title, explanation }) => {
    const attempt = checkedChoices.get(id);
    return attempt
      ? [`- ${title} · ${attempt.value}. ${attempt.matched ? explanation : 'Review this choice.'}`]
      : [];
  });
  if (matches.length) blocks.push(`Structure choices\n${matches.join('\n')}`);
  const explanation = get('explanation').value.trim();
  if (explanation) blocks.push(`My explanation\n${explanation}`);
  if (blocks.length === 1) blocks.push('Step through an activity or add your explanation to create a trace.');
  return blocks.join('\n\n');
}

function updateTraceText() {
  const text = buildEvidence();
  get('trace-text').value = text;
  return text;
}

function refreshTracePreview() {
  if (get('trace-preview').open) updateTraceText();
  get('copy-status').textContent = '';
}

get('trace-preview').addEventListener('toggle', () => {
  if (get('trace-preview').open) updateTraceText();
});
get('explanation').addEventListener('input', refreshTracePreview);
get('copy-trace').addEventListener('click', async () => {
  const text = updateTraceText();
  try {
    await navigator.clipboard.writeText(text);
    get('copy-status').textContent = 'Trace copied. Paste it into your slides.';
  } catch {
    get('trace-preview').open = true;
    get('trace-text').focus();
    get('trace-text').select();
    get('copy-status').textContent = 'Trace selected. Use your browser’s Copy command.';
  }
});

const stageLinks = [...document.querySelectorAll('[data-stage]')];
function showStage(moveFocus = false) {
  const hash = location.hash.slice(1);
  const current = stageLinks.find(({ dataset }) => dataset.stage === hash) ?? stageLinks[0];
  for (const link of stageLinks) {
    get(`stage-${link.dataset.stage}`).hidden = link !== current;
    if (link === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (moveFocus) get(`${current.dataset.stage}-heading`).focus();
  if (get('trace-preview').open) updateTraceText();
}
showStage();
window.addEventListener('hashchange', () => showStage(true));
document.querySelector('.skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  get('main').focus();
});

const displayDialog = get('display-dialog');
const schemeControl = get('colour-scheme');
const sizeControl = get('text-size');
const displayKey = 'edutools.data-structures.display.v1';
const deviceScheme = window.matchMedia('(prefers-color-scheme: light)');

function applyDisplay(scheme, size) {
  const hasOption = (control, value) => Array.from(control.options).some((option) => option.value === value);
  schemeControl.value = hasOption(schemeControl, scheme) ? scheme : 'dark';
  sizeControl.value = hasOption(sizeControl, size) ? size : 'standard';
  document.documentElement.dataset.colourScheme = schemeControl.value === 'system'
    ? (deviceScheme.matches ? 'light' : 'dark')
    : schemeControl.value;
  document.documentElement.dataset.textSize = sizeControl.value;
}

function saveDisplay() {
  applyDisplay(schemeControl.value, sizeControl.value);
  try {
    localStorage.setItem(displayKey, JSON.stringify([schemeControl.value, sizeControl.value]));
  } catch {
    // Display choices still apply for this page.
  }
}

try {
  const saved = JSON.parse(localStorage.getItem(displayKey) ?? 'null');
  applyDisplay(...(Array.isArray(saved) ? saved.slice(0, 2) : []));
} catch {
  applyDisplay();
}
get('display-open').addEventListener('click', () => displayDialog.showModal());
schemeControl.addEventListener('change', saveDisplay);
sizeControl.addEventListener('change', saveDisplay);
deviceScheme.addEventListener('change', () => applyDisplay(schemeControl.value, sizeControl.value));
get('display-reset').addEventListener('click', () => {
  applyDisplay();
  saveDisplay();
});
