// Dropamine — page d'administration (admin.html) : file d'attente des aperçus, relevés, réglages, guildes suivies, Scout.
// Réservée au compte administrateur (ADMIN_TAGS sur le serveur) ; les données publiques sont lues directement dans le dépôt.
(() => {
  const API = 'https://api.dropamine.app';
  const RAW = 'https://raw.githubusercontent.com/Raykuilu/dropamine-site/main/';
  const GH = 'https://api.github.com/repos/Raykuilu/dropamine-site/actions/workflows/update.yml/runs?per_page=12';
  const box = document.getElementById('adm');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n ?? 0).toLocaleString('fr-FR');
  const when = iso => iso ? new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const dayDate = d => d != null ? new Date(d * 864e5).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—';
  const call = (path, body) => fetch(API + path, body ? { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'include' });
  const raw = (f, fb) => fetch(RAW + f + '?nc=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.json() : fb).catch(() => fb);
  const VIA = { scout: 'Scout', follow: 'Guildes suivies', guild: 'Membres de guilde' };
  const QDEF = { NEW: 150, MAX: 3000 };
  // relevés planifiés (UTC) : complet à 05:17, vérifications à :41
  const CRON = [[5, 17], [1, 41], [7, 41], [9, 41], [13, 41], [17, 41], [21, 41], [23, 41]];
  const nextRun = () => { const now = new Date(); let best = null;
    for (let add = 0; add < 2; add++) for (const [h, m] of CRON) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + add, h, m));
      if (d > now && (!best || d < best)) best = d; }
    return best; };
  let D = {}, msg = {};

  async function load() {
    let me = null;
    try { const r = await call('/me'); me = r.ok ? await r.json() : null; } catch { me = null; }
    if (!me) { box.innerHTML = `<h1>Admin</h1><p>Connecte-toi d'abord avec Battle.net, puis reviens sur cette page.</p><p><a class="btn bnet-btn" href="${API}/auth/login">Se connecter avec Battle.net</a></p>`; return false; }
    if (!me.admin) { box.innerHTML = `<h1>Admin</h1><p>Ce compte (${esc(me.battletag)}) n'a pas accès à cette page.</p>`; return false; }
    const [queue, scouted, guilds, settings, hs, runs] = await Promise.all([
      raw('data/queue.json', { players: {}, guilds: {}, gone: {}, runs: [] }), raw('data/scouted.json', { players: {} }),
      raw('data/guilds.json', { guilds: [] }), raw('data/settings.json', {}),
      fetch('data/hiscores.json?nc=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => ({ players: [] })),
      fetch(GH).then(r => r.ok ? r.json() : { workflow_runs: [] }).catch(() => ({ workflow_runs: [] })),
    ]);
    D = { me, queue, scouted, guilds, settings, hs, runs: runs.workflow_runs || [] };
    return true;
  }

  function draw() {
    const { me, queue, scouted, guilds, settings, hs, runs } = D;
    const players = hs.players || [], previews = players.filter(p => p.preview), reg = players.length - previews.length;
    const waiting = Object.entries(queue.players || {}), bySrc = { scout: 0, follow: 0, guild: 0 };
    waiting.forEach(([, v]) => { bySrc[v.via] = (bySrc[v.via] || 0) + 1; });
    const max = settings.maxPreviews ?? QDEF.MAX, perRun = settings.newPerRun ?? QDEF.NEW;
    const viaShown = { scout: 0, follow: 0, guild: 0 }; previews.forEach(p => { viaShown[p.via || 'follow'] = (viaShown[p.via || 'follow'] || 0) + 1; });
    const day = Math.floor(Date.now() / 864e5), stale = previews.filter(p => (p.fetched ?? 0) < day).length;
    const sc = Object.values(scouted.players || {}), scLast = sc.reduce((m, v) => Math.max(m, v.d || 0), 0);
    const nx = nextRun(), active = runs.find(r => r.status !== 'completed');
    const order = { scout: 0, follow: 1, guild: 2 };
    const next10 = [...waiting].sort((a, b) => order[a[1].via] - order[b[1].via] || (b[1].l || 0) - (a[1].l || 0)).slice(0, 10);
    const qRuns = queue.runs || [];
    const followed = (guilds.guilds || []);
    const read = Object.entries(queue.guilds || {}).sort((a, b) => b[1] - a[1]);
    const gone = Object.keys(queue.gone || {}).length;
    const m = k => msg[k] ? `<p class="msg">${esc(msg[k])}</p>` : '';
    box.innerHTML = `
      <div class="adm-top"><img src="Dropamine-Logo.png" alt=""><h1>Admin</h1><span class="who">${esc(me.battletag)} · <a href="./">retour au site</a> · <button class="lnk" data-a="reload">actualiser</button></span></div>
      <div class="adm-kpis">
        <div class="adm-k"><small>Aperçus en ligne</small><b>${fmt(previews.length)}</b><em>plafond ${fmt(max)}</em><div class="bar"><i style="width:${Math.min(100, 100 * previews.length / Math.max(1, max)).toFixed(1)}%"></i></div></div>
        <div class="adm-k"><small>En attente</small><b>${fmt(waiting.length)}</b><em>${fmt(perRun)} par relevé · ≈ ${fmt(Math.ceil(waiting.length / Math.max(1, perRun)))} relevés</em></div>
        <div class="adm-k"><small>Inscrits</small><b>${fmt(reg)}</b><em>${fmt(players.length)} personnages publiés</em></div>
        <div class="adm-k"><small>À relire aujourd'hui</small><b>${fmt(stale)}</b><em>${fmt(gone)} introuvables écartés (30 j)</em></div>
        <div class="adm-k"><small>Prochain relevé prévu</small><b style="font-size:22px">${nx ? nx.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</b><em>${active ? `<span class="going">en cours depuis ${when(active.run_started_at || active.created_at)}</span>` : 'aucun en cours'}</em></div>
      </div>
      <div class="adm-grid">
        <section class="adm-card"><h2>File d'attente</h2>
          <table><tr><th>Source</th><th style="text-align:right">En attente</th><th style="text-align:right">En ligne</th></tr>
            ${['scout', 'follow', 'guild'].map(k => `<tr><td>${VIA[k]}</td><td class="n">${fmt(bySrc[k])}</td><td class="n">${fmt(viaShown[k])}</td></tr>`).join('')}</table>
          <p style="margin-top:12px">Prochains à passer :</p>
          <table>${next10.map(([k, v]) => `<tr><td>${esc(k)}</td><td><span class="src">${VIA[v.via] || v.via}</span></td><td class="n">${v.l || ''}</td></tr>`).join('') || '<tr><td>File vide</td></tr>'}</table>
        </section>
        <section class="adm-card"><h2>Relevés</h2>
          <div class="adm-row"><button class="btn gold" data-a="run">Lancer un relevé maintenant</button></div>${m('run')}
          <table style="margin-top:10px"><tr><th>Quand</th><th style="text-align:right">Nouveaux</th><th style="text-align:right">Relus</th><th style="text-align:right">+ file</th><th style="text-align:right">Introuv.</th><th style="text-align:right">Publiés</th></tr>
            ${qRuns.slice(0, 8).map(r => `<tr><td>${when(r.t)}</td><td class="n">${fmt(r.fresh)}</td><td class="n">${fmt(r.refreshed)}</td><td class="n">${fmt(r.added)}</td><td class="n">${fmt(r.notFound)}</td><td class="n">${fmt(r.published)}</td></tr>`).join('') || '<tr><td colspan="6">Pas encore de relevé avec la file.</td></tr>'}</table>
          <p style="margin-top:12px">Exécutions GitHub :</p>
          <table>${runs.slice(0, 8).map(r => { const s = r.status !== 'completed' ? '<span class="going">en cours</span>' : r.conclusion === 'success' ? '<span class="ok">réussi</span>' : r.conclusion === 'skipped' ? 'ignoré' : `<span class="ko">${esc(r.conclusion)}</span>`;
            const dur = r.status === 'completed' ? Math.round((Date.parse(r.updated_at) - Date.parse(r.run_started_at || r.created_at)) / 1000) : null;
            return `<tr><td><a href="${esc(r.html_url)}" target="_blank" rel="noopener">${when(r.created_at)}</a></td><td>${esc({ schedule: 'planifié', push: 'push', workflow_dispatch: 'demandé' }[r.event] || r.event)}</td><td>${s}</td><td class="n">${dur != null ? dur + ' s' : ''}</td></tr>`; }).join('') || '<tr><td>Indisponible</td></tr>'}</table>
        </section>
        <section class="adm-card"><h2>Réglages</h2>
          <div class="adm-row">
            <label>Nouveaux par relevé (0-500)<input type="number" min="0" max="500" step="10" id="s-new" value="${perRun}"></label>
            <label>Plafond d'aperçus (0-10 000)<input type="number" min="0" max="10000" step="100" id="s-max" value="${max}"></label>
          </div>
          <div class="adm-row"><button class="btn gold" data-a="settings">Enregistrer</button></div>${m('settings')}
          <p>Un relevé coûte environ 8 appels par personnage lu (limite Blizzard : 36 000 par heure). Au-delà de 3 000 aperçus, la page du classement s'alourdit.</p>
        </section>
        <section class="adm-card"><h2>Scout</h2>
          <p>${fmt(sc.length)} joueurs repérés (30 jours) · dernier vu le ${dayDate(scLast || null)}</p>
          <textarea id="scoutline" spellcheck="false" placeholder="DROP:SCOUT1:…"></textarea>
          <div class="adm-row"><button class="btn gold" data-a="scout">Envoyer</button></div>${m('scout')}
        </section>
        <section class="adm-card"><h2>Guildes</h2>
          <p>Suivies (tous leurs membres 10+ entrent dans la file) :</p>
          <table>${followed.map(g => `<tr><td>${esc(g)}</td><td style="text-align:right"><button class="lnk" data-a="unfollow" data-k="${esc(g)}">ne plus suivre</button></td></tr>`).join('') || '<tr><td>Aucune</td></tr>'}</table>
          <div class="adm-row"><input type="text" id="g-key" placeholder="eu/nom-de-guilde" size="24"><button class="btn ghost" data-a="follow">Suivre</button></div>${m('guild')}
          <p style="margin-top:12px">Lues automatiquement (relues tous les 7 jours) :</p>
          <table>${read.slice(0, 15).map(([k, d]) => `<tr><td>${esc(k)}</td><td>lue le ${dayDate(d)}</td><td>prochaine ${dayDate(d + 7)}</td></tr>`).join('') || '<tr><td>Aucune pour l\'instant</td></tr>'}</table>
        </section>
        <section class="adm-card"><h2>Retirer un personnage</h2>
          <p>Masqué pour de bon (il ne revient pas, sauf s'il s'inscrit lui-même) et son historique est effacé.</p>
          <div class="adm-row"><input type="text" id="h-key" placeholder="eu/prenom-nom" size="24"><button class="btn ghost" data-a="hide">Retirer</button></div>${m('hide')}
        </section>
      </div>`;
  }

  async function act(a, el) {
    const say = (k, t) => { msg = { [k]: t }; draw(); };
    const post = async (path, body) => { const r = await call(path, body); const j = await r.json().catch(() => ({})); return { ok: r.ok, j }; };
    if (a === 'reload') { msg = {}; if (await load()) draw(); return; }
    if (a === 'run') { const r = await post('/admin/run', {}); say('run', r.ok ? 'Relevé demandé : il démarre dans la minute.' : 'Refusé (' + (r.j.error || '?') + ').'); return; }
    if (a === 'settings') {
      const r = await post('/admin/settings', { newPerRun: document.getElementById('s-new').value, maxPreviews: document.getElementById('s-max').value });
      if (r.ok) D.settings = r.j.settings;
      say('settings', r.ok ? 'Enregistré : pris en compte au prochain relevé.' : 'Refusé (' + (r.j.error || '?') + ').'); return;
    }
    if (a === 'scout') {
      const line = document.getElementById('scoutline').value.trim(); if (!line) return;
      const r = await post('/scout', { line });
      say('scout', r.ok ? `Reçu : ${r.j.received} joueurs, ${r.j.added} nouveaux · ${r.j.total} dans la liste.` : 'Refusé (' + (r.j.error || '?') + ').'); return;
    }
    if (a === 'follow' || a === 'unfollow') {
      const key = a === 'follow' ? document.getElementById('g-key').value.trim().toLowerCase() : el.dataset.k;
      if (!key) return;
      const r = await post('/admin/guild', { key, follow: a === 'follow' });
      if (r.ok) D.guilds = { guilds: r.j.guilds };
      say('guild', r.ok ? (a === 'follow' ? `Suivie : ${key}.` : `Plus suivie : ${key}.`) : 'Refusé (' + (r.j.error || '?') + ').'); return;
    }
    if (a === 'hide') {
      const key = document.getElementById('h-key').value.trim().toLowerCase(); if (!key) return;
      if (!confirm(`Retirer ${key} du site pour de bon ?`)) return;
      const r = await post('/admin/hide', { key });
      say('hide', r.ok ? (r.j.done?.length ? `Retiré : ${key}.` : `${key} était déjà retiré.`) : 'Refusé (' + (r.j.error || '?') + ').');
    }
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; e.preventDefault(); b.disabled = true; act(b.dataset.a, b).finally(() => { b.disabled = false; }); });
  load().then(ok => { if (ok) draw(); });
})();
