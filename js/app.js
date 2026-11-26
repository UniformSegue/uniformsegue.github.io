let portfolioData = null;
let activeCategory = 'Tous';

const appEl = document.getElementById('app');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');

document.getElementById('lightbox-close').addEventListener('click', () => lightbox.classList.add('hidden'));
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) lightbox.classList.add('hidden');
});

function getCustomCategories() {
  if (Array.isArray(portfolioData?.categories) && portfolioData.categories.length) {
    return portfolioData.categories;
  }
  const fromProjects = (portfolioData?.projects || []).map((p) => p.category).filter(Boolean);
  return [...new Set(fromProjects)];
}

async function init() {
  try {
    const res = await fetch('data/data.json?v=' + Date.now());
    portfolioData = await res.json();
    document.title = `${portfolioData.profile.name} — Portfolio Son`;
    document.getElementById('nav-brand').textContent = portfolioData.profile.name.toUpperCase();
    window.addEventListener('hashchange', router);
    router();
  } catch (err) {
    appEl.innerHTML = `<div class="detail-block"><p>Impossible de charger <code>data/data.json</code>. Lancez le site via un serveur local (ex: <code>python3 -m http.server</code>) ou GitHub Pages.</p></div>`;
  }
}

function router() {
  const rawHash = (window.location.hash || '#accueil').replace(/^#/, '');
  const slashIdx = rawHash.indexOf('/');
  const route = slashIdx === -1 ? rawHash : rawHash.slice(0, slashIdx);
  const param = slashIdx === -1 ? '' : rawHash.slice(slashIdx + 1);

  document.querySelectorAll('.nav-link').forEach((link) => {
    const target = link.dataset.route;
    link.classList.toggle('active', target === route || (route === 'projet' && target === 'projets'));
  });

  if (route === 'projets') {
    activeCategory = param ? decodeURIComponent(param) : 'Tous';
    renderProjectsPage();
  } else if (route === 'projet' && param) {
    renderProjectDetail(decodeURIComponent(param));
  } else if (route === 'parcours' || route === 'contact') {
    renderParcoursPage(route === 'contact');
  } else {
    renderHomePage();
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function createProjectCard(p) {
  const hasAudio = Boolean(p.audio_final);
  const hasAB = Boolean(p.audio_final && p.audio_raw);

  return `
    <article class="project-card">
      <div class="card-media">
        ${
          p.cover_image
            ? `<img src="${escapeHtml(p.cover_image)}" alt="${escapeHtml(p.title)}" onerror="this.outerHTML='<div class=card-media-placeholder>VISUEL TECHNIQUE</div>'" />`
            : `<div class="card-media-placeholder">VISUEL TECHNIQUE</div>`
        }
        ${hasAB ? `<span class="badge-ab">A/B BRUT·TRAITÉ</span>` : ''}
        ${
          hasAudio
            ? `<button class="card-play-overlay" data-play-id="${escapeHtml(p.id)}" aria-label="Écouter ${escapeHtml(p.title)}">
                 <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="7,4 20,12 7,20"/></svg>
               </button>`
            : ''
        }
      </div>
      <div class="card-body">
        <div class="card-cat">${escapeHtml(p.category)}</div>
        <h3 class="card-title">${escapeHtml(p.title)}</h3>
        <span class="card-role">${escapeHtml(p.role)}</span>
        <div class="card-footer">
          <span class="card-date mono">${escapeHtml(p.date)}</span>
          <a href="#projet/${encodeURIComponent(p.id)}" class="btn btn-sm">Voir la fiche technique &rarr;</a>
        </div>
      </div>
    </article>
  `;
}

function bindPlayButtons() {
  document.querySelectorAll('[data-play-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.playId;
      const proj = portfolioData.projects.find((item) => item.id === id);
      if (proj) window.audioPlayer.loadProject(proj, true);
    });
  });
}

