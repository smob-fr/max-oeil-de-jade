// Un robot bat chacun des 5 boss : il faut que la porte de sortie apparaisse.
// Les robots trichent un peu sur les déplacements (Max est parfois replacé directement),
// mais le combat lui-même suit les vraies règles : coups, ombres, timing.
"use strict";

// Lance le niveau du boss `kind`, fait jouer `robot(t, R, f)` à chaque image, renvoie le résultat.
function combat(page, kind, robot, max = 9000) {
  return page.evaluate(([kind, robotSrc, max]) => {
    const t = __temple, T = 16;
    const robot = new Function("t", "R", "f", "T", "etat", robotSrc);
    const i = t.LEVELS.findIndex((d) => d.boss === kind);
    t.progress.tester = true; t.playFrom(i); t.game.mode = "play"; t.game.cardT = 99;
    const etat = {}, coups = [];
    let morts = 0, msg = "", f;
    for (f = 0; f < max; f++) {
      if (t.game.mode === "dead") { morts++; msg = t.room.say ? t.room.say.text : ""; while (t.game.mode === "dead") t.mesurePerf(1); continue; }
      const R = t.room;
      if (!R.door.hidden) break;
      Object.assign(t.input, { left: false, right: false, jump: false, fire: false });
      robot(t, R, f, T, etat);
      const h = R.boss.hits;
      t.mesurePerf(1);
      if (t.room.boss && t.room.boss.hits > h) coups.push(f);
    }
    return { porte: !t.room.door.hidden, images: f, coups, morts, msg };
  }, [kind, robot.toString().replace(/^[^{]*{|}$/g, ""), max]);
}
const verdict = (r, mortsMax = 0) => ({
  ok: r.porte && r.morts <= mortsMax,
  detail: `${r.porte ? "porte ouverte" : "porte FERMÉE"} en ${r.images} images, coups ${r.coups.join("/") || "aucun"}, ${r.morts} mort(s)${r.morts ? " (« " + r.msg + " »)" : ""}`,
});

module.exports = [
  {
    nom: "Boss 1 — le Jaguar de pierre",
    async run(page) {
      return verdict(await combat(page, "jaguar", function (t, R, f, T, etat) {
        const P = R.player, B = R.boss;
        // quand il est sonné : sauter sur son dos ; quand il gratte et charge : rester perché au-dessus
        if (B.etat === "sonne" && !B.touche) { if (!etat.place) { P.x = B.x + B.w / 2 - 5; P.y = B.y - 40; P.vy = 0; P.vine = null; etat.place = true; } }
        else etat.place = false;
        if (B.etat === "gratte" || B.etat === "charge") { P.invuln = 0; P.x = 11 * T - 5; P.y = 9 * T; P.vy = 0; P.vine = null; }
        R.rocks.forEach((r) => (r.done = true));
      }, 4000));
    },
  },
  {
    nom: "Boss 2 — le Yéti grognon",
    async run(page) {
      return verdict(await combat(page, "yeti", function (t, R, f, T) {
        const P = R.player, B = R.boss;
        // se placer de l'autre côté de la prochaine grosse stalactite, sauter quand il retombe
        const gl = R.glacons.find((g) => g.etat === "pend");
        if (gl && B.etat !== "dort") {
          const gx = gl.x + gl.w / 2, cible = gx + (B.x + B.w / 2 > gx ? -1 : 1) * 52, cx = P.x + P.w / 2;
          if (Math.abs(cx - cible) > 4 && B.etat !== "saute" && B.etat !== "prepare") t.input[cx < cible ? "right" : "left"] = true;
          if (B.etat === "saute" && B.vy > 1.5 && P.grounded) { t.pressed.jump = true; t.input.jump = true; }
          if (!P.grounded && P.vy < 0) t.input.jump = true;
        }
        R.rocks.forEach((r) => (r.done = true)); R.boules.length = 0;
      }));
    },
  },
  {
    nom: "Boss 3 — la pieuvre géante",
    async run(page) {
      return verdict(await combat(page, "pieuvre", function (t, R, f, T) {
        const P = R.player, B = R.boss, tt = B.tent, px = P.x + P.w / 2, inp = t.input;
        // s'écarter de l'ombre ; quand la tentacule est coincée, couper l'algue du coquillage au-dessus
        if (tt && tt.etat === "vise") {
          const dx = px - tt.x;
          if (Math.abs(dx) < 34) { if ((dx < 0 && tt.x > 4 * T) || tt.x > B.x - 4 * T) inp.left = true; else inp.right = true; }
        } else if (tt && tt.etat === "coince") {
          const c = B.coq.find((c) => c.etat === "pend" && Math.abs(c.x + 10 - tt.x) < 20);
          if (c) {
            const cx = c.x + 10 + (px < c.x + 10 ? -12 : 12);
            if (px < cx - 3) inp.right = true; else if (px > cx + 3) inp.left = true;
            if (P.y > c.y - 30) inp.jump = R.t % 12 === 0;
            if (Math.abs(px - cx) < 6 && P.y < c.y - 10) { P.face = px < c.x + 10 ? 1 : -1; inp.fire = R.t % 20 === 0; }
          }
        } else {
          const dispo = B.coq.filter((c) => c.etat === "pend");
          if (dispo.length) { const c = dispo.reduce((a, c) => (Math.abs(c.x + 10 - px) < Math.abs(a.x + 10 - px) ? c : a)); if (px < c.x + 8) inp.right = true; else if (px > c.x + 12) inp.left = true; }
        }
        // remonter respirer
        if (R.o2 < 0.35 || (P.y > 3 * T && R.o2 < 0.6 && !(tt && tt.etat === "coince"))) inp.jump = R.t % 10 === 0;
        if (inp.jump) t.pressed.jump = true;
        if (inp.fire) t.pressed.fire = true;
      }));
    },
  },
  {
    nom: "Boss 4 — l'Oiseau-tonnerre",
    async run(page) {
      return verdict(await combat(page, "oiseau", function (t, R, f, T, etat) {
        const P = R.player, B = R.boss;
        etat.pos = etat.pos || 0; etat.att = etat.att || 0;
        // attendre à côté d'une cloche, s'écarter si l'ombre d'un éclair vise Max, sonner quand l'oiseau passe
        const c = B.cloches[B.hits % 3], gx = c.x + 6;
        const danger = R.foudres.find((q) => (q.warn || q.on) && Math.abs(q.x * T + 8 - (P.x + P.w / 2)) < 14);
        if (danger && etat.att <= 0) { etat.pos = etat.pos ? 0 : 1; etat.att = 60; }
        if (etat.att > 0) etat.att--;
        const tx = etat.pos ? gx + 10 : gx - 18;
        if (Math.abs(P.x - tx) > 2 && P.grounded) P.x += Math.sign(tx - P.x) * Math.min(1.8, Math.abs(tx - P.x));
        if (f === 0 || P.y > c.y + 2 * T || etat.cloche !== B.hits) { P.x = tx; P.y = c.y + T - P.h - 0.5; P.vy = 0; etat.cloche = B.hits; }
        P.face = etat.pos ? -1 : 1;
        if (B.etat === "vole" && !danger && Math.hypot(B.x + B.w / 2 - gx, B.y + B.h / 2 - (c.y + 6)) < 50) t.pressed.fire = true;
      }));
    },
  },
  {
    nom: "Boss 5 — le Fouisseur d'Archibald, puis l'Œil de Jade",
    async run(page) {
      return verdict(await combat(page, "fouisseur", function (t, R, f, T) {
        const P = R.player, B = R.boss;
        if (B.etat === "cale") {
          // la machine s'effondre : attraper l'Œil de Jade (saut sous lui)
          const o = B.oeil;
          if (o && !o.pris && o.t > 70) { const dx = o.x - (P.x + P.w / 2); if (Math.abs(dx) > 3) t.input[dx > 0 ? "right" : "left"] = true; else if (P.grounded) { t.input.jump = true; t.pressed.jump = true; } }
          else if (P.y < 12 * T) { P.x = 25 * T; P.y = 14 * T + 1; P.vy = 0; }
          return;
        }
        // de la dynamite dans la première cheminée encore ouverte, en dehors de la fumée et du feu
        const c = B.chem.find((q) => !q.bouchee);
        const rocher = R.grelons.find((q) => Math.abs(q.x + 3 - (P.x + P.w / 2)) < 14);
        if (t.game.ammo.tnt <= 0 && !R.dynamites.some((d) => !d.dans)) {
          const it = R.pickups.find((q) => q.kind === "tnt" && !q.taken);
          if (it) { P.x = it.x - 1; P.y = 14 * T + 1; P.vy = 0; } else if (P.y < 12 * T) { P.x = 15 * T; P.y = 14 * T + 1; P.vy = 0; }
        } else if (c && B.etat === "combat") {
          const surC = Math.abs(P.x + P.w / 2 - (c.x + 8)) < 6 && P.y + P.h <= c.y + 1;
          if (!c.warn && !c.feu && !R.dynamites.some((d) => !d.dans) && !rocher) {
            if (!surC) { P.x = c.x + 3; P.y = c.y - P.h - 0.5; P.vy = 0; } else t.pressed.tnt = true;
          } else if (P.y + P.h <= c.y + 1 || rocher) {
            // à l'abri sur le toit, entre deux cheminées
            P.x = rocher ? P.x + (rocher.x > P.x ? -20 : 20) : c.x + (3 * T * (c === B.chem[2] ? -1 : 1)) / 2 + 2; P.y = 9 * T - P.h - 0.5; P.vy = 0;
          }
        }
      }, 6000));
    },
  },
];
