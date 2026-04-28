/* ============================================================
   main.js — NeuroStage visualization interactions
   ============================================================ */

// ---- 1. Dot grid for ReliefF section ----
function buildDotGrid() {
  const grid = document.getElementById('full-grid');
  if (!grid) return;
  for (let i = 0; i < 932; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    if (i < 114)       dot.style.background = '#fca5a5';
    else if (i < 798)  dot.style.background = '#fdba74';
    else               dot.style.background = '#c4b5fd';
    grid.appendChild(dot);
  }
}

// ---- 2. LOSO circles (Section 3) ----
function buildLOSOCircles() {
  const container = document.getElementById('loso-circles');
  if (!container) return;

  const circles = [];
  for (let i = 0; i < 95; i++) {
    const c = document.createElement('div');
    c.className = 'loso-dot loso-train';
    container.appendChild(c);
    circles.push(c);
  }

  let active = 0;

  function advanceLOSO() {
    circles[active].classList.remove('loso-test');
    circles[active].classList.add('loso-train');
    active = (active + 1) % 95;
    circles[active].classList.remove('loso-train');
    circles[active].classList.add('loso-test');
  }

  // Trigger on scroll-into-view
  const section = document.getElementById('dataset');
  if (!section) return;

  let interval = null;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !interval) {
        circles[0].classList.add('loso-test');
        circles[0].classList.remove('loso-train');
        interval = setInterval(advanceLOSO, 80);
      } else if (!e.isIntersecting && interval) {
        clearInterval(interval);
        interval = null;
      }
    });
  }, { threshold: 0.3 });

  obs.observe(section);
}

// ---- 3. Scroll-triggered bar animations ----
function initBarAnimations() {
  const section = document.getElementById('weight-section');
  if (!section) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('[data-target]').forEach(bar => {
          bar.style.width = bar.dataset.target + '%';
        });
        obs.disconnect();
      }
    });
  }, { threshold: 0.3 });
  obs.observe(section);
}

// ---- 4. Feature card scroll-in ----
function initCardAnimations() {
  document.querySelectorAll('.observe-me').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          obs.disconnect();
        }
      });
    }, { threshold: 0.15 });
    obs.observe(el);
  });
}

// ---- 5. Citation copy ----
function copyCitation() {
  const text = document.getElementById('citation-text').textContent.trim();
  const label = document.getElementById('copy-label');
  const done = () => { label.textContent = 'Copied!'; setTimeout(() => { label.textContent = 'Copy citation'; }, 2000); };
  navigator.clipboard ? navigator.clipboard.writeText(text).then(done) : (() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
  })();
}
window.copyCitation = copyCitation;

// ---- 6. Microstate cycling strips ----
const MS_COLORS = { A: '#60a5fa', B: '#34d399', C: '#f59e0b', D: '#c084fc' };

const NC_SEQ  = [['A',30],['D',35],['B',28],['C',32],['A',33],['D',30],['B',35],['C',28],['A',32],['D',33],['B',30],['C',35],['A',28],['D',32],['B',33],['C',30],['A',35],['D',28],['B',32],['C',33],['A',30],['D',35],['B',28],['C',32]];
const MCI_SEQ = [['A',38],['D',40],['B',36],['C',42],['A',38],['D',40],['B',36],['C',42],['A',40],['D',38],['B',42],['C',36],['A',40],['D',38],['B',42],['C',36],['A',38],['D',42],['B',36],['C',40],['A',38],['D',40],['B',42],['C',36]];
const DEM_SEQ = [['A',45],['D',50],['B',42],['C',48],['A',45],['D',50],['B',42],['C',48],['A',50],['D',45],['B',48],['C',42],['A',50],['D',45],['B',48],['C',42],['A',45],['D',48],['B',50],['C',42],['A',45],['D',50],['B',42],['C',48]];

function buildStrip(seq, trackW) {
  return [...seq, ...seq].map(([label, ms]) => {
    const w = (ms / 1000) * trackW;
    return `<div style="width:${w}px;height:100%;background:${MS_COLORS[label]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0;">${label}</div>`;
  }).join('');
}

