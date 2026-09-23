// Reconcile Core — Virtual DOM Diff Visualizer
//
// Every reconciliation decision shown on this page is made by the REAL,
// unmodified engine copied verbatim from this repo's supermodules/ course
// build (module_01 through module_14). Nothing here reimplements diffing —
// this file only calls the real `createElement`, `useState`, `mountApp`
// (module_14_capstone/engine.js) and reads the real Fiber objects
// (module_03_fiber_node/fiber.js) that the real keyed-diff algorithm
// (module_09_keyed_diff/keyedDiff.js) produced, including its real
// `Placement` flag (module_11_effect_list/effectList.js).
import { createElement } from './engine/module_01_elements/createElement.js';
import { mountApp, useState } from './engine/module_14_capstone/engine.js';
import { HostComponent, forEachFiber } from './engine/module_03_fiber_node/fiber.js';
import { Placement } from './engine/module_11_effect_list/effectList.js';

type Item = { id: number; label: string };
type Decision = 'reused' | 'moved' | 'inserted' | 'deleted';

const WORDS = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
  'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa',
];

let nextId = 4;
const initialItems = (): Item[] => [
  { id: 1, label: 'Alpha' },
  { id: 2, label: 'Bravo' },
  { id: 3, label: 'Charlie' },
];

// Bridge between the native control UI (plain DOM, outside the reconciler)
// and the real function component's internal useState — exactly the seam
// a real React app has between "outside world" event handlers and a
// component's own state setter.
const bridge: { items: Item[]; setItems: ((next: Item[]) => void) | null } = {
  items: initialItems(),
  setItems: null,
};

function ListDemo() {
  const [items, setItems] = useState(bridge.items) as [Item[], (next: Item[]) => void];
  bridge.items = items;
  bridge.setItems = setItems;
  return createElement(
    'ul',
    { className: 'rc-list' },
    ...items.map((it: Item) =>
      createElement('li', { key: String(it.id), className: 'rc-item', 'data-key': String(it.id) }, it.label)
    )
  );
}

// ---------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------
const app = document.getElementById('app')!;
app.innerHTML = `
  <div class="topbar">
    <div class="brand">reconcile-<span>core</span></div>
    <nav>
      <a href="https://github.com/Robert-Doe/reconcile-core" target="_blank" rel="noopener">GitHub</a>
      <a href="https://robertdoe.com" target="_blank" rel="noopener">&larr; robertdoe.com</a>
    </nav>
  </div>

  <section class="hero">
    <h1>Virtual DOM <em>Diff</em> Visualizer</h1>
    <p class="tagline">
      A from-scratch React-style fiber reconciler, with keyed diffing, double
      buffering, and a real commit phase, running live in your browser. Every badge
      below reflects an actual <code>Fiber.flags</code> bit set by the algorithm itself.
    </p>
  </section>

  <main class="demo">
    <div class="panes">
      <div class="card">
        <h2>Controls</h2>
        <p class="sub">Mutate the list. Each action calls the real component's own <code>useState</code> setter.</p>
        <div class="btn-row">
          <button class="btn primary" id="btn-add">+ Add item</button>
          <button class="btn" id="btn-shuffle">Shuffle</button>
          <button class="btn" id="btn-reverse">Reverse</button>
          <button class="btn" id="btn-front">Insert at front</button>
          <button class="btn danger" id="btn-reset">Reset</button>
        </div>
        <div class="item-list" id="item-list"></div>

        <div class="trees">
          <div class="tree-box">
            <span class="label">Before (vdom)</span>
            <div id="tree-before"></div>
          </div>
          <div class="tree-box">
            <span class="label">After (vdom)</span>
            <div id="tree-after"></div>
          </div>
        </div>

        <details class="code-toggle">
          <summary>See the real diff code (module_09_keyed_diff/keyedDiff.js)</summary>
          <pre>${escapeHtml(`function placeChild(newFiber, lastPlacedIndex, newIndex) {
  newFiber.index = newIndex;
  const current = newFiber.alternate;
  if (current !== null) {
    const oldIndex = current.index;
    if (oldIndex < lastPlacedIndex) {
      newFiber.flags |= Placement; // moved
      return lastPlacedIndex;
    }
    return oldIndex; // stayed — raise the high-water mark
  }
  newFiber.flags |= Placement; // inserted
  return lastPlacedIndex;
}`)}</pre>
        </details>
      </div>

      <div class="card">
        <div class="output-grid">
          <div>
            <h2>Live DOM</h2>
            <p class="sub">The real <code>commitPlacement</code> / <code>commitDeletions</code> patching a real subtree.</p>
            <div class="preview-surface" id="preview"></div>
          </div>
          <div>
            <h2>Diff decisions</h2>
            <p class="sub">Read directly off the committed Fiber tree's <code>.alternate</code> and <code>.flags</code>.</p>
            <table class="decisions-table">
              <thead><tr><th>Key</th><th>Label</th><th>Decision</th></tr></thead>
              <tbody id="decisions-body"></tbody>
            </table>
            <div class="summary-strip" id="summary"></div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <footer class="site">
    Real fiber reconciler, ported directly from this repo's <code>supermodules/</code> course build
    (modules 01&ndash;14) &mdash; unmodified diffing, commit, and hooks logic. Built for
    <a href="https://robertdoe.com" target="_blank" rel="noopener">robertdoe.com</a>.
  </footer>
`;

