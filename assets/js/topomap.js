/**
 * renderTopomap(containerId, electrodeValues, options)
 *
 * Draws an SVG EEG topomap inside the element with the given ID.
 *
 * @param {string} containerId - DOM element ID to render into
 * @param {Object} electrodeValues - map of electrode name -> value in [-1, 1]
 * @param {Object} options
 *   @param {number}  [options.size=180]       - SVG width/height in px
 *   @param {string}  [options.title]          - optional label below the map
 *   @param {string}  [options.caption]        - optional caption text
 *   @param {boolean} [options.showLabels=false]
 */
function renderTopomap(containerId, electrodeValues, options = {}) {
  const {
    size = 180,
    title = '',
    caption = '',
    showLabels = false,
  } = options;

  const R = 80;          // head radius in SVG units
  const CX = 100;        // center x
  const CY = 100;        // center y
  const viewBox = '0 0 200 200';

  // Standard 10-20 positions (normalized to R=100-radius, centered at 0,0)
  // then mapped to our CX/CY=100 center with R=80
  const scale = R / 100;
  const rawPositions = {
    Fp1: [-30, -85], Fp2: [30, -85],
    F7:  [-72, -52], F3: [-44, -55], Fz: [0, -55], F4: [44, -55], F8: [72, -52],
    T3:  [-90,   0], C3: [-50,   0], Cz: [0,   0], C4: [50,  0],  T4: [90, 0],
    T5:  [-72,  52], P3: [-44,  55], Pz: [0,  55], P4: [44, 55],  T6: [72, 52],
    O1:  [-30,  85], O2: [30,  85],
  };

  const positions = {};
  for (const [name, [rx, ry]] of Object.entries(rawPositions)) {
    positions[name] = [CX + rx * scale, CY + ry * scale];
  }

  // Color interpolation: blue(-1) -> white(0) -> red(+1)
  function valToColor(v) {
    const clamped = Math.max(-1, Math.min(1, v));
    if (clamped < 0) {
      // blue to white
      const t = 1 + clamped; // 0..1
      const r = Math.round(255 * t);
      const g = Math.round(255 * t);
      const b = 255;
      return `rgb(${r},${g},${b})`;
    } else {
      // white to red
      const t = clamped; // 0..1
      const r = 255;
      const g = Math.round(255 * (1 - t));
      const b = Math.round(255 * (1 - t));
      return `rgb(${r},${g},${b})`;
    }
  }

  const filterId = `blur-${containerId}`;

  // Build the SVG
  let svg = `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <filter id="${filterId}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <clipPath id="clip-${containerId}">
      <circle cx="${CX}" cy="${CY}" r="${R}"/>
    </clipPath>
  </defs>

  <!-- Blurred electrode blobs (creates smooth topo gradient) -->
  <g filter="url(#${filterId})" clip-path="url(#clip-${containerId})">`;

  for (const [name, val] of Object.entries(electrodeValues)) {
    const pos = positions[name];
    if (!pos) continue;
    const color = valToColor(val);
    const radius = 22 + Math.abs(val) * 14;
    svg += `\n    <circle cx="${pos[0].toFixed(1)}" cy="${pos[1].toFixed(1)}" r="${radius}" fill="${color}" opacity="0.9"/>`;
  }

  svg += `\n  </g>

  <!-- Head outline -->
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#374151" stroke-width="2"/>

  <!-- Nose triangle -->
  <polygon points="${CX - 7},${CY - R} ${CX + 7},${CY - R} ${CX},${CY - R - 10}" fill="#374151"/>

  <!-- Left ear -->
  <ellipse cx="${CX - R - 4}" cy="${CY}" rx="5" ry="9" fill="#fafafa" stroke="#374151" stroke-width="1.5"/>
  <!-- Right ear -->
  <ellipse cx="${CX + R + 4}" cy="${CY}" rx="5" ry="9" fill="#fafafa" stroke="#374151" stroke-width="1.5"/>`;

  // Electrode dots (small, on top of blur)
  for (const [name, val] of Object.entries(electrodeValues)) {
    const pos = positions[name];
    if (!pos) continue;
    svg += `\n  <circle cx="${pos[0].toFixed(1)}" cy="${pos[1].toFixed(1)}" r="3" fill="#374151" opacity="0.6"/>`;
    if (showLabels) {
      svg += `\n  <text x="${pos[0].toFixed(1)}" y="${(pos[1] - 5).toFixed(1)}" text-anchor="middle" font-size="5.5" fill="#111827">${name}</text>`;
    }
  }

  svg += `\n</svg>`;

  const container = document.getElementById(containerId);
  if (!container) return;

  let html = svg;
  if (title) {
    html += `<p class="topo-label mt-1">${title}</p>`;
  }
  if (caption) {
    html += `<p class="topo-caption mt-1">${caption}</p>`;
  }
  container.innerHTML = html;
}
