import { address, arrayTrace, choices, flowTrace, formatByte, linkedTrace, queueOrder, startingValues } from './model.js';
import { structures } from './structures.js';

const get = (id) => document.getElementById(id);
const positions = { array: 0, linked: 0, flow: 0 };
const checkedChoices = new Map();
const guideAttempts = new Map();
const lessonNotes = [
  ['memory-note', 'My memory finding'],
  ['flow-note', 'My stack and queue finding'],
  ['explanation', 'My recommendation'],
];
const choiceOptions = ['Array', 'Linked list', 'Stack', 'Queue'];
const sessionKey = 'edutools.data-structures.lesson.v2';
const predictions = { stack: '', queue: '' };
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
  for (const [kind, value] of Object.entries(predictions)) {
    const select = get(`predict-${kind}`);
    select.replaceChildren(
      new Option('Choose a value', ''),
      ...startingValues.map((value) => new Option(formatByte(value, format), String(value))),
    );
    select.value = value;
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

function restoreLesson() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey) ?? 'null');
    if (!saved) return;
    for (const [id, { steps }] of Object.entries(simulations)) {
      const position = saved.positions?.[id];
      if (Number.isInteger(position) && position >= 0 && position < steps.length) positions[id] = position;
    }
    if (['decimal', 'binary', 'hex'].includes(saved.format)) format = saved.format;
    if (typeof saved.predictionResult === 'string') predictionResult = saved.predictionResult.slice(0, 200);
    for (const kind of Object.keys(predictions)) {
      const guess = saved.predictions?.[kind];
      if (startingValues.some((value) => String(value) === guess)) predictions[kind] = guess;
    }
    for (const { id, check } of structures) {
      const option = saved.guide?.[id];
      if (Number.isInteger(option) && option >= 0 && option < check.options.length) {
        guideAttempts.set(id, { option, correct: option === check.answer });
      }
    }
    for (const { id, answer } of choices) {
      const value = saved.choices?.[id];
      if (choiceOptions.includes(value)) checkedChoices.set(id, { value, matched: value === answer });
    }
    for (const [id] of lessonNotes) {
      const value = saved.notes?.[id];
      if (typeof value === 'string') get(id).value = value.slice(0, get(id).maxLength);
    }
  } catch {
    // Work can continue in this tab if browser storage is unavailable.
  }
}

function saveLesson() {
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify({
      positions, format, predictions, predictionResult,
      guide: Object.fromEntries([...guideAttempts].map(([id, { option }]) => [id, option])),
      choices: Object.fromEntries([...checkedChoices].map(([id, { value }]) => [id, value])),
      notes: Object.fromEntries(lessonNotes.map(([id]) => [id, get(id).value])),
    }));
  } catch {
    // The current lesson remains usable and its trace can still be copied.
  }
}

restoreLesson();

for (const kind of Object.keys(predictions)) {
  const select = get(`predict-${kind}`);
  select.addEventListener('change', () => {
    predictions[kind] = select.value;
    saveLesson();
  });
}

for (const [id, { steps, render }] of Object.entries(simulations)) {
  get(`${id}-step`).addEventListener('click', () => {
    if (positions[id] >= steps.length - 1) return;
    const previous = steps[positions[id]];
    positions[id] += 1;
    if (id === 'flow' && previous.next === 'Pop and dequeue once') {
      const { stack: stackGuess, queue: queueGuess } = predictions;
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
      predictions.stack = '';
      predictions.queue = '';
    }
    render();
    refreshTracePreview();
  });
  render();
}

for (const input of document.querySelectorAll('input[name="format"]')) {
  input.checked = input.value === format;
  input.addEventListener('change', () => {
    format = input.value;
    for (const { render } of Object.values(simulations)) render();
    saveLesson();
  });
}

get('choice-grid').innerHTML = choices.map(({ id, title, request }) => `
  <form class="panel choice" data-case="${id}">
    <h3>${title}</h3>
    <p>${request}</p>
    <label class="field" for="choice-${id}">Structure for ${title.toLowerCase()}</label>
    <select id="choice-${id}" required>
      <option value="">Choose a structure</option>
      ${choiceOptions.map((name) => `<option>${name}</option>`).join('')}
    </select>
    <button type="submit">Check choice</button>
    <p class="choice-result" role="status"></p>
  </form>`).join('');