function initMicrostateStrips() {
  const tw = 600;
  const nc  = document.getElementById('strip-nc');
  const mci = document.getElementById('strip-mci');
  const dem = document.getElementById('strip-dem');
  if (nc)  nc.innerHTML  = buildStrip(NC_SEQ,  tw);
  if (mci) mci.innerHTML = buildStrip(MCI_SEQ, tw);
  if (dem) dem.innerHTML = buildStrip(DEM_SEQ, tw);
}

// ---- 7. SHAP topomap data ----
const ALL = ['Fp1','Fp2','F7','F3','Fz','F4','F8','T3','C3','Cz','C4','T4','T5','P3','Pz','P4','T6','O1','O2'];
const NEU = 0.05, LOW = -0.3, HIGH = 0.8, MED = 0.5;

function baseMap(v) { return Object.fromEntries(ALL.map(e => [e, v])); }
function patch(base, overrides) { return { ...base, ...overrides }; }

const SHAP_DATA = {
  's1-psd': patch(baseMap(LOW * 0.6), { T3:HIGH, T4:HIGH, T5:HIGH, T6:HIGH, P3:HIGH, P4:HIGH, Pz:HIGH, O1:HIGH, O2:MED, Fp1:-0.2, Fp2:-0.2 }),
  's1-coh': patch(baseMap(NEU),       { Fp1:0.6, Fp2:0.6, Fz:MED, F3:MED, F4:MED, Pz:HIGH, O1:HIGH, O2:MED }),
  's1-mic': patch(baseMap(LOW * 0.3), { Fz:HIGH, Cz:0.6, Pz:HIGH }),
  's2-psd': patch(baseMap(LOW * 0.5), { P3:0.6, P4:HIGH, Pz:HIGH, O1:HIGH, O2:HIGH, T5:MED, T6:MED }),
  's2-coh': patch(baseMap(NEU),       { T3:0.6, T4:HIGH, T5:0.6, T6:HIGH, Pz:MED, O2:0.6 }),
  's2-mic': patch(baseMap(LOW * 0.4), { Fz:HIGH, Cz:MED, O2:HIGH, Fp1:-0.3 }),
};

function renderAllTopomaps() {
  renderTopomap('topo-s1-psd', SHAP_DATA['s1-psd'], { size:280, title:'Stage 1 — PSD δ–α1 band', caption:'Posterior temporal-parietal-occipital activity dominates (T3, T4, T5, T6, P3, P4, Pz, O1, O2)' });
  renderTopomap('topo-s1-coh', SHAP_DATA['s1-coh'], { size:280, title:'Stage 1 — Coherence δ–θ',  caption:'Frontal-to-posterior pathological hypersynchrony' });
  renderTopomap('topo-s1-mic', SHAP_DATA['s1-mic'], { size:280, title:'Stage 1 — Microstate B/D', caption:'Frontal midline (Fz) and parietal (Pz) prominence' });
  renderTopomap('topo-s2-psd', SHAP_DATA['s2-psd'], { size:280, title:'Stage 2 — PSD α–β band',  caption:'Parietal-occipital high-frequency shift' });
  renderTopomap('topo-s2-coh', SHAP_DATA['s2-coh'], { size:280, title:'Stage 2 — Coherence δ',   caption:'Temporal and post-parietal/occipital low-frequency coupling' });
  renderTopomap('topo-s2-mic', SHAP_DATA['s2-mic'], { size:280, title:'Stage 2 — Microstate D spatial', caption:'Fz weakened; right occipital (O2) strengthened' });

  // Section 10: Microstate D NC vs MCI comparison
  renderTopomap('topo-d-nc', patch(baseMap(NEU), { Fz:HIGH, Cz:MED, Pz:MED, O1:MED, O2:MED*0.5 }), { size:160, showLabels:false });
  renderTopomap('topo-d-mci', patch(baseMap(NEU), { Fz:MED*0.3, Cz:MED, Pz:MED, O1:MED, O2:HIGH }), { size:160, showLabels:false });
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  buildDotGrid();
  buildLOSOCircles();
  initBarAnimations();
  initCardAnimations();
  initMicrostateStrips();
  renderAllTopomaps();
});