function renderHomePage() {
  const { profile, projects } = portfolioData;
  const featured = projects.filter((p) => p.featured).slice(0, 4);
  const categories = getCustomCategories();

  appEl.innerHTML = `
    <section class="hero">
      <span class="hero-tag mono">${escapeHtml(profile.tagline)}</span>
      <h1>${escapeHtml(profile.name)}</h1>
      <p class="hero-bio">${escapeHtml(profile.bio)}</p>
      <div class="hero-actions">
        <a href="#projets" class="btn btn-primary">Explorer tous les projets</a>
        ${profile.cv_path ? `<a href="${escapeHtml(profile.cv_path)}" target="_blank" class="btn">Télécharger le CV (PDF)</a>` : ''}
      </div>
    </section>

    ${
      categories.length
        ? `
      <section class="home-categories">
        <div class="section-header">
          <h2 class="section-title">Domaines & Catégories</h2>
        </div>
        <div class="category-grid">
          ${categories
            .map((cat) => {
              const count = projects.filter((p) => p.category === cat).length;
              return `
                <button class="category-card" data-open-cat="${escapeHtml(cat)}">
                  <span class="category-card-name">${escapeHtml(cat)}</span>
                  <span class="category-card-count">${count}</span>
                </button>
              `;
            })
            .join('')}
        </div>
      </section>
    `
        : ''
    }

    <section>
      <div class="section-header">
        <h2 class="section-title">Projets Phares</h2>
        <a href="#projets" class="mono" style="font-size:0.85rem;color:var(--accent)">Voir le catalogue complet &rarr;</a>
      </div>
      <div class="project-grid">
        ${featured.map(createProjectCard).join('')}
      </div>
    </section>
  `;

  document.querySelectorAll('[data-open-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.openCat;
      activeCategory = cat;
      window.location.hash = `#projets/${encodeURIComponent(cat)}`;
    });
  });

  bindPlayButtons();
}

function renderProjectsPage() {
  const categories = ['Tous', ...getCustomCategories()];
  if (!categories.includes(activeCategory)) activeCategory = 'Tous';

  const filtered =
    activeCategory === 'Tous'
      ? portfolioData.projects
      : portfolioData.projects.filter((p) => p.category === activeCategory);

  appEl.innerHTML = `
    <section>
      <div class="section-header">
        <h1 class="section-title">Catalogue des Projets</h1>
        <span class="mono" style="font-size:0.85rem;color:var(--text-muted)">${filtered.length} réalisation(s)</span>
      </div>

      <div class="filter-bar">
        ${categories
          .map(
            (cat) => `<button class="filter-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
          )
          .join('')}
      </div>

      <div class="project-grid">
        ${filtered.length ? filtered.map(createProjectCard).join('') : `<p style="color:var(--text-muted)">Aucun projet dans cette catégorie.</p>`}
      </div>
    </section>
  `;

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      window.history.replaceState(
        null,
        '',
        activeCategory === 'Tous' ? '#projets' : `#projets/${encodeURIComponent(activeCategory)}`
      );
      renderProjectsPage();
    });
  });

  bindPlayButtons();
}

function renderProjectDetail(id) {
  const p = portfolioData.projects.find((item) => item.id === id);
  if (!p) {
    appEl.innerHTML = `<a href="#projets" class="back-link">&larr; Retour aux projets</a><p>Projet introuvable.</p>`;
    return;
  }

  const hasAudio = Boolean(p.audio_final);
  const hasAB = Boolean(p.audio_final && p.audio_raw);
  const videoEmbed = renderVideo(p.video_url);

  appEl.innerHTML = `
    <a href="#projets" class="back-link">&larr; Retour au catalogue</a>

    <header class="detail-header">
      <div class="detail-meta-row">
        <span class="meta-pill accent">${escapeHtml(p.category)}</span>
        <span class="meta-pill">${escapeHtml(p.context_type || 'Projet')}</span>
        <span class="meta-pill">${escapeHtml(p.date)}</span>
      </div>
      <h1 class="detail-title">${escapeHtml(p.title)}</h1>
      <p class="detail-role"><strong>Rôle exact :</strong> ${escapeHtml(p.role)}</p>
    </header>

    ${
      hasAudio || videoEmbed
        ? `
      <section class="detail-media-box">
        ${
          hasAudio
            ? `
          <div class="detail-audio-row">
            <div>
              <strong style="display:block;font-size:0.95rem;">Écoute de démonstration</strong>
              <span class="mono" style="font-size:0.78rem;color:var(--text-muted)">${escapeHtml(p.audio_specs || 'Audio')} ${hasAB ? '• Comparateur A/B (Brut / Traité) disponible' : ''}</span>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn btn-primary" data-play-id="${escapeHtml(p.id)}">&#9654; Lancer dans le lecteur</button>
              ${hasAB ? `<button class="btn" id="detail-ab-raw">Écouter la piste Brute (A/B)</button>` : ''}
            </div>
          </div>
        `
            : ''
        }
        ${videoEmbed}
      </section>
    `
        : ''
    }

    <div class="detail-sections">
      <section class="detail-block">
        <h2>Contexte</h2>
        <p>${escapeHtml(p.specifications)}</p>
      </section>

      <section class="detail-block">
        <h2>Démarche</h2>
        <p>${escapeHtml(p.technical_choices)}</p>
      </section>

      ${
        p.gallery && p.gallery.length
          ? `
        <section class="detail-block">
          <h2>Galerie</h2>
          <div class="gallery-grid">
            ${p.gallery
              .map(
                (item) => `
              <figure class="gallery-item" data-full="${escapeHtml(item.image)}" data-caption="${escapeHtml(item.caption || '')}">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.caption || 'Illustration technique')}" />
                ${item.caption ? `<figcaption class="gallery-caption mono">${escapeHtml(item.caption)}</figcaption>` : ''}
              </figure>
            `
              )
              .join('')}
          </div>
        </section>
      `
          : ''
      }

      <section class="detail-block">
        <h2>Bilan & Améliorations</h2>
        <p>${escapeHtml(p.critical_review)}</p>
      </section>
    </div>
  `;

  bindPlayButtons();

  const abRawBtn = document.getElementById('detail-ab-raw');
  if (abRawBtn) {
    abRawBtn.addEventListener('click', async () => {
      await window.audioPlayer.loadProject(p, true);
      window.audioPlayer.setMode('raw');
    });
  }

  document.querySelectorAll('.gallery-item').forEach((item) => {
    item.addEventListener('click', () => {
      lightboxImg.src = item.dataset.full;
      lightboxCaption.textContent = item.dataset.caption;
      lightbox.classList.remove('hidden');
    });
  });
}