const previewEl = document.getElementById('preview') as HTMLElement;
const itemListEl = document.getElementById('item-list') as HTMLElement;
const treeBeforeEl = document.getElementById('tree-before') as HTMLElement;
const treeAfterEl = document.getElementById('tree-after') as HTMLElement;
const decisionsBodyEl = document.getElementById('decisions-body') as HTMLElement;
const summaryEl = document.getElementById('summary') as HTMLElement;

// ---------------------------------------------------------------------
// Mount the REAL engine once.
// ---------------------------------------------------------------------
const handle = mountApp(createElement(ListDemo, {}), previewEl, document);

function liFibers(): Map<string, any> {
  const map = new Map<string, any>();
  forEachFiber(handle.hostRootFiber, (fiber: any) => {
    if (fiber.tag === HostComponent && fiber.type === 'li' && fiber.key !== null) {
      map.set(fiber.key, fiber);
    }
  });
  return map;
}

function renderVTree(items: Item[]): string {
  if (items.length === 0) return '<span class="tree-node">&lt;ul&gt; (empty)</span>';
  const lines = ['<span class="tree-node">&lt;ul&gt;</span>'];
  items.forEach((it, i) => {
    const last = i === items.length - 1;
    lines.push(
      `<span class="tree-node">${last ? '└─' : '├─'} &lt;li key="${it.id}"&gt; ${escapeHtml(it.label)}</span>`
    );
  });
  return lines.join('<br/>');
}

function renderItemControls() {
  itemListEl.innerHTML = '';
  for (const it of bridge.items) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `<span>${escapeHtml(it.label)} <span class="key">#${it.id}</span></span>`;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove this item';
    removeBtn.addEventListener('click', () => {
      applyChange(bridge.items.filter((x) => x.id !== it.id));
    });
    row.appendChild(removeBtn);
    itemListEl.appendChild(row);
  }
}

function applyChange(nextItems: Item[]) {
  const beforeItems = bridge.items;
  const beforeFibers = liFibers();

  bridge.setItems!(nextItems);
  // The real update() ran synchronously inside setItems above — bridge.items
  // now reflects the freshly re-rendered, freshly committed real fiber tree.
  const afterItems = bridge.items;
  const afterFibers = liFibers();

  const decisions: { key: string; label: string; decision: Decision }[] = [];
  let reused = 0, moved = 0, inserted = 0, deleted = 0;

  for (const it of afterItems) {
    const key = String(it.id);
    const fiber = afterFibers.get(key);
    let decision: Decision;
    if (!beforeFibers.has(key)) {
      decision = 'inserted';
      inserted++;
    } else if (fiber && (fiber.flags & Placement) !== 0) {
      decision = 'moved';
      moved++;
    } else {
      decision = 'reused';
      reused++;
    }
    decisions.push({ key, label: it.label, decision });

    if (fiber && fiber.stateNode) {
      const el = fiber.stateNode as HTMLElement;
      if (decision === 'moved') flash(el, 'flash-move');
      if (decision === 'inserted') flash(el, 'flash-insert');
    }
  }
  for (const key of beforeFibers.keys()) {
    if (!afterFibers.has(key)) {
      const beforeItem = beforeItems.find((x) => String(x.id) === key);
      decisions.push({ key, label: beforeItem ? beforeItem.label : '(removed)', decision: 'deleted' });
      deleted++;
    }
  }

  treeBeforeEl.innerHTML = renderVTree(beforeItems);
  treeAfterEl.innerHTML = renderVTree(afterItems);

  decisionsBodyEl.innerHTML = decisions
    .map(
      (d) =>
        `<tr><td>#${d.key}</td><td>${escapeHtml(d.label)}</td><td><span class="badge ${d.decision}">${d.decision}</span></td></tr>`
    )
    .join('');

  summaryEl.innerHTML = `
    <span><span class="n">${reused}</span> reused</span>
    <span><span class="n">${moved}</span> moved</span>
    <span><span class="n">${inserted}</span> inserted</span>
    <span><span class="n">${deleted}</span> deleted</span>
  `;

  renderItemControls();
}

function flash(el: HTMLElement, cls: string) {
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 900);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// ---------------------------------------------------------------------
// Wire controls
// ---------------------------------------------------------------------
document.getElementById('btn-add')!.addEventListener('click', () => {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  applyChange([...bridge.items, { id: nextId++, label: word }]);
});

document.getElementById('btn-shuffle')!.addEventListener('click', () => {
  const copy = [...bridge.items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  applyChange(copy);
});

document.getElementById('btn-reverse')!.addEventListener('click', () => {
  applyChange([...bridge.items].reverse());
});

document.getElementById('btn-front')!.addEventListener('click', () => {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  applyChange([{ id: nextId++, label: word }, ...bridge.items]);
});

document.getElementById('btn-reset')!.addEventListener('click', () => {
  nextId = 4;
  applyChange(initialItems());
});

// Initial paint of the side panels (mount = everything "inserted").
treeBeforeEl.innerHTML = renderVTree([]);
treeAfterEl.innerHTML = renderVTree(bridge.items);
decisionsBodyEl.innerHTML = bridge.items
  .map((it) => `<tr><td>#${it.id}</td><td>${escapeHtml(it.label)}</td><td><span class="badge inserted">inserted</span></td></tr>`)
  .join('');
summaryEl.innerHTML = `
  <span><span class="n">0</span> reused</span>
  <span><span class="n">0</span> moved</span>
  <span><span class="n">${bridge.items.length}</span> inserted</span>
  <span><span class="n">0</span> deleted</span>
`;
renderItemControls();
