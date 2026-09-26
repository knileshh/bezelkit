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
  .star-fab { position: fixed; right: 24px; bottom: 24px; z-index: 80; display: inline-flex; align-items: center; gap: 10px; padding: 12px 18px 12px 14px;
    border-radius: 999px; background: var(--ink, #15161a); color: #fff; font: 700 15px/1 var(--display, system-ui); text-decoration: none; letter-spacing: -.01em;
    box-shadow: 0 16px 40px -14px rgba(20,22,30,.55), 0 0 0 1px rgba(255,255,255,.06) inset;
    transform: translateY(140%); opacity: 0; transition: transform .6s cubic-bezier(.2,1.3,.35,1), opacity .4s, box-shadow .2s; }
  .star-fab.in { transform: none; opacity: 1; }
  .star-fab:hover { box-shadow: 0 20px 46px -14px rgba(20,22,30,.65); }
  .star-fab:hover .star-ic { transform: rotate(72deg) scale(1.15); }
  .star-fab .star-ic { position: relative; display: grid; place-items: center; width: 22px; height: 22px; transition: transform .45s cubic-bezier(.2,1.4,.4,1); }
  .star-fab .star-ic svg { width: 20px; height: 20px; color: #fbbf24; filter: drop-shadow(0 0 6px rgba(251,191,36,.55)); }
  .star-fab .star-ic::after { content: ""; position: absolute; inset: -6px; border-radius: 50%; border: 2px solid rgba(251,191,36,.7); opacity: 0; }
  .star-fab .dim { color: rgba(255,255,255,.62); font-weight: 600; }
  .star-fab .n { margin-left: 2px; padding-left: 10px; border-left: 1px solid rgba(255,255,255,.2); font: 500 13px var(--mono, monospace); color: rgba(255,255,255,.75); }
  .star-fab .n:empty { display: none; }
  .star-fab.twinkle .star-ic { animation: star-twinkle 1.1s cubic-bezier(.3,1.5,.5,1); }
  .star-fab.twinkle .star-ic::after { animation: star-ring 1.1s ease-out; }
  .star-fab.cheer { animation: star-cheer .9s cubic-bezier(.3,1.6,.5,1); }
  .star-fab.cheer .star-ic { animation: star-twinkle 1.1s cubic-bezier(.3,1.5,.5,1) 2; }
  .star-fab.cheer .star-ic::after { animation: star-ring 1.1s ease-out 2; }
  @keyframes star-twinkle { 0% { transform: none; } 35% { transform: rotate(144deg) scale(1.35); } 100% { transform: rotate(144deg) scale(1); } }
  @keyframes star-ring { 0% { opacity: .9; transform: scale(.5); } 100% { opacity: 0; transform: scale(1.8); } }
  @keyframes star-cheer { 0%, 100% { transform: none; } 30% { transform: translateY(-10px) scale(1.06); } 60% { transform: translateY(0) scale(.98); } }
  @media (max-width: 600px) { .star-fab { right: 14px; bottom: 14px; padding: 10px 14px 10px 11px; font-size: 14px; } .star-fab .dim { display: none; } }
  @media (prefers-reduced-motion: reduce) { .star-fab { transition: opacity .2s; transform: none; } .star-fab.twinkle .star-ic, .star-fab.cheer, .star-fab.cheer .star-ic, .star-fab .star-ic::after { animation: none !important; } }
`;
document.head.append(css);

const fab = document.createElement('a');
fab.className = 'star-fab';
fab.href = URL_;
fab.target = '_blank';
fab.rel = 'noopener';
fab.setAttribute('aria-label', 'Love it? Star bezelkit on GitHub');
fab.innerHTML = `<span class="star-ic">${STAR}</span><span><span class="dim">Love it?</span> Star it</span><span class="n"></span>`;
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
document.addEventListener('click', (e) => { if (e.target.closest('#copySnippet, #copyAiPrompt, .hx-npm, [data-copy], .cta .btn')) setTimeout(cheer, 700); });
