export const startingValues = [10, 20, 42];

export function address(byte) {
  return byte === null ? 'null' : `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`;
}

export function formatByte(byte, format = 'decimal') {
  if (byte === null) return 'Empty';
  if (format === 'hex') return address(byte);
  if (format === 'binary') {
    const bits = byte.toString(2).padStart(8, '0');
    return `${bits.slice(0, 4)} ${bits.slice(4)}`;
  }
  return String(byte);
}

function buildArrayTrace() {
  const base = 0x20;
  const slots = [...startingValues, null];
  const steps = [
    {
      base, slots: [...slots], size: 3, next: 'Read index 2',
      result: 'Three values occupy consecutive one-byte slots. Index 3 is spare.',
    },
    {
      base, slots: [...slots], size: 3, read: 2, next: 'Copy index 2 to index 3',
      result: `Read index 2 at ${address(base + 2)}. Its value is 42 in decimal. No slots moved.`,
    },
  ];
  for (let from = 2; from >= 1; from -= 1) {
    slots[from + 1] = slots[from];
    steps.push({
      base, slots: [...slots], size: 3, read: from, write: from + 1,
      next: from === 2 ? 'Copy index 1 to index 2' : 'Write 15 at index 1',
      result: `Copied ${slots[from]} from index ${from} to ${from + 1}. The source still holds its value until overwritten.`,
    });
  }
  slots[1] = 15;
  steps.push({
    base, slots: [...slots], size: 4, write: 1, next: 'Append 7 to the full list',
    result: 'Wrote 15 at index 1. The four slots now hold 10, 15, 20, 42 in that order.',
  });
  steps.push({
    base: 0x40, slots: [...slots, 7, null, null, null], size: 5, write: 4,
    result: 'The original array was full. The list copied four values to a larger block at 0x40, then wrote 7. The old block can be released.',
  });
  return steps;
}

function buildLinkedTrace() {
  const head = 0x50;
  const nodes = [
    { at: head, value: startingValues[0], next: 0x28 },
    { at: 0x28, value: startingValues[1], next: 0x68 },
    { at: 0x68, value: startingValues[2], next: null },
  ];
  const steps = [{
    head, nodes, visited: [], next: 'Read the head node',
    result: 'The head stores the address of the first node. The nodes can occupy separate addresses.',
  }];
  const visited = [];
  let at = head;
  while (at !== null) {
    const node = nodes.find((item) => item.at === at);
    visited.push(at);
    steps.push({
      head, nodes, visited: [...visited], active: at,
      next: node.next === null ? 'Link a new node after the head' : `Follow the link to ${address(node.next)}`,
      result: node.next === null
        ? `Reached index 2 at ${address(at)}. Its value is 42 in decimal. Finding it took three node visits.`
        : `Read ${address(at)}. Its value is ${node.value} in decimal and its next link points to ${address(node.next)}.`,
    });
    at = node.next;
  }
  const insertedAt = 0x38;
  steps.push({
    head,
    nodes: [
      { ...nodes[0], next: insertedAt },
      ...nodes.slice(1),
      { at: insertedAt, value: 15, next: nodes[0].next },
    ],
    visited: [], active: insertedAt,
    result: 'Inserted 15 after the head by changing two links. The existing nodes kept their addresses.',
  });
  return steps;
}

const flowActions = [
  ...startingValues.map((value) => ({ value })),
  { remove: true },
  { value: 15 },
  { value: 7 },
];

function buildFlowTrace() {
  const stack = Array(4).fill(null);
  const queue = Array(4).fill(null);
  let stackSize = 0;
  let front = 0;
  let queueSize = 0;
  let firstRemoval;
  let result = 'Both structures have four empty slots. Add the same values to each.';
  const snapshots = [];
  for (const action of [...flowActions, null]) {
    const nextWrite = (front + queueSize) % queue.length;
    snapshots.push({
      stack: [...stack], queue: [...queue], stackSize, front, queueSize, nextWrite,
      firstRemoval, result,
      next: action && (action.remove ? 'Pop and dequeue once' : `Add ${action.value} to both`),
    });
    if (!action) break;
    if (action.remove) {
      firstRemoval = { stack: stack[stackSize - 1], queue: queue[front] };
      stackSize -= 1;
      stack[stackSize] = null;
      queue[front] = null;
      front = (front + 1) % queue.length;
      queueSize -= 1;
      result = `Pop returned ${firstRemoval.stack} from the stack. Dequeue returned ${firstRemoval.queue} from the queue and advanced its front to slot ${front}.`;
    } else {
      stack[stackSize] = action.value;
      stackSize += 1;
      queue[nextWrite] = action.value;
      queueSize += 1;
      result = `Pushed ${action.value} onto the stack at slot ${stackSize - 1}. Enqueued ${action.value} at queue slot ${nextWrite}.`;
      if (nextWrite === 0 && front !== 0) {
        result += ' The queue wrapped to the free slot at the start. Its front stayed at slot 1.';
      }
    }
  }
  return snapshots;
}

export const arrayTrace = buildArrayTrace();
export const linkedTrace = buildLinkedTrace();
export const flowTrace = buildFlowTrace();

export function queueOrder(step) {
  return Array.from({ length: step.queueSize }, (_, offset) =>
    step.queue[(step.front + offset) % step.queue.length],
  );
}

export const choices = [
  {
    id: 'undo',
    title: 'Undo an edit',
    request: 'A slide editor needs to reverse the most recent edit first.',
    answer: 'Stack',
    explanation: 'The last edit pushed onto the stack is the first one popped.',
    clue: 'Which structure took its most recent item out first?',
  },
  {
    id: 'print',
    title: 'Serve print jobs',
    request: 'Same-priority jobs must print in the order they arrive.',
    answer: 'Queue',
    explanation: 'New jobs join the rear. The job at the front arrived first.',
    clue: 'Which structure took its oldest item out first?',
  },
  {
    id: 'readings',
    title: 'Read a numbered slot',
    request: 'A program has 60 one-byte readings. It often needs the reading at a known index.',
    answer: 'Array',
    explanation: 'A fixed-size slot has a calculable address. The program can read that index directly.',
    clue: 'Which structure can calculate a slot’s address from its index?',
  },
];