function renderParcoursPage(scrollToContact = false) {
  const { profile } = portfolioData;

  appEl.innerHTML = `
    <section style="margin-bottom: 40px;">
      <div class="section-header">
        <h1 class="section-title">Parcours & Compétences</h1>
        ${
          profile.cv_path
            ? `<a href="${escapeHtml(profile.cv_path)}" target="_blank" class="btn btn-primary">&#11015; Télécharger mon CV (PDF)</a>`
            : ''
        }
      </div>

      <h2 class="mono" style="font-size:0.95rem;color:var(--text-muted);margin-bottom:16px;">COMPÉTENCES TECHNIQUES</h2>
      <div class="skills-grid">
        ${(profile.skills || [])
          .map(
            (s) => `
          <div class="skill-card">
            <h3>${escapeHtml(s.category)}</h3>
            <div class="skill-tags">
              ${(s.items || []).map((i) => `<span class="skill-tag">${escapeHtml(i)}</span>`).join('')}
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <h2 class="mono" style="font-size:0.95rem;color:var(--text-muted);margin-bottom:16px;">FORMATION ACADÉMIQUE</h2>
      <div class="edu-list">
        ${(profile.education || [])
          .map(
            (e) => `
          <div class="edu-item">
            <div>
              <strong style="display:block;font-size:1rem;">${escapeHtml(e.title)}</strong>
              <span style="color:var(--text-muted);font-size:0.9rem;">${escapeHtml(e.school)}</span>
            </div>
            <span class="edu-year">${escapeHtml(e.year)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    </section>

    <section id="contact-section">
      <h2 class="section-title" style="margin-bottom:16px;">Contact & Réseaux</h2>
      <div class="contact-box">
        <p style="color:var(--text-muted)">Disponible pour tout échange concernant une candidature (École d'ingénieur, Master, Licence Pro) ou un projet technique.</p>
        <div class="contact-links">
          ${
            profile.email
              ? `<a href="mailto:${escapeHtml(profile.email)}" class="btn btn-primary">${escapeHtml(profile.email)}</a>
                 <button class="btn" id="copy-email-btn" data-email="${escapeHtml(profile.email)}">Copier l'email</button>`
              : ''
          }
          ${profile.links?.github ? `<a href="${escapeHtml(profile.links.github)}" target="_blank" class="btn">GitHub</a>` : ''}
          ${profile.links?.soundcloud ? `<a href="${escapeHtml(profile.links.soundcloud)}" target="_blank" class="btn">SoundCloud</a>` : ''}
          ${profile.links?.youtube ? `<a href="${escapeHtml(profile.links.youtube)}" target="_blank" class="btn">YouTube</a>` : ''}
        </div>
      </div>
    </section>
  `;

  const copyBtn = document.getElementById('copy-email-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(copyBtn.dataset.email);
      copyBtn.textContent = 'Copié !';
      setTimeout(() => (copyBtn.textContent = "Copier l'email"), 1800);
    });
  }

  if (scrollToContact) {
    setTimeout(() => {
      document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }
}

function renderVideo(url) {
  if (!url || !url.trim()) return '';
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `<div class="video-container"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen></iframe></div>`;
  }
  return `<div class="video-container"><video controls src="${escapeHtml(url)}"></video></div>`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

init();