for (const choice of choices) {
  const form = document.querySelector(`[data-case="${choice.id}"]`);
  const select = get(`choice-${choice.id}`);
  const feedback = form.querySelector('.choice-result');
  function showChoiceFeedback(matched) {
    feedback.dataset.result = matched ? 'correct' : 'review';
    feedback.textContent = matched ? `Correct. ${choice.explanation}` : `Try again. ${choice.clue}`;
  }
  const lastAttempt = checkedChoices.get(choice.id);
  if (lastAttempt) {
    select.value = lastAttempt.value;
    showChoiceFeedback(lastAttempt.matched);
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const matched = select.value === choice.answer;
    checkedChoices.set(choice.id, { value: select.value, matched });
    showChoiceFeedback(matched);
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
  const checked = structures.filter(({ id }) => guideAttempts.get(id)?.correct);
  if (checked.length) blocks.push(`Guide checks passed · ${checked.map(({ name }) => name).join(', ')}`);
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
  for (const [id, label] of lessonNotes) {
    const note = get(id).value.trim();
    if (note) blocks.push(`${label}\n${note}`);
  }
  if (blocks.length === 1) blocks.push('Step through an activity or add your explanation to create a trace.');
  return blocks.join('\n\n');
}

function updateTraceText() {
  const text = buildEvidence();
  get('trace-text').value = text;
  return text;
}

function refreshTracePreview() {
  saveLesson();
  if (get('trace-preview').open) updateTraceText();
  get('copy-status').textContent = '';
}

get('trace-preview').addEventListener('toggle', () => {
  if (get('trace-preview').open) updateTraceText();
});
for (const [id] of lessonNotes) get(id).addEventListener('input', refreshTracePreview);
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

const structureLinks = get('structure-links');
const structureEntry = get('structure-entry');
structureLinks.innerHTML = structures.map(({ id, name }) =>
  `<a href="#guide/${id}" data-structure="${id}">${name}<span class="guide-check-mark" aria-hidden="true"></span></a>`,
).join('');

const guideLinks = [...structureLinks.querySelectorAll('a')];
let activeStructure;

function updateGuideProgress() {
  const passed = structures.filter(({ id }) => guideAttempts.get(id)?.correct).length;
  get('guide-progress').textContent = `${passed} of ${structures.length} checks passed`;
  for (const link of guideLinks) {
    const passedCheck = guideAttempts.get(link.dataset.structure)?.correct;
    link.querySelector('.guide-check-mark').textContent = passedCheck ? '✓' : '';
  }
}

function showStructure(id) {
  const index = structures.findIndex((item) => item.id === id);
  const entry = structures[Math.max(0, index)];
  if (entry === activeStructure) return;
  activeStructure = entry;

  for (const link of guideLinks) {
    if (link.dataset.structure === entry.id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const next = structures[Math.max(0, index) + 1];
  const { example, check } = entry;
  structureEntry.innerHTML = `
    <div class="panel-heading">
      <h3 id="structure-title" tabindex="-1">${entry.name}</h3>
      <span class="model-label">${entry.principle}</span>
    </div>
    <p class="guide-summary">${entry.summary}</p>
    <figure class="guide-example">
      <figcaption>${example.caption}</figcaption>
      <div class="slots">${example.cells.map(([label, value, detail]) => `
        <div class="slot">
          <span class="slot-index">${label}</span>
          <strong class="slot-value">${value}</strong>
          ${detail ? `<span class="slot-address">${detail}</span>` : ''}
        </div>`).join('')}</div>
      <p>${example.outcome}</p>
    </figure>
    <div class="guide-facts">
      <div><h4>Operations</h4><p>${entry.operations}</p></div>
      <div><h4>In memory</h4><p>${entry.memory}</p></div>
      <div><h4>When to use it</h4><p>${entry.decision}</p></div>
    </div>
    <form id="structure-check" class="guide-form">
      <fieldset>
        <legend>Check your understanding</legend>
        <label class="field" for="structure-answer">${check.prompt}</label>
        <select id="structure-answer" required>
          <option value="">Choose an answer</option>
          ${check.options.map((option, optionIndex) => `<option value="${optionIndex}">${option}</option>`).join('')}
        </select>
      </fieldset>
      <div class="button-row">
        <button type="submit">Check answer</button>
        ${next ? `<a class="button" href="#guide/${next.id}">Next · ${next.name}</a>` : ''}
      </div>
      <p class="choice-result" id="structure-feedback" role="status"></p>
    </form>`;
  structureEntry.setAttribute('aria-labelledby', 'structure-title');

  const answer = get('structure-answer');
  const feedback = get('structure-feedback');
  function showFeedback(attempt) {
    feedback.dataset.result = attempt.correct ? 'correct' : 'review';
    feedback.textContent = attempt.correct ? `Correct. ${check.explanation}` : `Try again. ${check.clue}`;
  }
  const lastAttempt = guideAttempts.get(entry.id);
  if (lastAttempt) {
    answer.value = String(lastAttempt.option);
    showFeedback(lastAttempt);
  }
  answer.addEventListener('change', () => { feedback.textContent = ''; });
  get('structure-check').addEventListener('submit', (event) => {
    event.preventDefault();
    const option = Number(answer.value);
    const attempt = { option, correct: option === check.answer };
    guideAttempts.set(entry.id, attempt);
    showFeedback(attempt);
    updateGuideProgress();
    refreshTracePreview();
  });
}

const stageLinks = [...document.querySelectorAll('[data-stage]')];
function showStage(moveFocus = false) {
  const [stage, entry] = location.hash.slice(1).split('/');
  const current = stageLinks.find(({ dataset }) => dataset.stage === stage) ?? stageLinks[0];
  const currentStage = current.dataset.stage;
  for (const link of stageLinks) {
    get(`stage-${link.dataset.stage}`).hidden = link !== current;
    if (link === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  get('radix-controls').hidden = currentStage !== 'memory' && currentStage !== 'flow';
  if (currentStage === 'guide') showStructure(entry ?? activeStructure?.id);
  if (moveFocus) {
    const focus = currentStage === 'guide' && entry ? 'structure-title' : `${currentStage}-heading`;
    get(focus).focus();
  }
  if (get('trace-preview').open) updateTraceText();
}
updateGuideProgress();
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
