// "Love it? Star it" — a floating GitHub star button, bottom-right. It twinkles now and then, and
// gives a bigger bounce at the moment something worked (their screenshot framed, code copied).
const REPO = 'knileshh/bezelkit';
const URL_ = `https://github.com/${REPO}`;
const STAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12l-4.2 2.2.8-4.7L1.2 6.2l4.7-.7z" fill="currentColor"/></svg>';
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

const css = document.createElement('style');
css.textContent = `
  .star-fab { position: fixed; right: 24px; bottom: 24px; z-index: 80; display: inline-flex; align-items: center; height: 62px; min-width: 62px; padding: 0 11px;
    border-radius: 999px; background: #fff; color: var(--ink, #15161a); font: 700 15px/1 var(--display, system-ui); text-decoration: none; letter-spacing: -.01em;
    box-shadow: 0 18px 40px -16px rgba(20,22,30,.5), 0 0 0 1px rgba(20,22,30,.08);
    transform: translateY(160%); opacity: 0; transition: transform .6s cubic-bezier(.2,1.3,.35,1), opacity .4s, box-shadow .25s; }
  .star-fab.in { transform: none; opacity: 1; }
  .star-fab:hover, .star-fab:focus-visible { box-shadow: 0 22px 46px -16px rgba(20,22,30,.6), 0 0 0 1px rgba(20,22,30,.12); }
  .star-fab .star-ic { position: relative; flex: none; display: grid; place-items: center; width: 40px; height: 40px; perspective: 300px; }
  .star-fab .star-ic img, .star-fab .star-ic .fb { width: 40px; height: 40px; filter: drop-shadow(0 6px 8px rgba(214,150,0,.35)); animation: star-float 3.2s ease-in-out infinite; }
  .star-fab .star-ic .fb svg { width: 100%; height: 100%; color: #fbbf24; }
  .star-fab .star-ic::after { content: ""; position: absolute; inset: -5px; border-radius: 50%; border: 2px solid rgba(251,191,36,.75); opacity: 0; pointer-events: none; }
  .star-fab .lbl { display: inline-flex; align-items: center; max-width: 0; overflow: hidden; white-space: nowrap; opacity: 0; transition: max-width .45s cubic-bezier(.2,.9,.3,1), opacity .25s, margin .45s; }
  .star-fab:hover .lbl, .star-fab:focus-visible .lbl { max-width: 220px; opacity: 1; margin: 0 8px 0 10px; }
  .star-fab .dim { margin-right: 5px; color: var(--dim, #6b6e76); font-weight: 600; }
  .star-fab .n { margin-left: 10px; padding-left: 10px; border-left: 1px solid rgba(20,22,30,.14); font: 500 13px var(--mono, monospace); color: var(--dim, #6b6e76); }
  .star-fab .n:empty { display: none; }
  .star-fab.twinkle .star-ic img, .star-fab.twinkle .star-ic .fb { animation: star-spin 1.2s cubic-bezier(.3,1.3,.5,1), star-float 3.2s ease-in-out infinite 1.2s; }
  .star-fab.twinkle .star-ic::after { animation: star-ring 1.1s ease-out; }
  .star-fab.cheer { animation: star-cheer .9s cubic-bezier(.3,1.6,.5,1); }
  .star-fab.cheer .star-ic img, .star-fab.cheer .star-ic .fb { animation: star-spin 1s cubic-bezier(.3,1.3,.5,1) 2, star-float 3.2s ease-in-out infinite 2s; }
  .star-fab.cheer .star-ic::after { animation: star-ring 1s ease-out 2; }
  @keyframes star-float { 0%, 100% { transform: translateY(1px) rotate(-4deg); } 50% { transform: translateY(-3px) rotate(4deg); } }
  @keyframes star-spin { 0% { transform: rotateY(0) scale(1); } 45% { transform: rotateY(200deg) scale(1.22); } 100% { transform: rotateY(360deg) scale(1); } }
  @keyframes star-ring { 0% { opacity: .9; transform: scale(.55); } 100% { opacity: 0; transform: scale(1.7); } }
  @keyframes star-cheer { 0%, 100% { transform: none; } 30% { transform: translateY(-12px) scale(1.08); } 60% { transform: translateY(0) scale(.97); } }
  @media (max-width: 600px) { .star-fab { right: 14px; bottom: 14px; height: 54px; min-width: 54px; padding: 0 9px; } .star-fab .star-ic, .star-fab .star-ic img { width: 36px; height: 36px; } }
  @media (prefers-reduced-motion: reduce) { .star-fab { transition: opacity .2s; transform: none; } .star-fab *, .star-fab.cheer { animation: none !important; } .star-fab .lbl { transition: none; } }
`;
document.head.append(css);

const fab = document.createElement('a');
fab.className = 'star-fab';
fab.href = URL_;
fab.target = '_blank';
fab.rel = 'noopener';
fab.setAttribute('aria-label', 'Love it? Star bezelkit on GitHub');
const STAR3D = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Glowing%20star/3D/glowing_star_3d.png'; // Fluent Emoji, MIT
fab.innerHTML = `<span class="star-ic"><img src="${STAR3D}" alt="" width="40" height="40" decoding="async"></span><span class="lbl"><span class="dim">Love it?</span> Star it<span class="n"></span></span>`;
fab.querySelector('img').onerror = (e) => e.target.replaceWith(Object.assign(document.createElement('span'), { className: 'fb', innerHTML: STAR }));
document.body.append(fab);
setTimeout(() => fab.classList.add('in'), 1400);

// live count, shown from 10 stars (cached for an hour)
const showCount = (n) => { if (n >= 10) fab.querySelector('.n').textContent = n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); };
const cached = JSON.parse(store.get('bk-stars') || 'null');
if (cached && Date.now() - cached.t < 36e5) showCount(cached.n);
else fetch(`https://api.github.com/repos/${REPO}`).then((r) => r.ok && r.json()).then((j) => {
  if (!j) return;
  store.set('bk-stars', JSON.stringify({ n: j.stargazers_count, t: Date.now() }));
  showCount(j.stargazers_count);
}).catch(() => {});

// a small twinkle every ~7 s while the tab is visible
const play = (cls) => { fab.classList.remove(cls); void fab.offsetWidth; fab.classList.add(cls); };
setInterval(() => { if (!document.hidden && fab.classList.contains('in')) play('twinkle'); }, 7000);

// a bigger cheer when something worked for them
let lastCheer = 0;
const cheer = () => { if (Date.now() - lastCheer > 4000) { lastCheer = Date.now(); play('cheer'); } };
document.addEventListener('change', (e) => { if (e.target.matches?.('input[type="file"]') && e.target.files?.length) setTimeout(cheer, 1800); });
document.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.length) setTimeout(cheer, 1800); });
document.addEventListener('click', (e) => { if (e.target.closest('#copySnippet, #copyAiPrompt, .hx-ai, [data-copy], .cta .btn')) setTimeout(cheer, 700); });
