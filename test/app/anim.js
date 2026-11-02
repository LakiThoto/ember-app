/* Ember · prototype V12 · animaties van de site (ember-site v54, 14 okt 2026), vertaald naar de app.

   EmberAnim.mount(el) leest data-anim op een element en start de bijbehorende animatie:
   - closeup  De close-up van Ember met de twaalf lichtjes (site: "Knop en lichtring", v51).
              data-mode: fill (lopen vol van boven, langs beide kanten tegelijk naar onder; bewust geen klokrichting),
              blink (alarm), pulse (oververhit), on (rustig aan), off (uit). data-color: white, ok, warn, danger.
   - magnet   De magneetklik als videokaart (site: "Magnetische bevestiging", v46 en v51): Ember verschijnt los van de buis,
              de magneet trekt hem aan, hij klikt vast, de lichtjes gaan aan en er springen stippen af. Daarna los, en opnieuw.
   - sticker  De sticker komt langs de normaal aan, een derde groter, en landt op de buis (site: fietsverhaal, v51).
   - line     Ember links, een meetlijn met lopende stippen naar de zwerm (site: de lijn van Ember naar de app, v46 en v47).

   Elke animatie geeft { set(opties), destroy() } terug. Met prefers-reduced-motion staat alles stil in de eindtoestand. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var seg = function (t, a, b) { return clamp((t - a) / (b - a), 0, 1); };
  var mix = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { return t * t * (3 - 2 * t); };
  var inQuad = function (t) { return t * t; };
  var inOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var outCubic = function (t) { return 1 - Math.pow(1 - t, 3); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // De lichtjes op de hardware: als led's iets warmer en lichter dan de schermkleuren (site RCOL)
  var LED = { white: [255, 248, 236], ok: [120, 200, 140], warn: [247, 176, 82], danger: [240, 96, 84] };
  // De meetlijn: stippen en de lopende puls (site LN), plus wit voor "verbonden, nog niet gemeten"
  var LINE = { white: ['235,236,240', '255,255,255'], ok: ['150,197,160', '214,235,219'], warn: ['232,162,58', '255,214,160'], danger: ['226,77,66', '255,180,169'] };

  var IMG = {};
  function img(name) {
    if (!IMG[name]) { var im = new Image(); im.decoding = 'async'; im.src = 'assets/' + name; IMG[name] = im; }
    return IMG[name];
  }
  function ok(im) { return im.complete && im.naturalWidth > 0; }

  function stage(host, cls) {
    var c = document.createElement('canvas'); c.className = cls; c.setAttribute('aria-hidden', 'true'); host.appendChild(c);
    var s = { c: c, ctx: c.getContext('2d'), w: 0, h: 0, d: 1 };
    s.size = function () {
      var r = host.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      var W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d));
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }   // alleen bij een echte maatwissel: anders wordt het canvas leeg (site v51)
      s.w = r.width; s.h = r.height; s.d = d;
    };
    s.clear = function () { s.ctx.setTransform(1, 0, 0, 1, 0, 0); s.ctx.clearRect(0, 0, c.width, c.height); };
    return s;
  }
  // De tijd is de echte klok sinds de start: elk getekend beeld toont het juiste moment, ook als er frames wegvallen
  // (een telefoon die de pagina even pauzeert, of een scherm dat later in beeld komt).
  function run(draw) {
    var alive = true, start = performance.now(), last = start, raf = 0;
    function f(now) {
      if (!alive) return;
      var dt = Math.min(.05, Math.max(0, now - last) / 1000); last = now;
      draw(Math.max(0, now - start) / 1000, dt);
      raf = requestAnimationFrame(f);
    }
    raf = requestAnimationFrame(f);
    return { stop: function () { alive = false; cancelAnimationFrame(raf); } };
  }
  function glowDot(ctx, x, y, r, col, a, core) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4.6);
    g.addColorStop(0, 'rgba(' + col + ',' + (0.5 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4.6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(' + (core || col) + ',' + Math.min(1, a * 1.1).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(x, y, r * 1.02, 0, TAU); ctx.fill();
  }

  /* ---------------------------------------------------------------- closeup: Ember en zijn twaalf lichtjes */
  // ember-ring.webp: 2400 x 3840, 40 px per mm; de ring van lichtjes rond de knop (ring.json van de site)
  var RG = { w: 2400, h: 3840, ppm: 40, ring: [1200, 1344], dot: 40, lights: [[1200, 920], [1412, 976.8], [1567.2, 1132], [1624, 1344], [1567.2, 1556], [1412, 1711.2], [1200, 1768], [988, 1711.2], [832.8, 1556], [776, 1344], [832.8, 1132], [988, 976.8]] };
  // ember-hero.webp: heel Ember van voren (1350 x 2700, 22,5 px per mm; Ember zelf van (280, 168) tot (1070, 2532)).
  // Dezelfde twaalf lichtjes als op de close-up, omgerekend naar dit beeld.
  var FULL = { w: 1350, h: 2700, ppm: 22.5, ring: [675, 846], box: [280, 168, 1070, 2532] };
  FULL.dot = RG.dot * FULL.ppm / RG.ppm;
  FULL.lights = RG.lights.map(function (p) { return [FULL.ring[0] + (p[0] - RG.ring[0]) * FULL.ppm / RG.ppm, FULL.ring[1] + (p[1] - RG.ring[1]) * FULL.ppm / RG.ppm]; });
  function closeup(host, o) {
    var mode = o.mode || 'fill', col = LED[o.color] || LED.ok, F = o.full ? FULL : RG;
    var pic = document.createElement('img'); pic.src = img(o.full ? 'ember-hero.webp' : 'ember-ring.webp').src; pic.alt = ''; pic.className = 'ea-ember'; pic.setAttribute('aria-hidden', 'true');
    host.appendChild(pic);
    var S = stage(host, 'ea-canvas'), k = 1, ox = 0, oy = 0;
    function layout() {
      S.size();
      if (o.full) {                                                // heel Ember: zo hoog als past, in het midden
        var bh = F.box[3] - F.box[1], bw = F.box[2] - F.box[0];
        k = Math.min(S.h * .92 / bh, S.w * .6 / bw);
        ox = S.w / 2 - (F.box[0] + bw / 2) * k; oy = S.h / 2 - (F.box[1] + bh / 2) * k;
      } else {
        var wide = o.width || Math.min(S.w * .36, 124);            // Ember is 35 mm breed
        k = wide / (35 * RG.ppm);
        ox = S.w / 2 - RG.ring[0] * k; oy = (o.cy || .5) * S.h - RG.ring[1] * k;
      }
      pic.style.width = (F.w * k).toFixed(1) + 'px'; pic.style.height = (F.h * k).toFixed(1) + 'px';
      pic.style.left = ox.toFixed(1) + 'px'; pic.style.top = oy.toFixed(1) + 'px';
      pic.style.opacity = mode === 'off' ? .72 : 1;
    }
    var ro = new ResizeObserver(layout); ro.observe(host); layout();
    function level(j, t) {
      if (mode === 'off') return 0;
      if (reduce || mode === 'on') return .9;
      if (mode === 'fill') {
        var tt = t % 3.6, s = Math.min(j, 12 - j), t0 = .2 + s * .17;
        return smooth(seg(tt, t0, t0 + .16)) * (1 - smooth(seg(tt, 2.9, 3.3)));
      }
      if (mode === 'blink') return (t % .7) < .4 ? 1 : 0;
      if (mode === 'pulse') return .45 + .55 * (.5 + .5 * Math.sin(t * TAU * .9));
      return 0;
    }
    function head(j, t) {                                          // het lichtje dat nu aangaat, iets feller (site v51)
      if (reduce || mode !== 'fill') return 0;
      var tt = t % 3.6, t0 = .2 + Math.min(j, 12 - j) * .17;
      return Math.exp(-Math.pow((tt - t0 - .1) / .1, 2));
    }
    var L = run(function (t) {
      S.clear(); var ctx = S.ctx;
      ctx.setTransform(S.d * k, 0, 0, S.d * k, S.d * ox, S.d * oy);
      for (var j = 0; j < 12; j++) {
        var on = level(j, t); if (on < .01) continue;
        var h = head(j, t), p = F.lights[j], c = col.join(','), core = col.map(function (v) { return Math.round(mix(v, 255, .35 * h)); }).join(',');
        glowDot(ctx, p[0], p[1], F.dot, c, on * (.75 + .25 * h), core);
      }
    });
    return {
      set: function (n) { if (n.mode) { mode = n.mode; pic.style.opacity = mode === 'off' ? .72 : 1; } if (n.color) col = LED[n.color] || col; },
      destroy: function () { L.stop(); ro.disconnect(); }
    };
  }

  /* ---------------------------------------------------------------- magnet: de klik op de sticker, als videokaart */
  // magnet-bg0.webp (de buis), magnet-sticker.webp (de sticker) en magnet-frames.webp (14 beelden van Ember, 7 x 2)
  // liggen in hetzelfde beeldvlak van 1100 x 1375 (magnet.json van de site)
  var MG = { frames: 14, cols: 7, crop: [290, 382, 438, 622], so: { crop: [480, 442, 202, 490], centre: [579.2, 686.5], n20: [-56.6, 2.0] }, lights: [[556.0, 541.2], [573.6, 551.7], [584.8, 572.3], [586.4, 597.2], [578.0, 619.8], [562.1, 633.9], [542.8, 635.7], [525.5, 624.9], [514.6, 604.5], [513.0, 579.9], [521.1, 557.6], [536.8, 543.4]], ember: [535.8, 688.0], half: [62, 236], mm: 4.51, dot: 4.5, view: [600, 690, 820] };
  function clip(host, o, kind) {
    var bg = img('magnet-bg0.webp'), sheet = img('magnet-frames.webp'), sticker = img('magnet-sticker.webp');
    var S = stage(host, 'ea-canvas'), k = 1, ox = 0, oy = 0, dots = [], prev = 0;
    // seconden: Ember verschijnt, wacht, wordt aangetrokken, zit vast, gaat los
    var P = { appear: .5, wait: 1.1, pull: 1.85, hold: 4.1, lift: 4.9, gone: 5.3 }, PER = 5.8;
    function layout() { S.size(); k = S.h / MG.view[2]; ox = S.w / 2 - MG.view[0] * k; oy = S.h / 2 - MG.view[1] * k; }
    var ro = new ResizeObserver(layout); ro.observe(host); layout();
    function frameAt(t) {
      var n = MG.frames - 1;
      if (reduce) return n;
      if (t < P.wait) return 0;
      if (t < P.pull) return n * inQuad(seg(t, P.wait, P.pull));     // steeds sneller, zoals een magneet
      if (t < P.hold) return n;
      return n * (1 - inOut(seg(t, P.hold, P.lift)));
    }
    function emberAt(t) { return reduce ? 1 : smooth(seg(t, 0, P.appear)) * (1 - smooth(seg(t, P.lift, P.gone))); }
    function stickerAt(t) {                                         // [hoe ver hij is (1: op de buis), hoeveel je ziet]
      if (kind !== 'sticker' || reduce) return [1, 1];
      var e = seg(t, .35, 1.25); return [smooth(e), smooth(seg(e, 0, .3))];
    }
    function spring(t) {
      dots = [];
      for (var q = 0; q < 34; q++) {
        var a = Math.random() * TAU, sp = (16 + Math.random() * 38) * MG.mm / 4;
        dots.push({ t0: t, life: .7 + Math.random() * .6, x: MG.ember[0] + Math.cos(a) * MG.half[0], y: MG.ember[1] + Math.sin(a) * MG.half[1], vx: Math.cos(a) * sp * 1.6, vy: Math.sin(a) * sp, r: (.8 + Math.random() * 1.1) * MG.mm / 5, c: Math.random() < .3 ? '#3f8a53' : '#86868b' });
      }
    }
    function drawSheet(ctx, fi, alpha) {                            // een beeld uit het vel, overgevloeid naar het volgende
      var cr = MG.crop, i0 = Math.floor(fi), fr = fi - i0, i1 = Math.min(MG.frames - 1, i0 + 1);
      var src = function (i) { return [(i % MG.cols) * cr[2], Math.floor(i / MG.cols) * cr[3]]; };
      var a = src(i0); ctx.globalAlpha = alpha; ctx.drawImage(sheet, a[0], a[1], cr[2], cr[3], cr[0], cr[1], cr[2], cr[3]);
      if (fr > .02 && i1 !== i0) { var b = src(i1); ctx.globalAlpha = alpha * fr; ctx.drawImage(sheet, b[0], b[1], cr[2], cr[3], cr[0], cr[1], cr[2], cr[3]); }
      ctx.globalAlpha = 1;
    }
    var L = run(function (t) {
      S.clear(); var ctx = S.ctx;
      ctx.setTransform(S.d * k, 0, 0, S.d * k, S.d * ox, S.d * oy);
      if (ok(bg)) ctx.drawImage(bg, 0, 0);
      if (kind === 'sticker') {
        var st = stickerAt(t);
        if (ok(sticker) && st[1] > .01) {
          var so = MG.so, ph = 1 - st[0], sk = 1 + .3 * ph;
          ctx.save(); ctx.globalAlpha = st[1];
          // een zachte schaduw die kleiner wordt naarmate hij landt, zodat de lichte sticker op de lichte buis te zien is
          ctx.shadowColor = 'rgba(20,22,26,' + (.18 + .22 * ph).toFixed(3) + ')'; ctx.shadowBlur = (10 + 30 * ph) * S.d * k * 3; ctx.shadowOffsetY = (4 + 16 * ph) * S.d * k;
          ctx.translate(so.centre[0] + so.n20[0] * 1.1 * ph, so.centre[1] + so.n20[1] * 1.1 * ph); ctx.scale(sk, sk); ctx.translate(-so.centre[0], -so.centre[1]);
          ctx.drawImage(sticker, so.crop[0], so.crop[1]); ctx.restore();
        }
        // het aandrukken: een rand rond de sticker die meeademt zolang je drukt
        if (!reduce && t > 1.4) {
          var pr = .5 + .5 * Math.sin((t - 1.4) * TAU * .8), so2 = MG.so;
          ctx.strokeStyle = 'rgba(35,37,43,' + (.16 + .18 * pr).toFixed(3) + ')'; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.ellipse(so2.centre[0] - 4, so2.centre[1], 116 + 8 * pr, 262 + 10 * pr, -.1, 0, TAU); ctx.stroke();
        }
        return;
      }
      var tt = reduce ? P.pull + 1 : t % PER;
      if (prev < P.pull && tt >= P.pull) spring(t);
      prev = tt;
      if (ok(sticker)) ctx.drawImage(sticker, MG.so.crop[0], MG.so.crop[1]);
      var f = frameAt(tt), eo = emberAt(tt), on = f >= MG.frames - 1.001;
      if (ok(sheet) && eo > .01) drawSheet(ctx, f, eo);
      // de lichtjes: een flits bij de klik, daarna zacht wit zolang hij vastzit, uit als hij losgaat
      var since = tt - P.pull, glow = reduce ? .6 : on && eo > .5 ? (since < 0 ? 0 : since < .25 ? since / .25 : mix(1, .55, smooth(seg(since, .25, 1.2)))) : 0;
      if (!reduce && tt > P.hold) glow = .55 * (1 - smooth(seg(tt, P.hold, P.hold + .3)));
      if (glow > .01) MG.lights.forEach(function (p) {
        var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], MG.dot * 4.2);
        g.addColorStop(0, 'rgba(255,250,240,' + (.55 * glow).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,250,240,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], MG.dot * 4.2, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,252,246,' + Math.min(1, glow * 1.2).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(p[0], p[1], MG.dot * .8, MG.dot, 0, 0, TAU); ctx.fill();
      });
      dots.forEach(function (d) {                                   // de klik: stippen springen van de rand af en vervagen
        var age = t - d.t0; if (age < 0 || age > d.life) return;
        var e = 1 - Math.exp(-age * 3.2), a = 1 - age / d.life;
        ctx.globalAlpha = a * a * .85; ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(d.x + d.vx * e, d.y + d.vy * e, d.r, 0, TAU); ctx.fill();
      });
      ctx.globalAlpha = 1;
    });
    return { set: function () {}, destroy: function () { L.stop(); ro.disconnect(); } };
  }

  /* ---------------------------------------------------------------- line: van Ember naar de zwerm */
  // ember-hero.webp: 1350 x 2700 (22,5 px per mm); de ring van lichtjes rond (675, 846) met straal 238,5
  var HR = { w: 1350, h: 2700, ring: [675, 846], r: 238.5 };
  function line(host, o) {
    var col = o.color || 'white', speed = +o.speed || 110, P = [], segs = [], LEN = 0, k = 1, t0 = 0;
    var pic = document.createElement('img'); pic.src = img('ember-hero.webp').src; pic.alt = ''; pic.className = 'ea-ember'; pic.setAttribute('aria-hidden', 'true');
    host.insertBefore(pic, host.firstChild);
    var S = stage(host, 'ea-canvas');
    function layout() {
      S.size();
      var hgt = Math.min(S.h * .82, 200); k = hgt / HR.h;
      var left = 0, top = (S.h - hgt) / 2 + S.h * .05;
      pic.style.height = hgt.toFixed(1) + 'px'; pic.style.width = (HR.w * k).toFixed(1) + 'px';
      pic.style.left = left + 'px'; pic.style.top = top.toFixed(1) + 'px';
      var sx = left + (HR.ring[0] + HR.r + 48) * k, sy = top + HR.ring[1] * k;      // net rechts van de lichtjes
      var R = Math.min(S.w, S.h) * .36, cx = S.w * (+o.cxf || .64), cy = S.h / 2;
      var ex = cx - R * 1.18, kx = sx + (ex - sx) * .5;
      P = [[sx, sy], [kx, sy], [kx, cy], [ex, cy]];                                    // vlak uit Ember, het knikje van de app, vlak de zwerm in
      segs = []; LEN = 0;
      for (var q = 1; q < P.length; q++) { var d = Math.hypot(P[q][0] - P[q - 1][0], P[q][1] - P[q - 1][1]); segs.push(d); LEN += d; }
    }
    var ro = new ResizeObserver(layout); ro.observe(host); layout();
    function at(s) {
      for (var q = 0; q < segs.length; q++) {
        if (s <= segs[q] || q === segs.length - 1) { var f = segs[q] ? clamp(s / segs[q], 0, 1) : 0; return [mix(P[q][0], P[q + 1][0], f), mix(P[q][1], P[q + 1][1], f)]; }
        s -= segs[q];
      }
      return P[P.length - 1];
    }
    var L = run(function (t, dt) {
      S.clear(); var ctx = S.ctx; ctx.setTransform(S.d, 0, 0, S.d, 0, 0);
      var C = LINE[col] || LINE.white, drawn = reduce ? LEN : LEN * outCubic(seg(t, .25, 1.15));
      for (var s = 0; s < drawn; s += 8) { var p = at(s); ctx.fillStyle = 'rgba(' + C[0] + ',.8)'; ctx.beginPath(); ctx.arc(p[0], p[1], 1.6, 0, TAU); ctx.fill(); }
      if (drawn >= LEN - 1 && !reduce) {
        t0 += Math.max(dt, 1 / 60) * speed;
        for (var m = 0; m < 3; m++) {
          var u = (t0 + m * LEN / 3) % LEN, q = at(u), sw = .7 + .3 * Math.sin(u / LEN * Math.PI);   // zwelt onderweg aan en af
          ctx.fillStyle = 'rgba(' + C[1] + ',.95)'; ctx.beginPath(); ctx.arc(q[0], q[1], 2.6 * sw, 0, TAU); ctx.fill();
        }
      }
    });
    return {
      set: function (n) { if (n.color) col = n.color; if (n.speed) speed = +n.speed; },
      destroy: function () { L.stop(); ro.disconnect(); }
    };
  }

  function mount(el) {
    var d = el.dataset, o = { mode: d.mode, color: d.color, speed: d.speed, cxf: d.cxf, full: d.full === '1' };
    switch (d.anim) {
      case 'closeup': return closeup(el, o);
      case 'magnet': return clip(el, o, 'magnet');
      case 'sticker': return clip(el, o, 'sticker');
      case 'line': return line(el, o);
    }
    return null;
  }
  // de renders vast laden, zodat ze er zijn als het scherm komt
  ['ember-ring.webp', 'ember-hero.webp', 'magnet-bg0.webp', 'magnet-frames.webp', 'magnet-sticker.webp'].forEach(img);
  window.EmberAnim = { mount: mount, LED: LED };
})();
