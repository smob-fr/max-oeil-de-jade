// Le saut sur écran tactile (téléphone simulé) et un passage connu pour être délicat : la salamandre.
"use strict";

// Prépare un niveau calme : boss figé, pas de projectiles, Max invulnérable.
async function niveauCalme(page, nom) {
  await page.evaluate((nom) => { const t = __temple; t.progress.tester = true; t.playFrom(t.LEVELS.findIndex((d) => d.name === nom)); t.game.cardT = 79; }, nom);
  await page.waitForTimeout(2500);
}

module.exports = [
  {
    nom: "Un appui tactile, même très bref, donne toujours un vrai saut",
    mobile: true,
    async run(page, contexte) {
      await niveauCalme(page, "Le Fouisseur d'Archibald");
      const box = await page.locator('[data-btn="jump"]').boundingBox();
      const cdp = await contexte.newCDPSession(page);
      const res = [];
      for (const duree of [0, 10, 20, 30, 40, 60, 80, 150]) {
        await page.waitForTimeout(600);
        await page.evaluate(() => {
          const R = __temple.room; R.boss.etat = "attend"; R.boss.k = 1e9; R.grelons = []; R.player.invuln = 1e9;
          const P = R.player; window.__y0 = P.y; window.__min = P.y; window.__fin = false;
          (function suivre() { window.__min = Math.min(window.__min, __temple.room.player.y); if (!window.__fin) requestAnimationFrame(suivre); })();
        });
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await page.waitForTimeout(duree);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(700);
        res.push([duree, await page.evaluate(() => { window.__fin = true; return Math.round(window.__y0 - window.__min); })]);
      }
      // un saut complet fait environ 36 px ; un appui bref doit donner au moins 28 px (avant la correction : 9 à 22 px)
      const rates = res.filter(([, h]) => h < 28);
      return { ok: !rates.length, detail: res.map(([d, h]) => `${d} ms → ${h} px`).join(", ") };
    },
  },
  {
    nom: "SAUT reste fiable avec un doigt sur la flèche et des relâchements perdus",
    mobile: true,
    async run(page) {
      await niveauCalme(page, "Le seuil");
      const r = await page.evaluate(async () => {
        const t = __temple, el = document.querySelector('[data-btn="jump"]'), pad = document.querySelector(".pad.gauche");
        const R = t.room, P = R.player; P.invuln = 1e9;
        // un doigt reste sur ▶ (événements de pointeur, comme la croix de direction)
        const rp = pad.getBoundingClientRect();
        pad.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 50, clientX: rp.right - 20, clientY: rp.top + 30, bubbles: true, pointerType: "touch" }));
        const images = (n) => new Promise((ok) => { let k = 0; (function w() { if (++k >= n) ok(); else requestAnimationFrame(w); })(); });
        const res = [];
        for (let k = 0; k < 12; k++) {
          await images(30);
          while (!P.grounded) await images(2);
          const doigt = new Touch({ identifier: 100 + k, target: el, clientX: 700, clientY: 300 });
          el.dispatchEvent(new TouchEvent("touchstart", { touches: [doigt], changedTouches: [doigt], bubbles: true, cancelable: true }));
          await images(3);
          res.push(P.vy < -1);
          // un relâchement sur deux n'arrive jamais : l'appui suivant doit quand même compter
          if (k % 2 === 0) window.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [doigt], bubbles: true }));
        }
        return res;
      });
      const n = r.filter(Boolean).length;
      return { ok: n === r.length, detail: `${n}/${r.length} appuis ont fait sauter Max` };
    },
  },
  {
    nom: "Salamandre : en sautant vers elle, Max passe par-dessus ou l'assomme, quel que soit le moment du saut",
    async run(page) {
      const r = await page.evaluate(() => {
        const t = __temple, T = 16, out = [];
        for (const d of [20, 30, 40, 50, 60, 70]) {
          t.progress.tester = true; t.playFrom(t.LEVELS.findIndex((x) => x.name === "Les portes d'or")); t.game.mode = "play"; t.game.cardT = 99;
          for (let k = 0; k < 95; k++) t.mesurePerf(1);
          const R = t.room, P = R.player; R.def.triggers.forEach((_, j) => R.fired.add(j));
          const e = R.enemies.find((q) => q.kind === "I"); R.enemies.forEach((q) => { if (q !== e) q.alive = false; });
          P.x = e.x - 8 * T; P.y = e.y + e.h - P.h; P.vy = 0; e.vx = -Math.abs(e.vx);
          let saute = false, res = "rien";
          for (let f = 0; f < 300; f++) {
            t.input.right = saute; t.input.jump = false;
            if (!saute && e.x - (P.x + P.w) < d) { saute = true; t.input.jump = true; t.pressed.jump = true; t.input.right = true; }
            else if (saute && P.vy < 0) t.input.jump = true;
            t.mesurePerf(1);
            if (!P.alive || t.game.mode === "dead") { res = "mort"; break; }
            if (e.stun) { res = "assommée"; break; }
            if (P.x > e.x + 40 && P.grounded) { res = "passé"; break; }
          }
          out.push(`${d} px : ${res}`);
        }
        Object.assign(t.input, { right: false, jump: false });
        return out;
      });
      return { ok: r.every((s) => /passé|assommée/.test(s)), detail: "saut lancé à " + r.join(", ") };
    },
  },
];
