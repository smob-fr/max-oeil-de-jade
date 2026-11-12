// Mondes 4 et 5 : un robot traverse chaque passage sur plateforme mobile (nuage voyageur, ballon,
// cerf-volant, wagonnet, pale de moulin, dent d'engrenage), du nuage de départ au nuage d'arrivée.
"use strict";
module.exports = [
  {
    nom: "Tous les passages sur plateformes mobiles des mondes 4 et 5 sont franchissables",
    async run(page) {
      const r = await page.evaluate(() => {
        const t = __temple, T = 16, rates = [];
        const essais = [];
        t.LEVELS.forEach((d, i) => { if (d.monde !== 4 && d.monde !== 5) return; (d.movers || []).forEach((_, k) => essais.push([i, "m", k])); (d.moulins || []).forEach((_, k) => essais.push([i, "w", k])); });
        for (const [i, typ, k] of essais) {
          t.progress.tester = true; t.playFrom(i); t.game.mode = "play"; t.game.cardT = 99;
          for (let q = 0; q < 95; q++) t.mesurePerf(1);
          const R = t.room, P = R.player, d = R.def;
          // A = dernière case où l'on tient avant le passage, B = première après
          const surf = (x) => { for (let y = 1; y < R.tiles.length - 1; y++) if (R.tiles[y][x] === "." && "~%#".includes(R.tiles[y + 1][x])) return y; return null; };
          let ax, bx;
          if (typ === "m") { const [mx, , mw, dx] = d.movers[k]; ax = mx - 1; bx = mx + mw + Math.max(0, dx); }
          else { const [cx, , r] = d.moulins[k]; ax = cx - r - 2; bx = cx + r + 1; }
          while (ax > 0 && surf(ax) === null) ax--;
          while (bx < R.tiles[0].length - 1 && surf(bx) === null) bx++;
          const ay = surf(ax), by = surf(bx);
          // on ne teste que le trajet : pièges, ennemis, éclairs, souffleurs et grêle désactivés
          R.def.triggers.forEach((_, j) => R.fired.add(j)); R.enemies.forEach((e) => (e.alive = false)); R.foudres = []; R.souffleurs = []; R.grele = [];
          P.x = ax * T + 3; P.y = (ay + 1) * T - P.h; P.vy = 0; P.invuln = 1e9;
          let ok = false;
          for (let f = 0; f < 1500; f++) {
            const inp = t.input; inp.left = inp.right = inp.jump = false;
            const cx = P.x + P.w / 2;
            if (P.onMover) {
              // sur la plateforme : sauter vers B quand il est à portée, sinon rester au milieu
              const dxB = bx * T - (P.x + P.w);
              if (dxB < 44 && P.y + P.h <= (by + 1) * T + 6) { inp.right = true; if (dxB > 2) { inp.jump = true; t.pressed.jump = P.grounded; } }
              else if (P.onMover.circ || P.onMover.dx) { const mid = P.onMover.x + P.onMover.w / 2; if (cx < mid - 3) inp.right = true; if (cx > mid + 3) inp.left = true; }
            } else if (P.grounded && Math.floor(cx / T) <= ax + 1) {
              // sur A : attendre que la plateforme arrive, puis monter dessus (en marchant si elle est à niveau)
              for (const m of R.movers) {
                const gap = m.x - (P.x + P.w), dy = m.y - (P.y + P.h);
                if (gap > -4 && gap < 34 && dy > -22 && dy < 10 && Math.abs(m.my) < 1.2 && (m.mx <= 0.05 || gap < 6)) {
                  inp.right = true;
                  if (!(m.dx && !m.dy && Math.abs(dy) < 3)) { inp.jump = true; t.pressed.jump = true; } else if (gap > 3) inp.right = false;
                  break;
                }
              }
              if (P.x + P.w < (ax + 1) * T - 2 && !inp.jump) inp.right = true;
            } else if (!P.grounded) { inp.right = true; inp.jump = true; }
            else inp.right = true;
            t.mesurePerf(1);
            if (t.game.mode === "dead" || !P.alive || P.y > R.tiles.length * T) break;
            if (P.grounded && !P.onMover && Math.floor((P.x + P.w / 2) / T) >= bx) { ok = true; break; }
          }
          if (!ok) rates.push(`${d.name} (${typ === "m" ? "plateforme" : "moulin"} ${k})`);
        }
        Object.assign(t.input, { left: false, right: false, jump: false });
        return { n: essais.length, rates };
      });
      return { ok: r.n > 0 && !r.rates.length, detail: `${r.n - r.rates.length}/${r.n} passages franchis` + (r.rates.length ? " — échecs : " + r.rates.join(", ") : "") };
    },
  },
];
