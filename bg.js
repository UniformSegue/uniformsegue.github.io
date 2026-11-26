(function initCustomBackground() {
  async function loadConfig() {
    const paths = ['./data.json', './data/data.json'];
    for (const path of paths) {
      try {
        const res = await fetch(`${path}?v=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.background) return json.background;
        }
      } catch (_) {}
    }
    return null;
  }

  function applyBackground(bg) {
    if (!bg || !bg.image) return;

    const blurVal = Number.isFinite(Number(bg.blur)) ? Number(bg.blur) : 14;
    const opacityVal = Number.isFinite(Number(bg.opacity)) ? Number(bg.opacity) : 0.35;

    const style = document.createElement('style');
    style.id = 'custom-bg-style';
    style.textContent = `
      :root {
        --bg-blur: ${blurVal}px;
        --bg-opacity: ${opacityVal};
      }
      html {
        background-color: #070709;
      }
      body {
        background-color: transparent !important;
      }
      #bg-layer {
        position: fixed;
        inset: 0;
        z-index: -1;
        overflow: hidden;
        pointer-events: none;
      }
      #bg-image {
        position: absolute;
        inset: -48px;
        background-image: url("${encodeURI(bg.image)}");
        background-size: cover;
        background-position: center;
        filter: blur(var(--bg-blur));
        opacity: var(--bg-opacity);
        will-change: filter, opacity;
        transition: filter 0.3s ease, opacity 0.3s ease;
      }
      #bg-overlay {
        position: absolute;
        inset: 0;
        background: rgba(7, 7, 9, 0.55);
      }
    `;
    document.head.appendChild(style);

    const layer = document.createElement('div');
    layer.id = 'bg-layer';
    layer.innerHTML = '<div id="bg-image"></div><div id="bg-overlay"></div>';
    document.body.prepend(layer);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const bg = await loadConfig();
    applyBackground(bg);
  });
})();