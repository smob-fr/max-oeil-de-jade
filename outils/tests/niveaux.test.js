// Les 100 niveaux se lancent et tournent sans erreur ; immobile au départ, Max a le temps de regarder (3 s).
// (Plus tard, une momie peut venir le chercher : c'est voulu.)
"use strict";
module.exports = [
  {
    nom: "Les 100 niveaux se lancent et tournent 400 images sans erreur",
    async run(page) {
      const r = await page.evaluate(() => {
        const t = __temple, rates = [];
        t.progress.tester = true;
        for (let i = 0; i < t.LEVELS.length; i++) {
          try {
            t.playFrom(i); t.game.mode = "play"; t.game.cardT = 99;
            // course à droite, sauts et coups réguliers
            for (let k = 0; k < 400; k++) { t.input.right = k % 90 < 60; t.input.jump = k % 37 < 8; t.pressed.jump = k % 37 === 0; t.pressed.fire = k % 23 === 0; t.mesurePerf(1); }
          } catch (e) { rates.push(`${i + 1} ${t.LEVELS[i].name} : ${e.message}`); }
        }
        Object.assign(t.input, { right: false, jump: false });
        return { n: t.LEVELS.length, rates };
      });
      return { ok: r.n === 100 && !r.rates.length, detail: r.n !== 100 ? `${r.n} niveaux au lieu de 100` : r.rates.join(" ; ") };
    },
  },
  {
    nom: "Immobile au départ, Max survit 3 secondes (hors combats finaux)",
    async run(page) {
      const morts = await page.evaluate(() => {
        const t = __temple, out = [];
        t.progress.tester = true;
        for (let i = 0; i < t.LEVELS.length; i++) {
          if (t.LEVELS[i].boss) continue;
          t.playFrom(i); for (let k = 0; k < 85; k++) t.mesurePerf(1);   // carte de titre
          for (let k = 0; k < 180; k++) { t.mesurePerf(1); if (!t.room.player.alive) { out.push(`${i + 1} ${t.LEVELS[i].name} (image ${k})`); break; } }
        }
        return out;
      });
      return { ok: !morts.length, detail: morts.length ? "mort immobile : " + morts.join(", ") : "" };
    },
  },
];
