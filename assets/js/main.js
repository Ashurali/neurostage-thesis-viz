/* ============================================================
   main.js — NeuroStage visualization interactions
   ============================================================ */

// ---- 1. Dot grid for ReliefF section ----
function buildDotGrid() {
  const grid = document.getElementById('full-grid');
  if (!grid) return;
  // 932 dots — use CSS grid 28 cols
  const colors = ['#fee2e2', '#fff7ed', '#f5f3ff', '#e5e7eb'];
  for (let i = 0; i < 932; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    // Faint domain coloring — first 114 red, next 684 orange, rest purple
    if (i < 114)       dot.style.background = '#fca5a5';
    else if (i < 798)  dot.style.background = '#fdba74';
    else               dot.style.background = '#c4b5fd';
    grid.appendChild(dot);
  }
}

// ---- 2. IntersectionObserver for scroll-triggered bar animations ----
function initBarAnimations() {
  const section = document.getElementById('weight-section');
  if (!section) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Animate all bars
        document.querySelectorAll('[data-target]').forEach(bar => {
          bar.style.width = bar.dataset.target + '%';
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(section);
}

// ---- 3. Feature card scroll-in ----
function initCardAnimations() {
  document.querySelectorAll('.observe-me').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          observer.disconnect();
        }
      });
    }, { threshold: 0.15 });

    observer.observe(el);
  });
}

// ---- 4. Citation copy-to-clipboard ----
function copyCitation() {
  const text = document.getElementById('citation-text').textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    const label = document.getElementById('copy-label');
    label.textContent = 'Copied!';
    setTimeout(() => { label.textContent = 'Copy citation'; }, 2000);
  }).catch(() => {
    // Fallback for browsers without clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const label = document.getElementById('copy-label');
    label.textContent = 'Copied!';
    setTimeout(() => { label.textContent = 'Copy citation'; }, 2000);
  });
}

// expose globally for the onclick attribute
window.copyCitation = copyCitation;

// ---- 5. Microstate cycling strips ----
const MS_COLORS = { A: '#60a5fa', B: '#34d399', C: '#f59e0b', D: '#c084fc' };

// NC: fast — short blocks
const NC_SEQ  = [
  ['A',30],['D',35],['B',28],['C',32],['A',33],['D',30],['B',35],['C',28],
  ['A',32],['D',33],['B',30],['C',35],['A',28],['D',32],['B',33],['C',30],
  ['A',35],['D',28],['B',32],['C',33],['A',30],['D',35],['B',28],['C',32],
];

// MCI: medium
const MCI_SEQ = [
  ['A',38],['D',40],['B',36],['C',42],['A',38],['D',40],['B',36],['C',42],
  ['A',40],['D',38],['B',42],['C',36],['A',40],['D',38],['B',42],['C',36],
  ['A',38],['D',42],['B',36],['C',40],['A',38],['D',40],['B',42],['C',36],
];

// Dementia: slow — wide blocks
const DEM_SEQ = [
  ['A',45],['D',50],['B',42],['C',48],['A',45],['D',50],['B',42],['C',48],
  ['A',50],['D',45],['B',48],['C',42],['A',50],['D',45],['B',48],['C',42],
  ['A',45],['D',48],['B',50],['C',42],['A',45],['D',50],['B',42],['C',48],
];

function buildStrip(seq, trackWidthPx) {
  // Build two copies for seamless loop (strip is 200% wide)
  const doubled = [...seq, ...seq];
  let html = '';
  for (const [label, durationMs] of doubled) {
    // Convert duration to percentage of total track (1 second = trackWidthPx)
    // We want visual width proportional to duration
    const widthPx = (durationMs / 1000) * trackWidthPx;
    html += `<div style="width:${widthPx}px;height:100%;background:${MS_COLORS[label]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;letter-spacing:0.05em;flex-shrink:0;">${label}</div>`;
  }
  return html;
}

function initMicrostateStrips() {
  const trackWidth = 600; // approximate track width in px for proportional sizing

  const nc  = document.getElementById('strip-nc');
  const mci = document.getElementById('strip-mci');
  const dem = document.getElementById('strip-dem');

  if (nc)  nc.innerHTML  = buildStrip(NC_SEQ,  trackWidth);
  if (mci) mci.innerHTML = buildStrip(MCI_SEQ, trackWidth);
  if (dem) dem.innerHTML = buildStrip(DEM_SEQ, trackWidth);
}

