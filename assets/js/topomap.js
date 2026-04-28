/**
 * renderTopomap(containerId, electrodeValues, options)
 *
 * Draws an SVG EEG topomap inside the element with the given ID.
 *
 * @param {string} containerId
 * @param {Object} electrodeValues  electrode name → value in [-1, 1]
 * @param {Object} options
 *   @param {number}  [options.size=280]        SVG width/height in px
 *   @param {string}  [options.title]            label above the map
 *   @param {string}  [options.caption]          caption text below
 *   @param {boolean} [options.showLabels=true]  show electrode labels
 */
function renderTopomap(containerId, electrodeValues, options = {}) {
  const {
    size = 280,
    title = '',
    caption = '',
    showLabels = true,
  } = options;

  const R  = 80;   // head radius in SVG units
  const CX = 100;  // center x
  const CY = 100;  // center y

  // Standard 10-20 positions normalized to R=100-radius, then scaled
  const scale = R / 100;
  const rawPos = {
    Fp1: [-30,-85], Fp2: [30,-85],
    F7:  [-72,-52], F3: [-44,-55], Fz: [0,-55], F4: [44,-55], F8: [72,-52],
    T3:  [-90,  0], C3: [-50,  0], Cz: [0,  0], C4: [50,  0], T4: [90, 0],
    T5:  [-72, 52], P3: [-44, 55], Pz: [0, 55], P4: [44, 55], T6: [72, 52],
    O1:  [-30, 85], O2: [30, 85],
  };

  const pos = {};
  for (const [name, [rx, ry]] of Object.entries(rawPos)) {
    pos[name] = [CX + rx * scale, CY + ry * scale];
  }

  // Label offset hints so text avoids the head border
  const labelOffset = {
    Fp1: [-8, -5], Fp2: [8, -5],
    F7:  [-10, 0], F3: [-8, -4], Fz: [0, -6], F4: [8, -4], F8: [10, 0],
    T3:  [-11, 0], C3: [-8,  0], Cz: [0, -6], C4: [8,  0], T4: [11, 0],
    T5:  [-10, 0], P3: [-8,  4], Pz: [0,  7], P4: [8,  4], T6: [10, 0],
    O1:  [-8,  6], O2: [8,  6],
  };

  // Blue → white → red diverging colormap
  function valToColor(v) {
    const c = Math.max(-1, Math.min(1, v));
    if (c < 0) {
      const t = 1 + c;
      return `rgb(${Math.round(255*t)},${Math.round(255*t)},255)`;
    }
    return `rgb(255,${Math.round(255*(1-c))},${Math.round(255*(1-c))})`;
  }

  const fid = `blur-${containerId}`;
  const cid = `clip-${containerId}`;

  let svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
    <clipPath id="${cid}">
      <circle cx="${CX}" cy="${CY}" r="${R}"/>
    </clipPath>
  </defs>

  <!-- Blurred colored blobs per electrode -->
  <g filter="url(#${fid})" clip-path="url(#${cid})">`;

  for (const [name, val] of Object.entries(electrodeValues)) {
    if (!pos[name]) continue;
    const [ex, ey] = pos[name];
    const color = valToColor(val);
    const r = 22 + Math.abs(val) * 16;
    svg += `\n    <circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${r}" fill="${color}" opacity="0.92"/>`;
  }

  svg += `\n  </g>

  <!-- Head outline -->
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#374151" stroke-width="1.8"/>
  <!-- Nose -->
  <polygon points="${CX-7},${CY-R} ${CX+7},${CY-R} ${CX},${CY-R-10}" fill="#374151"/>
  <!-- Ears -->
  <ellipse cx="${CX-R-4}" cy="${CY}" rx="5" ry="9" fill="#fafafa" stroke="#374151" stroke-width="1.4"/>
  <ellipse cx="${CX+R+4}" cy="${CY}" rx="5" ry="9" fill="#fafafa" stroke="#374151" stroke-width="1.4"/>`;

  // Electrode dots + labels
  for (const [name, val] of Object.entries(electrodeValues)) {
    if (!pos[name]) continue;
    const [ex, ey] = pos[name];
    svg += `\n  <circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="2.5" fill="#111827" opacity="0.7"/>`;
    if (showLabels) {
      const [ox, oy] = labelOffset[name] || [0, -5];
      const tx = (ex + ox).toFixed(1);
      const ty = (ey + oy - 2).toFixed(1);
      svg += `\n  <text x="${tx}" y="${ty}" text-anchor="middle" font-size="6.5" font-weight="700" fill="#111827" stroke="white" stroke-width="2.5" paint-order="stroke fill">${name}</text>`;
    }
  }

  svg += `\n</svg>`;

  const el = document.getElementById(containerId);
  if (!el) return;

  let html = '';
  if (title) html += `<p class="topo-label font-bold text-[#374151] text-center text-xs mb-1">${title}</p>`;
  html += svg;
  if (caption) html += `<p class="topo-caption text-center text-[#6b7280] text-xs mt-1 max-w-[200px] mx-auto">${caption}</p>`;
  el.innerHTML = html;
}
