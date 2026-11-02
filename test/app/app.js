/* Ember · prototype V14 · de app om de schermen heen.
   De schermen komen uit screens.js, gegenereerd uit dezelfde bron als het canvas (flowgen/screens14.py).
   Hier: navigatie met een terug-stapel, overgangen, de levende zwerm van de site (zwerm.js), de animaties van de site (anim.js),
   wat vanzelf gebeurt (scannen, vastklikken, de teller van 3 minuten), invoer, en een testpaneel voor de testleider.
   Openen van het testpaneel: ?test=1 (knop), de toets T, of lang drukken op de bovenrand. Starten op een scherm: #ID in de URL. */
(function () {
  'use strict';
  const SCR = window.SCR, ROWS = window.ROWS;
  const phone = document.getElementById('phone');
  const HOLD = /[?&]hold=1/.test(location.search);          // geen automatische overgangen (voor schermafbeeldingen)
  const FAST = /[?&]fast=1/.test(location.search);          // alles sneller (voor de controle)
  const T = ms => FAST ? Math.max(120, ms / 8) : ms;

  /* ---------------------------------------------------------------- de statusbalk en home-indicator van de ontwerpen */
  const SBAR = '<div class="sbar" aria-hidden="true"><span class="tm">9:41</span><span class="ic"><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"></rect><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"></rect><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"></rect><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"></rect></svg><svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5l2.2-2.6a3.2 3.2 0 0 0-4.4 0L8 11.5zM3.6 6.4l1.4 1.6a4.6 4.6 0 0 1 6 0l1.4-1.6a6.8 6.8 0 0 0-8.8 0zM1.2 3.6l1.4 1.6a8 8 0 0 1 10.8 0l1.4-1.6a10.2 10.2 0 0 0-13.6 0z" fill="currentColor"></path></svg><svg width="26" height="12" viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4"></rect><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"></rect><rect x="23.5" y="4" width="1.5" height="4" rx=".75" fill="currentColor" opacity=".4"></rect></svg></span></div>';
  const HIND = '<div class="hind" aria-hidden="true"></div>';

  /* ---------------------------------------------------------------- de zwerm: rustig rood in V14 */
  const Swarm = window.EmberSwarm;
  if (Swarm && Swarm.STATES) {
    Swarm.STATES.oververhit.amp = 0.03; Swarm.STATES.oververhit.speed = 1.5; Swarm.STATES.oververhit.size = 1;
    Swarm.STATES.aandacht.speed = 1.2;
  }
  const ZSTATE = { white: 'rust', ok: 'normaal', warn: 'aandacht', danger: 'oververhit', idle: 'geen' };
  const PALETTES = { oververhit: ['#EBA39B', '#D8695F', '#F4C3BC', '#E3857B'], aandacht: ['#F2C88A', '#E3A548', '#F8DDB3', '#EDBB6E'] };
  const ALPHA = { oververhit: .78, aandacht: .9 };
  const AFTER = ['N06', 'N06k', 'N06j', 'N09', 'N10', 'N10c', 'N01z', 'N11', 'N11b', 'N03b', 'N03v'];   // je hebt al gekozen: de zwerm komt tot rust
  let lastZ = null;

  /* ---------------------------------------------------------------- wat vanzelf gebeurt */
  // Een beeld met een link in het ontwerp (zwerm, Ember, clip, zoeker) betekent: dit gaat vanzelf verder. Hier hoe snel.
  const AUTO = { A1: 3400, O33c: 2600, O18: 3200, V18: 3200, E18: 3200, O20: 3800, V20: 3800, E20: 3800, O21: 5200,
    N09: 6500, N10: 6500, N10c: 5000, N06: 7000, N06k: 7000, N06j: 6000, N03b: 7000, N11b: 7000, N12f: 5000, H2b: 9000, O35: 0 };
  const CHECK = ['O22', 'V22', 'E22', 'E22v', 'T22', 'T22b', 'T22v', 'O29s', 'O29Hs'];   // regels die vanzelf afvinken: Sticker gevonden en de eerste meting, of wat bij het testalarm aankwam
  const COUNT = ['N01', 'N01r', 'N01g'];                          // de teller tot je contacten een sms krijgen
  const OVERLAY = { O27a: 'O27', O27c: 'O27a', O27La: 'O27L', O27Lc: 'O27La' };  // systeemvragen: het scherm blijft staan, de vraag komt erover
  const SIM = { stickerFail: false, noMeasure: false, ledOff: false, codeWrong: false, linked: false, noContacts: false, noAccount: false, hasAccount: false,
    alarmBack: false, noSignal: false, nobodyGoes: false, contactRook: false };
  const SIMROWS = [['noAccount', 'Geen account gevonden', 'Inloggen met je nummer, gaat naar Geen account gevonden'], ['hasAccount', 'Nummer heeft al een account', 'Account maken, gaat naar Je hebt al een account'],
    ['codeWrong', 'Code klopt niet', 'De sms-code, gaat naar Code klopt niet'], 
    ['stickerFail', 'Sticker niet gelezen', 'Vastklikken of terugzetten, gaat naar Sticker niet gelezen'],
    ['noMeasure', 'Geen eerste meting', 'Vastklikken of terugzetten, gaat naar Geen meting'],
    ['noSignal', 'Geen meting tijdens het alarm', 'Op het alarmscherm, na een paar seconden'], ['alarmBack', 'Het alarm komt terug', 'Na Stekker is eruit, gaat naar Het alarm is terug'],
    ['noContacts', 'Nog geen contacten', 'Niet in de buurt, gaat naar Niemand doet mee'], ['nobodyGoes', 'Niemand kan gaan', 'Na de sms aan je contacten, gaat naar Niemand kan gaan'],
    ['contactRook', 'Je contact ziet rook', 'Je contact gaat kijken, gaat naar Je contact ziet rook']];
  const FLAG = { noTest: false, noContacts: false, noNotif: null };   // wat je bij het instellen oversloeg: dat staat daarna op Home (noNotif: 'u' alles uit, 'k' kritieke uit)
  let FIX = [];
  let CONTACT = null;   // de naam die je bij Wie wil je toevoegen? typte: Uitnodiging verstuurd noemt die   // wat bij het testalarm niet doorkwam: Zo los je het op toont alleen die tips
  const END = ['N12x', 'N12e', 'N12g', 'N12v', 'L03n', 'L03k'];   // de laatste pagina van je contact: hier eindigt de route
  const SCEN = [['Starten', [['A1', 'Nieuwe gebruiker', 'Van het openen van de app tot Home. Sla je de test of je contacten over, dan zie je dat op Home'], ['O02', 'Inloggen op een nieuwe telefoon', 'Met je nummer, en de meldingsvragen']]],
    ['Dagelijks', [['H1', 'Home', 'Alles normaal. Tik op de zwerm voor Aandacht en Oververhit'], ['H10', 'Voertuig toevoegen', 'Via Jouw voertuigen'], ['H11', 'Voertuig zonder Ember', 'Ember verplaatsen of een nieuwe'],
      ['N20', 'Ember is bijna leeg', 'Opladen en terugzetten']]],
    ['Als het misgaat', [['H0', 'De accu wordt warmer', 'Melding, Home in Aandacht'], ['N00', 'Oververhit', 'Kritieke melding, de keuzes en de teller. Lang drukken op de melding voor de snelle keuzes'],
      ['N00b', 'Brandgevaar', 'Kritieke melding en 112'], ['H4', 'Geen verbinding', 'Ember werkt niet goed'], ['H4b', 'Ember zit niet op de accu', 'Terugzetten'],
      ['NDEF', 'Ember meet niet goed', 'Een vervangende Ember aanvragen en vastklikken']]],
    ['Je contact', [['L03b', 'De uitnodiging', 'Meedoen of niet'], ['N12a', 'Oververhit', 'Sms en webpagina, gaan kijken'], ['BGS', 'Brandgevaar', 'Sms en webpagina, 112'],
      ['N12y', 'Mats komt ook', 'De sms als Mats zelf gaat'], ['N12z', 'Het alarm is voorbij', 'De sms als de accu afkoelt']]]];
  const SPOT = { 'Bagagedrager': [21.4, 33.9], 'Onderbuis': [57.1, 53.7], 'In het frame': [65.4, 39.0], 'Voorop': [81.0, 32.0], 'Weet ik niet': [57.1, 53.7] };
  const WAAR = { 'Bagagedrager': 'op de bagagedrager', 'Onderbuis': 'in de onderbuis', 'In het frame': 'in het frame', 'Voorop': 'voorop' };
  let PLEK = null;   // wat je koos bij Waar zit de accu?; Zoek de plek toont die plek
  const STEP = { H1: 'H2', H1b: 'H2', H1m: 'H2', H1t: 'H2', H1n: 'H2', H1nm: 'H2', H1nu: 'H2', H1mu: 'H2', H5: 'H2', H5c: 'H2', H5d: 'H2', H2: 'H3', H2b: 'H3', H3: 'H1', H3k: 'H1', H3s: 'H1', HNG: 'H1',
    D1: 'D1w', D1w: 'D1r', D1r: 'D1', D2: 'D2w', D2w: 'D2r', D2r: 'D2', T7: 'T7w', T7w: 'T7r', T7r: 'T7' };
  const CALLS = { 'Bel Mats': 'Je belt Mats', 'Bel je contact': 'Je belt je contact' };
  const SELF = { 'Code opnieuw versturen': 'Nieuwe code verstuurd.', 'Kies uit je telefoonboek': 'Hier opent je telefoonboek.', 'Contacten': 'Hier openen je contacten.', 'Nog iemand toevoegen': 'Hier voeg je nog iemand toe.',
    'Chat met AvenNex': 'Hier opent de chat met AvenNex.', 'Piep uit': 'De piep is uit.', 'Nummer opslaan': 'Het nummer staat in je contacten.', 'Overslaan': 'Overgeslagen.',
    'Melden bij de NVWA': 'Hier opent het meldformulier van de NVWA.', 'Uitnodiging opnieuw sturen': 'Uitnodiging opnieuw verstuurd.', 'Handleiding': 'Hier opent de handleiding.',
    'Veelgestelde vragen': 'Hier openen de veelgestelde vragen.', 'Vervangende Ember aanvragen': 'Aangevraagd.', 'Code intypen': 'Typ de code onder de QR-code.', 'Kritieke meldingen': 'Hier opent Instellingen van je telefoon.', 'Bel 112': 'Je belt 112' };

  /* ---------------------------------------------------------------- navigatie */
  let stack = [], cur = null, curEl = null, timers = [], swarms = [], anims = [];
  function clearAll() { timers.forEach(clearTimeout); timers.forEach(clearInterval); timers = []; }
  function later(f, ms) { const t = setTimeout(f, ms); timers.push(t); return t; }
  function every(f, ms) { const t = setInterval(f, ms); timers.push(t); return t; }
  function go(id, o = {}) {
    if (SIM.noContacts && (id === 'N09' || id === 'N09i') && /^N0[01]/.test(cur || '')) id = 'N09c';
    if (SIM.noAccount && id === 'O02f' && cur === 'O02') { SIM.noAccount = false; id = 'O02g'; }
    if (SIM.hasAccount && id === 'OSMS' && cur === 'O32t') { SIM.hasAccount = false; id = 'O32x'; }
    if (SIM.alarmBack && id === 'N06k' && cur === 'N06') { SIM.alarmBack = false; id = 'N01r'; }
    if (SIM.nobodyGoes && id === 'N10' && cur === 'N09') { SIM.nobodyGoes = false; id = 'N11'; }
    if (SIM.contactRook && id === 'N10c' && cur === 'N10') { SIM.contactRook = false; id = 'N10b'; }
    // na het instellen: Home toont wat nog open staat, in de volgorde van de meldingen op Home
    if (id === 'H1n' && cur === 'O35') { if (FLAG.noNotif === 'k') id = 'H1nm'; else if (FLAG.noNotif === 'u') id = 'H1nu'; else if (FLAG.noContacts) id = 'H1b'; else if (FLAG.noTest) id = 'H1t'; }
    if (o.reset) { FLAG.noTest = FLAG.noContacts = false; FLAG.noNotif = null; PLEK = null; FIX = []; }
    if (!SCR[id]) { toast('Dit scherm staat niet in het prototype.'); return; }
    if (o.reset) stack = []; else if (cur && cur !== id) stack.push(cur);
    show(id, OVERLAY[id] === cur ? 'over' : 'fwd');
  }
  function back(fallback) {
    if (stack.length) { const id = stack.pop(); show(id, OVERLAY[cur] === id ? 'unover' : 'back'); }
    else if (fallback && SCR[fallback]) show(fallback, 'back');
  }
  function show(id, dir) {
    const d = SCR[id]; if (!d) return;
    clearAll();
    const old = curEl, oldSw = swarms, oldAn = anims;
    swarms = []; anims = [];
    const el = document.createElement('section');
    el.className = 'screen'; el.dataset.id = id; el.setAttribute('aria-label', d.n);
    el.innerHTML = `<div class="${d.c}">${SBAR}${d.h}${HIND}</div>`;
    // V18 · de overgang hangt af van wat er verandert:
    //   step  binnen een flow: de kop en de voortgang blijven staan, alleen de inhoud wisselt rustig
    //   morph allebei een zwerm: de zwerm schuift door naar zijn nieuwe plek en grootte (splash naar welkom, Home naar het alarm)
    //   push  van Home naar een pagina en terug
    //   open  van een melding op het vergrendelscherm naar de app
    if (old) old.classList.remove('clear');
    const kind = old ? pick(old, el, dir) : 'none', sign = dir === 'back' ? -1 : 1;
    if (dir === 'swap' && old) { el.scrollTop = old.scrollTop; }
    if (kind === 'push') el.classList.add(dir === 'back' ? 'enter-l' : 'enter-r');
    else if (kind === 'over' || kind === 'fade') el.classList.add('fade-in');
    else if (kind === 'open') el.classList.add('op-in');
    else if (kind === 'step' || kind === 'morph') prepStep(old, el, sign, kind === 'morph');
    phone.appendChild(el);
    if (kind === 'morph') carryZw(old, el, oldSw);
    mount(el, id);
    if (old) {
      if (kind === 'step' || kind === 'morph') carryProgress(old, el);
      if (kind === 'morph') flip(old, el);
      void el.offsetWidth;
      el.classList.remove('enter-r', 'enter-l', 'fade-in', 'op-in', 'st-in');
      if (kind === 'swap') setTimeout(() => cleanup(old, oldSw, oldAn), 60);
      else if (kind === 'over') setTimeout(() => cleanup(old, oldSw, oldAn), 360);
      else if (kind === 'step' || kind === 'morph') { old.classList.add('st-out'); setTimeout(() => { cleanup(old, oldSw, oldAn); el.classList.remove('anim', 'clear', 'keephead', 'morph', 'late'); }, el.classList.contains('late') ? 1000 : 520); }
      else { old.classList.add(kind === 'push' ? (dir === 'back' ? 'leave-r' : 'leave-l') : 'leave-fade'); setTimeout(() => cleanup(old, oldSw, oldAn), 380); }
    }
    cur = id; curEl = el;
    try { history.replaceState(null, '', location.pathname + location.search + '#' + id); } catch (e) {}
    behave(el, id);
  }
  const zwOf = s => s.querySelector(':scope > .scr > :is(.body, .alarm-body, .hbody) > .held');
  const special = s => s.classList.contains('lock') || s.classList.contains('sms');
  function headSig(s) {
    const scr = s.firstElementChild, k = scr.querySelector(':scope > .kop');
    if (scr.querySelector(':scope > .webbar')) return 'web';
    if (!k) return 'none';
    const t = k.querySelector('.kopt');
    return k.querySelector('.prog') ? 'prog' : t ? 'kopt:' + t.textContent : 'plain';   // de terugknop mag verschillen: hij verschijnt gewoon
  }
  function pick(old, el, dir) {
    if (dir === 'over' || dir === 'swap') return dir;
    if (dir === 'unover' || REDUCE) return 'fade';
    const a = old.firstElementChild, b = el.firstElementChild;
    if (special(a) && !special(b)) return 'open';
    if (special(b)) return 'fade';
    if (zwOf(old) && zwOf(el)) return 'morph';
    if (!!a.querySelector(':scope > .hbody') !== !!b.querySelector(':scope > .hbody')) return 'push';
    return 'step';
  }
  function prepStep(old, el, sign, morph) {
    const same = headSig(old) === headSig(el) && headSig(el) !== 'none';
    el.classList.add('anim', 'st-in', 'clear'); old.classList.add('anim');
    el.style.setProperty('--dx', (20 * sign) + 'px'); old.style.setProperty('--dx', (-20 * sign) + 'px');
    if (same) { el.classList.add('keephead'); old.classList.add('keephead'); }
    if (morph) { el.classList.add('morph'); old.classList.add('morph'); }
    // van de splash: er stond alleen de zwerm, dus de rest komt rustig van onder als de zwerm bijna op zijn plek is
    const za = zwOf(old);
    if (morph && za && za.parentElement.children.length === 1) { el.classList.add('late'); el.style.setProperty('--dx', '0px'); el.style.setProperty('--dy', '16px'); }
  }
  // de voortgang loopt door: de balk groeit van waar hij was naar waar hij nu is
  function carryProgress(old, el) {
    const os = [...old.querySelectorAll(':scope > .scr > .kop .seg')], ns = [...el.querySelectorAll(':scope > .scr > .kop .seg')];
    if (!os.length || os.length !== ns.length) return;
    ns.forEach((n, i) => {
      const fill = n.querySelector('i'), to = fill.style.width, cls = n.className;
      n.style.transition = fill.style.transition = 'none'; n.className = os[i].className; fill.style.width = os[i].querySelector('i').style.width;
      requestAnimationFrame(() => requestAnimationFrame(() => { n.style.transition = 'width .5s cubic-bezier(.2,.8,.2,1)'; fill.style.transition = 'width .6s cubic-bezier(.2,.8,.2,1)'; n.className = cls; fill.style.width = to; }));
    });
  }
  // V19 · de zwerm zelf gaat mee naar het nieuwe scherm: hetzelfde canvas en dezelfde stippen, dus hij begint niet opnieuw.
  // Is het label gelijk (het logo op splash en welkom), dan blijft het gewoon staan.
  function carryZw(old, el, oldSw) {
    const ha = zwOf(old), hb = zwOf(el); if (!ha || !hb) return;
    const za = ha.querySelector('.zwh'), zb = hb.querySelector('.zwh'); if (!za || !zb) return;
    const ca = za.querySelector('canvas'), cb = zb.querySelector('canvas'), sw = oldSw.find(x => x.c === ca);
    if (ca && cb && sw) { cb.replaceWith(ca); oldSw.splice(oldSw.indexOf(sw), 1); zb._sw = sw; }
    const la = za.querySelector('.zw-lab'), lb = zb.querySelector('.zw-lab');
    if (la && lb && la.innerHTML === lb.innerHTML) zb.classList.add('samelab');
  }
  // de zwerm schuift van zijn oude plek en grootte naar de nieuwe, rustig op gang en rustig tot stilstand
  function flip(old, el) {
    const ha = zwOf(old), hb = zwOf(el); if (!ha || !hb) return;
    const a = ha.querySelector('.zwh') || ha, b = hb.querySelector('.zwh') || hb;
    const k = phone.getBoundingClientRect().width / phone.offsetWidth || 1;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); if (!ra.height || !rb.height) return;
    const s = Math.min(ra.width, ra.height) / Math.min(rb.width, rb.height), dx = (ra.left + ra.width / 2 - rb.left - rb.width / 2) / k, dy = (ra.top + ra.height / 2 - rb.top - rb.height / 2) / k;
    const dur = Math.min(.95, .6 + Math.hypot(dx, dy) / 700 + Math.abs(1 - s) * .3);
    b.style.transition = 'none'; b.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      b.style.transition = `transform ${dur.toFixed(2)}s cubic-bezier(.45,0,.2,1)`; b.style.transform = '';
      setTimeout(() => { b.style.transition = ''; }, dur * 1000 + 50);
    }));
  }
  function cleanup(el, sw, an) { sw.forEach(s => s.stop()); an.forEach(a => a && a.destroy && a.destroy()); el.remove(); }

  /* ---------------------------------------------------------------- zwerm en animaties starten */
  function mount(el, id) {
    el.querySelectorAll('.zwh').forEach(z => {
      if (!Swarm) return;
      const st = ZSTATE[z.dataset.zw] || 'normaal';
      if (z._sw) { const s = z._sw; s.set(st); s.alpha = (AFTER.includes(id) ? .62 : ALPHA[st]) || 1; s.start(); swarms.push(s); lastZ = st; return; }   // meegenomen van het vorige scherm
      const s = new Swarm(z.querySelector('canvas'), { state: lastZ && lastZ !== st ? lastZ : st, palettes: PALETTES, alpha: 1, seed: 20261008 });
      s.alpha = (AFTER.includes(id) ? .62 : ALPHA[st]) || 1;   // na je keuze wordt het rood rustiger
      if (lastZ && lastZ !== st) requestAnimationFrame(() => s.set(st));
      s.start(); swarms.push(s); lastZ = st;
    });
    el.querySelectorAll('[data-anim]').forEach(h => {
      if (h.dataset.anim === 'vastklik') anims.push(vastklik(h, ['O23', 'T23'].includes(id)));
      else if (h.dataset.anim === 'plak') anims.push(plak(h));
      else if (window.EmberAnim) anims.push(EmberAnim.mount(h));
    });
  }

  /* ---------------------------------------------------------------- de VanMoof-beelden in beweging (naar de site: magneetklik en sticker) */
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RING = { x: 48.1, y: 54.2 };   // de lichtring in de foto Ember zit vast, in procenten
  // Ember wacht los van de buis, de magneet trekt hem aan (steeds sneller), hij klikt vast, de lichtjes gaan aan en er springen stippen af.
  function vastklik(host, loop) {
    const k = host.querySelector('img'); if (!k) return null;
    // lagen: het lege frame met de sticker, Ember los (uit de foto geknipt) die naar de sticker beweegt, en de foto waarin hij vastzit
    k.src = 'assets/frame.webp';
    const los = document.createElement('img'); los.src = 'assets/ember-los.webp'; los.alt = ''; los.className = 'vk-los'; (host.querySelector('.stk') || k).after(los);
    const v = document.createElement('img'); v.src = 'assets/vast.webp'; v.alt = ''; v.className = 'vk-vast'; los.after(v);   // Ember dekt de sticker af
    const cover = document.createElement('span'); cover.className = 'vk-cover'; const glow = document.createElement('span'); glow.className = 'vk-glow';
    const dots = document.createElement('span'); dots.className = 'vk-dots';
    for (let i = 0; i < 12; i++) { const d = document.createElement('i'); const a = i / 12 * Math.PI * 2; d.style.setProperty('--dx', (Math.cos(a) * (26 + (i % 3) * 9)).toFixed(1) + 'px'); d.style.setProperty('--dy', (Math.sin(a) * (26 + (i % 3) * 9)).toFixed(1) + 'px'); dots.appendChild(d); }
    [cover, glow, dots].forEach(e => { e.style.left = RING.x + '%'; e.style.top = RING.y + '%'; v.after(e); });
    const ts = [], at = (f, ms) => ts.push(setTimeout(f, ms));
    const reset = () => { host.classList.remove('vk-pull', 'vk-on', 'vk-wake'); };
    const run = () => {
      reset();
      at(() => host.classList.add('vk-pull'), T(900));
      at(() => { host.classList.add('vk-on'); host.animate([{ transform: 'scale(1)' }, { transform: 'scale(.985)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'ease-out' }); }, T(1240));
      at(() => host.classList.add('vk-wake'), T(1360));
      if (loop) at(run, T(4400));
    };
    if (REDUCE || HOLD) host.classList.add('vk-on', 'vk-wake'); else run();
    return { destroy() { ts.forEach(clearTimeout); } };
  }
  // de sticker komt langs de normaal binnen, een derde groter, en landt op de buis; daarna druk je hem aan
  function plak(host) {
    const s = host.querySelector('.stk'); if (!s) return null;
    if (REDUCE || HOLD) return null;
    s.classList.add('pl-start'); const t = setTimeout(() => { s.classList.remove('pl-start'); s.classList.add('pl-land'); }, T(450));
    const t2 = setTimeout(() => s.classList.add('pl-press'), T(1300));
    return { destroy() { clearTimeout(t); clearTimeout(t2); } };
  }

  /* ---------------------------------------------------------------- per scherm: wat vanzelf gebeurt */
  // de live status van je voertuig: wat Home laat zien, staat ook in Jouw voertuigen
  let LIVE = { id: 'H1', bg: 'var(--ok)', word: 'Normaal' };
  function behave(el, id) {
    el.querySelectorAll('.chart').forEach(chartArrs);
    if (el.querySelector('.hbody') && /^H\d/.test(id) && id !== 'H10') {
      const b = el.querySelector('.vs .circ .badge'), w = el.querySelector('.hbody .held .zw-lab > span');
      LIVE = { id, bg: b ? b.style.background : 'var(--ok)', word: w && w.textContent.trim() ? w.textContent.trim() : 'Normaal' };
    }
    if (id === 'H10') {
      const v = el.querySelector('.vcard.on'), d = v && v.querySelector('.dot'), t = v && v.querySelector('.t12');
      if (d) d.style.background = LIVE.bg; if (t) t.textContent = LIVE.word; if (v) v.dataset.go = LIVE.id;
    }
    // codevelden: echt typen, bij zes cijfers verder
    el.querySelectorAll('[data-auto]').forEach(a => {
      const otp = a.querySelector('.otp'); if (!otp) return;
      const to = a.dataset.auto; a.removeAttribute('data-auto'); a.classList.add('otpbox');
      const inp = document.createElement('input'); inp.inputMode = 'numeric'; inp.autocomplete = 'one-time-code'; inp.maxLength = 6; inp.setAttribute('aria-label', 'Code van zes cijfers');
      a.appendChild(inp);
      const boxes = [...otp.children];
      const paint = () => { const v = inp.value; boxes.forEach((b, i) => { b.textContent = v[i] ? v[i] : ''; b.classList.toggle('cur', document.activeElement === inp && i === Math.min(v.length, 5)); b.classList.toggle('on', !!v[i]); }); };
      paint();
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 6); paint();
        if (inp.value.length === 6) later(() => {
          if (cur !== id) return;
          if ((SIM.codeWrong || inp.value === '000000') && id === 'OSMS' && SCR.OSMSb) { SIM.codeWrong = false; go('OSMSb'); } else go(to);
        }, 350);
      });
      ['focus', 'blur'].forEach(e => inp.addEventListener(e, paint));
      if (matchMedia('(pointer: fine)').matches) later(() => inp.focus({ preventScroll: true }), 420);
    });
    // Uitnodiging verstuurd: met de naam die je typte
    if ((id === 'O36c' || el.querySelector('.alarm-body')) && CONTACT) {   // de naam die je bij je contact typte, ook in het alarm
      const first = CONTACT.split(/\s+/)[0], ini = first[0].toUpperCase();
      el.querySelectorAll('.t16, .t20, p, .pill, .verloop li > span').forEach(n => { if (!n.children.length) n.textContent = n.textContent.replace('Sanne de Vries', CONTACT).replace(/\bSanne\b/g, first); });
      el.querySelectorAll('.circ .t16').forEach(n => { if (n.textContent.length === 1) n.textContent = ini; });
    }
    // Zo los je het op: alleen de tips voor wat niet doorkwam
    if ((id === 'O30' || id === 'O30H') && FIX.length) el.querySelectorAll('.fix').forEach(f => { f.style.display = FIX.includes(f.dataset.fix) ? '' : 'none'; });
    // Zoek de plek: de plek die je koos
    if ((id === 'O13' || id === 'V13') && PLEK && SPOT[PLEK]) {
      el.querySelectorAll('.foto .hot').forEach(s => { s.style.left = SPOT[PLEK][0] + '%'; s.style.top = SPOT[PLEK][1] + '%'; });
      const p = el.querySelector('.tb p'); if (p) p.textContent = p.textContent.replace(/Midden op de accu [^.]*\./, `Midden op de accu ${WAAR[PLEK]}.`);
    }
    // de sticker: tien seconden aandrukken
    const cnt = el.querySelector('.clip .cnt, .beeld .cnt');   // V21: ook de teller op de foto (Druk de sticker aan) loopt af
    const autoEl = el.querySelector('[data-auto]');
    if (cnt) {
      let n = parseInt(cnt.textContent, 10) || 10;
      const nxt = el.querySelector('.foot .round'); if (nxt && !HOLD) nxt.classList.add('wait');
      if (!HOLD) every(() => { n = Math.max(0, n - 1); cnt.textContent = n; if (n === 0) { if (autoEl) later(() => cur === id && go(autoEl.dataset.auto), 600); else if (nxt) nxt.classList.remove('wait'); } }, T(1000));
      return;
    }
    // vastklikken: Sticker gevonden, dan de meting
    if (CHECK.includes(id) && autoEl && !HOLD) {
      const rows = [...el.querySelectorAll('.dlist .drow')].filter(r => r.querySelector('.check, .spin'));
      const icons = rows.map(r => r.querySelector('.check, .spin'));
      const keep = icons.map(i => i.outerHTML);
      icons.forEach(i => { i.outerHTML = '<span class="spin"></span>'; });
      const fail = /^(O22|T22b?v?)$/.test(id) && (SIM.stickerFail || SIM.noMeasure); const T2 = id !== 'O22';
      const step = (k, ms) => later(() => {
        if (cur !== id) return;
        const r = rows[k]; if (!r) return;
        if (fail && (SIM.stickerFail ? k === 0 : k === 1)) { go(SIM.stickerFail ? (T2 ? 'T23' : 'O23') : (T2 ? 'T26' : 'O26')); SIM.stickerFail = SIM.noMeasure = false; return; }
        const s = r.querySelector('.spin'); if (s) s.outerHTML = `<span class="check">${keep[0].match(/<svg[\s\S]*<\/svg>/) ? keep[0].match(/<svg[\s\S]*<\/svg>/)[0] : ''}</span>`;
      }, ms);
      rows.forEach((r, k) => step(k, T(1800 + k * 2000)));
      later(() => cur === id && go(autoEl.dataset.auto), T(1200 + rows.length * 2000));
      return;
    }
    // reageer je niet, dan waarschuwen we je contacten. Er loopt geen teller in beeld (die zette onder druk); op het scherm staat een kloktijd.
    // In het prototype gaat het na een minuut vanzelf verder, na Ik ga erheen na anderhalve minuut.
    if (COUNT.includes(id) && SIM.noSignal && id === 'N01' && !HOLD) { later(() => { if (cur === id) { SIM.noSignal = false; show('N01g', 'swap'); } }, T(4500)); }
    if (END.includes(id) && !HOLD) later(() => cur === id && toast('Einde van deze route. Kies de volgende in het testpaneel.'), T(2600));
    if (COUNT.includes(id) && !HOLD) later(() => cur === id && go(SIM.noContacts ? 'N09c' : 'N09'), T(60000));
    // beeld met een link: gaat vanzelf verder
    if (autoEl && !HOLD) {
      const ms = AUTO[id] != null ? AUTO[id] : 4500;
      if (ms > 0) later(() => cur === id && go(autoEl.dataset.auto), T(ms));
    }
  }

  /* ---------------------------------------------------------------- tikken */
  phone.addEventListener('click', e => {
    if (e.target.closest('.sheet, .sheet-bg')) return;
    const cl = e.target.closest('[data-call]'); if (cl && phone.contains(cl)) { call(cl.dataset.call === 'Mats' ? 'Je belt Mats' : 'Je belt 112'); return; }
    // Home: tik op de zwerm en de status loopt op, Normaal, Aandacht, Oververhit, en weer terug (voor de demo)
    const zh = e.target.closest('.hbody .held, .body > .tb, .body > .card.chart .tb'); if (zh && STEP[cur]) { if (/^H/.test(cur)) stack = []; show(STEP[cur], 'swap'); return; }
    // de grafiek: Dag, Week en Maand, met de tabs of met de pijlen
    const tb = e.target.closest('.chart .tab'); if (tb) { chartTab(tb); return; }
    const ar = e.target.closest('.chart .arrs > span');
    if (ar) { e.preventDefault(); const ch = ar.closest('.chart'), tabs = [...ch.querySelectorAll('.tab')], k = tabs.findIndex(x => x.classList.contains('on')), n = k + (ar.previousElementSibling ? 1 : -1); if (tabs[n]) chartTab(tabs[n]); return; }
    const t = e.target.closest('[data-go], [data-back], [data-auto], .chip, .row, .drow, .switch'); if (!t || !phone.contains(t)) return;
    // terug op een alarmscherm brengt je naar Home in die status, niet naar het vorige scherm
    if (t.matches('[data-back]') && curEl.querySelector('.alarm-body') && SCR[t.dataset.back]) { e.preventDefault(); stack = []; show(t.dataset.back, 'back'); return; }
    if (t.matches('[data-back]')) { e.preventDefault(); back(t.dataset.back); return; }
    if (t.matches('[data-auto]')) { e.preventDefault(); go(t.dataset.auto); return; }
    if (t.matches('[data-go]')) {
      e.preventDefault();
      const to = t.dataset.go, label = (t.matches('.pill, .txtbtn, .nact') ? t : (t.querySelector('.grow .t16, .t16, .t20') || t)).textContent.trim();
      if (to === cur) { if (CALLS[label] || /^Bel /.test(label)) call(CALLS[label] || 'Je belt ' + label.slice(4)); else toast(SELF[label] || 'In het prototype gaat dit niet verder.'); return; }
      if (cur === 'O30' || cur === 'O30H' || cur === 'O29t') FLAG.noTest = label === 'Later testen';
      if (cur === 'O36') FLAG.noContacts = label === 'Later';
      if (cur === 'O36b' && t.classList.contains('round')) { const v = (curEl.querySelector('.field input') || {}).value; CONTACT = v && v.trim() ? v.trim() : null; }
      if (cur === 'O28' || cur === 'O28k') FLAG.noNotif = label === 'Later aanzetten' ? (cur === 'O28k' ? 'k' : 'u') : null;
      // na het testalarm: alleen de vraag of je het hoorde (de rest weet het systeem zelf). Niets gehoord: de tips voor telefoon en Ember
      if (cur === 'O29' || cur === 'O29H') FIX = label === 'Niets gehoord' ? ['telefoon', 'ember'] : [];
      if (t.classList.contains('pill') && t.classList.contains('red')) { call('Je belt 112', () => go(to)); return; }
      go(to); return;
    }
    if (t.classList.contains('chip')) {
      t.parentElement.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === t));
      // Wat zag je? na een alarm: één tik is het antwoord, daarna verdwijnt de vraag van Home
      if (cur === 'H5c') { later(() => cur === 'H5c' && show('H5d', 'swap'), 450); return; }
      const p = SPOT[t.textContent.trim()]; if (p) curEl.querySelectorAll('.foto .hot').forEach(s => { s.style.left = p[0] + '%'; s.style.top = p[1] + '%'; });
      // Hoe heet je voertuig?: een suggestie vult de naam in
      if (cur === 'O10' || cur === 'V10') { const inp = curEl.querySelector('.field input'); if (inp) inp.value = t.textContent.trim(); }
      // de plek van het laden: in de gang of binnen komt de waarschuwing over je vluchtroute erbij
      const pl = t.textContent.trim(), risk = pl === 'Gang' || pl === 'Binnen';
      if ((cur === 'O05' && risk) || (cur === 'O05b' && !risk && ['Schuur', 'Garage', 'Berging'].includes(pl))) {
        show(cur === 'O05' ? 'O05b' : 'O05', 'swap');
        curEl.querySelectorAll('.chip').forEach(c => { if (['Schuur', 'Garage', 'Gang', 'Binnen', 'Berging'].includes(c.textContent.trim())) c.classList.toggle('on', c.textContent.trim() === pl); });
      }
      return;
    }
    const radio = t.querySelector && t.querySelector('.radio');
    if (radio && t.classList.contains('row')) {
      t.parentElement.querySelectorAll('.row').forEach(r => r.classList.toggle('on', r === t));
      if (cur === 'O07' || cur === 'V07') PLEK = t.querySelector('.grow .t16').textContent.trim();
      return;
    }
    const sw = t.classList.contains('switch') ? t : t.querySelector && t.querySelector('.switch');
    if (sw) { sw.classList.toggle('off'); if (cur === 'O29' || cur === 'O29H') { const off = !!curEl.querySelector('.switch.off'); const r = curEl.querySelector('.foot .round'); if (r && off) r.dataset.go = cur === 'O29' ? 'O30' : 'O30H'; } return; }
  });
  phone.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input:not([inputmode="numeric"])')) { const b = curEl.querySelector('.foot .round, .foot .pill'); if (b) b.click(); }
  });

  function chartTab(tab) {
    const ch = tab.closest('.chart'); const tabs = [...ch.querySelectorAll('.tab')]; tabs.forEach(t => t.classList.toggle('on', t === tab));
    const k = tabs.indexOf(tab); const bars = ch.querySelector('.bars'); const xl = ch.querySelector('.xl'); const sub = ch.querySelector('.tb .t12');
    if (!ch._dag) ch._dag = { bars: [...bars.querySelectorAll('i')].map(i => i.outerHTML).join(''), xl: xl.innerHTML, sub: sub.textContent };
    bars.querySelectorAll('i').forEach(i => i.remove());
    chartArrs(ch);
    if (k === 0) { bars.insertAdjacentHTML('beforeend', ch._dag.bars); xl.innerHTML = ch._dag.xl; sub.textContent = ch._dag.sub; return; }
    const n = k === 1 ? 7 : 30, col = getComputedStyle(ch.querySelector('.gl') || ch).getPropertyValue('--ok-t') || '#82b98e';
    const last = ch._dag.bars.match(/background: ([^;]+);/g); const lc = last ? last[last.length - 1].replace('background: ', '').replace(';', '') : '#82b98e';
    let h = ''; for (let i = 0; i < n; i++) { const v = 60 + Math.round(18 * Math.sin(i * 1.7) + 10 * Math.cos(i * .6)); h += `<i style="--i: ${i}; height: ${v}px; background: ${i === n - 1 ? lc : '#c2c5cb'}; opacity: ${i === n - 1 ? 1 : .2}"></i>`; }
    bars.insertAdjacentHTML('beforeend', h);
    xl.innerHTML = k === 1 ? ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', '<span style="color: #f5f5f7">Zo</span>'].map(d => d.startsWith('<') ? d : `<span>${d}</span>`).join('') : '<span>1</span><span>8</span><span>15</span><span>22</span><span style="color: #f5f5f7">30</span>';
    sub.textContent = k === 1 ? 'deze week · binnen je patroon' : 'oktober · binnen je patroon';
  }
  // de pijlen: links kan niet verder dan Dag, rechts niet verder dan Maand
  function chartArrs(ch) { const tabs = [...ch.querySelectorAll('.tab')], k = tabs.findIndex(x => x.classList.contains('on')), a = ch.querySelectorAll('.arrs > span'); if (a.length === 2) { a[0].classList.toggle('off', k <= 0); a[1].classList.toggle('off', k >= tabs.length - 1); } }
  function toast(msg) { phone.querySelectorAll('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; phone.appendChild(t); setTimeout(() => t.remove(), 2400); }
  function call(who, then) {
    const o = document.createElement('div'); o.className = 'call'; o.setAttribute('role', 'dialog');
    o.innerHTML = `<span class="ring"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8z" fill="#fff"></path></svg></span><span class="t20">${who}</span><span class="t12 c2">In het prototype bel je niet echt.</span>`;
    phone.appendChild(o); setTimeout(() => { o.remove(); if (then) then(); }, 1800);
  }

  /* ---------------------------------------------------------------- testpaneel */
  function openTest() {
    if (phone.querySelector('.sheet')) return;
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    const sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-label', 'Testpaneel');
    const row = r => `<a class="row" data-t="${r[0]}"><span class="t12 c3 code">${r[0]}</span><span class="grow"><span class="t16">${r[1]}</span>${r[2] ? `<span class="t12 c3">${r[2]}</span>` : ''}</span></a>`;
    const sim = r => `<a class="row" data-sim="${r[0]}"><span class="grow"><span class="t16">${r[1]}</span><span class="t12 c3">${r[2]}</span></span><span class="switch ${SIM[r[0]] ? '' : 'off'}"></span></a>`;
    const sect = (h, b) => `<section class="sect"><h2 class="t16 m" style="margin: 0">${h}</h2>${b}</section>`;
    sh.innerHTML = `<span class="grab"></span><div class="tb"><h1 class="t24" style="margin: 0">Testpaneel</h1><p class="t16 c2" style="margin: 0">Voor de testleider. Start een scenario, zet een foutpad aan, of spring naar een scherm.</p></div>` +
      SCEN.map(([h, rs]) => sect(h, `<div class="group">${rs.map(row).join('')}</div>`)).join('') +
      sect('Foutpaden', `<div class="group">${SIMROWS.map(sim).join('')}</div>`) +
      sect('Alle schermen', ROWS.map(([h, ids]) => `<details><summary class="t16" style="padding: 8px 0; cursor: pointer">${h}</summary><div class="group">${ids.filter(i => SCR[i]).map(i => row([i, SCR[i].n.replace(/^[A-Za-z0-9]+ · /, ''), ''])).join('')}</div></details>`).join(''));
    phone.append(bg, sh);
    const close = () => { bg.remove(); sh.remove(); };
    bg.addEventListener('click', close);
    sh.addEventListener('click', e => {
      const s = e.target.closest('[data-sim]'); if (s) { const k = s.dataset.sim; SIM[k] = !SIM[k]; s.querySelector('.switch').classList.toggle('off', !SIM[k]); return; }
      const r = e.target.closest('[data-t]'); if (r) { close(); go(r.dataset.t, { reset: true }); }
    });
  }
  if (/[?&]test=1/.test(location.search)) { const b = document.createElement('button'); b.className = 'testbtn'; b.textContent = 'Test'; b.addEventListener('click', e => { e.stopPropagation(); openTest(); }); phone.appendChild(b); }
  document.addEventListener('keydown', e => { if ((e.key === 't' || e.key === 'T') && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) openTest(); if (e.key === 'Escape') { const s = phone.querySelector('.sheet'); if (s) { s.remove(); phone.querySelector('.sheet-bg').remove(); } } });
  let lp = null, lpn = null, lpAt = 0;
  phone.addEventListener('pointerdown', e => { if (cur === 'N00' && e.target.closest('.notif')) lpn = setTimeout(() => { lpAt = Date.now(); show('N00a', 'swap'); }, 550); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => phone.addEventListener(n, () => clearTimeout(lpn)));
  // de klik die bij het loslaten van lang drukken hoort, opent niets
  phone.addEventListener('click', e => { if (Date.now() - lpAt < 450) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  phone.addEventListener('pointerdown', e => { const r = phone.getBoundingClientRect(); if (e.clientY - r.top < 44) lp = setTimeout(openTest, 700); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => phone.addEventListener(n, () => clearTimeout(lp)));

  /* ---------------------------------------------------------------- de telefoon op een groot scherm passend maken */
  function fit() {
    if (matchMedia('(max-width: 500px), (pointer: coarse) and (max-height: 1000px)').matches) { phone.style.transform = ''; return; }
    const k = Math.min(1, (innerHeight - 48) / 864, (innerWidth - 48) / 410);
    phone.style.transform = k < 1 ? `scale(${k.toFixed(3)})` : '';
  }
  addEventListener('resize', fit); fit();
  document.addEventListener('visibilitychange', () => { swarms.forEach(s => document.hidden ? s.stop() : s.start()); });

  addEventListener('hashchange', () => { const id = decodeURIComponent(location.hash.slice(1)); if (SCR[id] && id !== cur) go(id, { reset: true }); });
  const start = decodeURIComponent((location.hash || '').slice(1));
  show(SCR[start] ? start : 'A1', 'fwd');
})();