// ---- 6. SHAP topomaps ----
const NEUTRAL = 0.05; // near-zero value for unimportant electrodes
const LOW = -0.4;
const HIGH = 0.75;
const MED = 0.4;

// All electrodes start neutral unless specified
const ALL_ELECTRODES = ['Fp1','Fp2','F7','F3','Fz','F4','F8','T3','C3','Cz','C4','T4','T5','P3','Pz','P4','T6','O1','O2'];

function baseMap(value = NEUTRAL) {
  return Object.fromEntries(ALL_ELECTRODES.map(e => [e, value]));
}

function withHigh(base, electrodes) {
  const m = { ...base };
  electrodes.forEach(e => { m[e] = HIGH; });
  return m;
}

function withValues(base, overrides) {
  return { ...base, ...overrides };
}

// Stage 1 — PSD δ–α1: HIGH at posterior temporal/parietal/occipital
const s1PsdMap = withHigh(baseMap(LOW * 0.5), ['T3','T4','T5','T6','P3','P4','Pz','O1','O2']);

// Stage 1 — Coherence δ–θ: HIGH between frontal and posterior
const s1CohMap = withValues(baseMap(NEUTRAL), {
  Fp1: HIGH, Fp2: HIGH, Fz: MED, F3: MED, F4: MED,
  Pz: HIGH, O1: HIGH, O2: MED,
});

// Stage 1 — Microstate B/D: HIGH at frontal midline + parietal
const s1MicMap = withValues(baseMap(LOW * 0.3), {
  Fz: HIGH, Cz: HIGH, Pz: HIGH, P3: MED, P4: MED,
});

// Stage 2 — PSD α–β: HIGH at parietal-occipital
const s2PsdMap = withValues(baseMap(LOW * 0.5), {
  P3: HIGH, P4: HIGH, Pz: HIGH, O1: HIGH, O2: MED,
  T5: MED, T6: MED,
});

// Stage 2 — Coherence δ: HIGH at temporal and post-parietal/occipital
const s2CohMap = withValues(baseMap(NEUTRAL), {
  T3: HIGH, T4: HIGH, T5: HIGH, T6: MED,
  P4: MED, Pz: MED, O2: MED,
});

// Stage 2 — Microstate D spatial: HIGH at Fz, Cz, O2
const s2MicMap = withValues(baseMap(LOW * 0.4), {
  Fz: HIGH, Cz: HIGH, O2: HIGH,
});

function renderAllTopomaps() {
  renderTopomap('topo-s1-psd', s1PsdMap, {
    size: 160,
    title: 'Stage 1 · PSD δ–α1',
    caption: 'δ–α1 power elevated in posterior temporal, parietal & occipital regions',
  });
  renderTopomap('topo-s1-coh', s1CohMap, {
    size: 160,
    title: 'Stage 1 · Coherence δ–θ',
    caption: 'Fronto-posterior connectivity strongly discriminates dementia',
  });
  renderTopomap('topo-s1-mic', s1MicMap, {
    size: 160,
    title: 'Stage 1 · Microstate B/D',
    caption: 'Frontal midline & parietal activity key to Stage 1',
  });
  renderTopomap('topo-s2-psd', s2PsdMap, {
    size: 160,
    title: 'Stage 2 · PSD α–β',
    caption: 'α–β power at parietal-occipital sites marks MCI boundary',
  });
  renderTopomap('topo-s2-coh', s2CohMap, {
    size: 160,
    title: 'Stage 2 · Coherence δ',
    caption: 'Temporal & post-parietal coherence separates MCI from NC',
  });
  renderTopomap('topo-s2-mic', s2MicMap, {
    size: 160,
    title: 'Stage 2 · Microstate D',
    caption: 'Fz, Cz & O2 — FPN/DAN network reconfiguration in MCI',
  });

  // Microstate D comparison (Section 9)
  renderTopomap('topo-d-nc', withValues(baseMap(NEUTRAL), {
    Fz: HIGH, Cz: MED, Pz: MED, O1: MED, O2: MED * 0.5,
  }), { size: 140 });

  renderTopomap('topo-d-mci', withValues(baseMap(NEUTRAL), {
    Fz: MED * 0.3,   // weakened
    Cz: MED,
    Pz: MED,
    O1: MED,
    O2: HIGH,        // strengthened
  }), { size: 140 });
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  buildDotGrid();
  initBarAnimations();
  initCardAnimations();
  initMicrostateStrips();
  renderAllTopomaps();
});
