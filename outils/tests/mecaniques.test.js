// Chaque mécanique propre à un monde, testée seule en pilotant le moteur image par image.
// Chaque test renvoie des mesures, puis une liste de vérifications [libellé, vrai/faux].
"use strict";

// Code commun injecté dans la page : lancer un niveau, avancer, trouver une case, poser Max.
const OUTILS = `
  const t = __temple, T = 16;
  // lance un niveau ; ses pièges surprises sont désactivés, sauf si on demande de les garder
  const lance = (i, garderPieges) => { t.progress.tester = true; t.playFrom(typeof i === "string" ? t.LEVELS.findIndex((d) => d.name === i) : i); t.game.mode = "play"; t.game.cardT = 99; for (let k = 0; k < 95; k++) t.mesurePerf(1); const R = t.room; if (!garderPieges) R.def.triggers.forEach((_, j) => R.fired.add(j)); return R; };
  const pas = (n, touches = {}, chaque) => { for (let k = 0; k < n; k++) { Object.assign(t.input, { left: false, right: false, jump: false, fire: false }, touches); if (chaque) chaque(k); t.mesurePerf(1); } };
  const trouve = (R, c, depuis = 6) => { for (let x = depuis; x < R.tiles[0].length; x++) for (let y = 0; y < R.tiles.length; y++) if (R.tiles[y][x] === c) return [x, y]; return null; };
  const debout = (R, X) => { const P = R.player; P.x = X * T + 3; P.vx = 0; P.vy = 0; for (let y = 0; y < R.tiles.length - 1; y++) if (R.tiles[y][X] === "." && "#~%*{}8zgi".includes(R.tiles[y + 1][X])) { P.y = (y + 1) * T - P.h; return y; } };
`;
async function mesurer(page, corps) {
  return page.evaluate((src) => new Function(src)(), OUTILS + corps);
}
function bilan(m, verifs) {
  const rates = verifs.filter(([, ok]) => !ok).map(([l]) => l);
  return { ok: !rates.length, detail: (rates.length ? "ÉCHEC : " + rates.join(", ") + " — " : "") + JSON.stringify(m) };
}

module.exports = [
  {
    nom: "Monde 1 (inca) : singe voleur, bébé jaguar, tête de jaguar, rayon du soleil",
    async run(page) {
      const m = await mesurer(page, `
        const out = {};
        // singe voleur : il vole des pièces, un coup de massue les fait rendre
        let R = lance(2); t.progress.pieces = 10; let P = R.player, e = R.enemies.find((q) => q.kind === "k");
        P.x = e.x - 60; P.y = e.y + e.h - P.h; R.t = 200; pas(80);
        out.singeVole = 10 - t.progress.pieces;
        out.singe = { etat: e.etat, butin: e.butin, vivant: e.alive };
        // Max le rattrape (il est replacé juste derrière lui à chaque image) et frappe
        if (e.alive) { P.invuln = 1e9; t.pressed.fire = true; for (let k = 0; k < 20 && !e.stun; k++) { P.x = e.x - 12; P.y = e.y + e.h - P.h; P.vy = 0; P.face = 1; pas(1); } }
        out.singeStun = e.stun || 0;
        out.piecesRendues = R.pickups.filter((i) => i.kind === "coin2").length;
        // bébé jaguar : il guette, se ramasse, bondit
        R = lance(5); P = R.player; e = R.enemies.find((q) => q.kind === "j"); P.x = e.x - 80; P.y = e.y + e.h - P.h; R.t = 200;
        const etats = new Set(); pas(90, {}, () => etats.add(e.etat)); out.jaguar = [...etats].join(">");
        // tête de jaguar : le feu tue quand il est allumé
        R = lance(6); P = R.player; const f = R.flames[0]; R.t = 200; out.flammeTue = false;
        for (let k = 0; k < 300 && P.alive; k++) { P.x = (f.dir > 0 ? f.x + 2 : f.x - 2) * T + 3; P.y = f.y * T + 1; P.vy = 0; t.mesurePerf(1); }
        out.flammeTue = !P.alive;
        // rayon du soleil : il tue en plein soleil
        R = lance(8); P = R.player; const b = R.beams[0]; R.t = 200;
        for (let k = 0; k < 500 && P.alive; k++) { P.x = b.sx + 3 * T; P.vy = 0; t.mesurePerf(1); }
        out.soleilTue = !P.alive;
        return out;`);
      return bilan(m, [["le singe vole des pièces", m.singeVole > 0], ["il les rend quand on l'assomme", m.piecesRendues > 0],
        ["le bébé jaguar bondit", /bond|saute/.test(m.jaguar)], ["la tête de jaguar brûle", m.flammeTue], ["le rayon du soleil brûle", m.soleilTue]]);
    },
  },
  {
    nom: "Monde 2 (Himalaya) : neige, pont de corde, glace fine, geyser, ski, froid, chèvre, aigle, avalanche",
    async run(page) {
      const m = await mesurer(page, `
        const out = {};
        let R = lance(20), P = R.player, z = trouve(R, "z", 0);
        P.x = z[0] * T; P.y = (z[1] - 1) * T + 1; pas(30, { right: true }); out.neigeVitesse = +P.vx.toFixed(2);
        R = lance(22); P = R.player; const y_ = trouve(R, "y", 0); P.x = y_[0] * T + 3; P.y = (y_[1] - 1) * T + 1; pas(45); out.plancheTombee = R.tiles[y_[1]][y_[0]] === ".";
        R = lance(31); P = R.player; const i_ = trouve(R, "i", 0); P.x = i_[0] * T + 3; P.y = (i_[1] - 1) * T + 1; pas(200); out.glaceCede = R.tiles[i_[1]][i_[0]] !== "i";
        R = lance(30); P = R.player; const v = trouve(R, "V", 0); let ymin = 1e9; pas(260, {}, () => { P.x = v[0] * T + 3; ymin = Math.min(ymin, P.y); }); out.geyser = Math.round((v[1] - 1) * T - ymin);
        R = lance(28); P = R.player; const s = R.ski[0]; P.x = s.x0 + 4; P.y = 0; pas(65); out.ski = +P.vx.toFixed(2);
        R = lance(33); P = R.player; R.froid = 0.5; P.x = 30 * T; pas(60); out.froidBaisse = R.froid < 0.5;
        const br = R.braseros[1]; P.x = br.x * T; P.y = br.y * T + 1; pas(60); out.braseroRechauffe = R.froid > 0.9;
        R = lance(20); P = R.player; let e = R.enemies.find((q) => q.kind === "C"); P.x = e.x - 70; P.y = e.y + e.h - P.h; const et = new Set(); pas(60, {}, () => et.add(e.etat)); out.chevreCharge = et.has("charge");
        R = lance(32); P = R.player; e = R.enemies.find((q) => q.kind === "A"); P.x = e.x - 30; P.y = e.y + 50; P.vy = -3; P.grounded = false; pas(2); out.aigle = e.etat;
        R = lance(23, true); P = R.player; pas(1); P.x = 6 * T + 2; pas(5); const w0 = R.boulders[0] && R.boulders[0].w; pas(120, {}, () => { P.x = 60 * T; P.y = 0; }); out.avalanche = [w0, R.boulders[0] && R.boulders[0].w];
        return out;`);
      return bilan(m, [["la neige profonde ralentit", m.neigeVitesse > 0.3 && m.neigeVitesse < 1.5], ["la planche du pont tombe", m.plancheTombee],
        ["la glace fine cède sous Max immobile", m.glaceCede], ["le geyser propulse", m.geyser > 48], ["Max glisse tout seul à ski", m.ski > 2],
        ["le froid baisse loin du brasero", m.froidBaisse], ["le brasero réchauffe", m.braseroRechauffe], ["la chèvre charge", m.chevreCharge],
        ["l'aigle pique sur Max qui saute", m.aigle === "pique"], ["la boule d'avalanche grossit", m.avalanche[1] > m.avalanche[0]]]);
    },
  },
  {
    nom: "Monde 3 (abysses) : mine, sas, requin, coffre, globe, torpilles, tourbillon, poisson-lanterne",
    async run(page) {
      const m = await mesurer(page, `
        const out = {};
        const cherche = (c, ok = () => true) => { for (let i = 40; i < 60; i++) { const L = t.LEVELS[i]; for (let y = 0; y < L.map.length; y++) { const x = L.map[y].indexOf(c); if (x >= 0 && ok(L.map[y], x)) return { i, x, y }; } } return null; };
        const place = (R, x, y) => { const P = R.player; P.x = x * T + 3; P.y = y * T + 1; P.vx = 0; P.vy = 0; };
        // mine poussée d'un coup de massue contre le mur fissuré
        let c = cherche("M", (row, x) => row.slice(x, x + 10).includes("B")), R = lance(c.i);
        let bx = -1; for (let x = c.x; x < c.x + 20; x++) if (R.tiles[c.y][x] === "B") { bx = x; break; }
        const mine = R.enemies.find((e) => e.kind === "M" && Math.abs(e.x - c.x * T) < 4);
        place(R, c.x - 1, c.y); R.player.face = 1; R.player.invuln = 1e9; t.pressed.fire = true; pas(1, { fire: true }); pas(80);
        out.mineExplose = !mine.alive; out.murOuvert = R.tiles[c.y][bx] === ".";
        // sas : il s'ouvre et se ferme, et écrase Max s'il se ferme sur lui
        R = lance(t.LEVELS.findIndex((L) => L.sas)); const g = R.sas[0]; let ouvert = 0, ferme = 0;
        pas(600, {}, () => { if (g.ferme) ferme++; else ouvert++; R.player.invuln = 1e9; });
        R.player.invuln = 0; while (g.ferme) pas(1);
        for (let k = 0; k < 400 && !g.ferme; k++) { place(R, g.x, g.y + 1); pas(1); }
        out.sas = { ouvert, ferme, ecrase: !R.player.alive };
        // requin : il se réveille et chasse
        c = cherche("Z"); R = lance(c.i); const rq = R.enemies.find((e) => e.kind === "Z"); place(R, c.x - 6, c.y); pas(5); const d0 = rq.x; pas(120);
        out.requin = rq.etat; out.requinBouge = Math.round(rq.x - d0);
        // coffre piégé : il mord ; un coup de massue lui fait cracher 3 pièces
        c = cherche("X"); R = lance(c.i); place(R, c.x - 1, c.y); pas(40); out.coffreMord = !R.player.alive;
        R = lance(c.i); const cf = R.enemies.find((e) => e.kind === "X"); place(R, c.x - 1, c.y); R.player.face = 1; t.pressed.fire = true; pas(1, { fire: true }); pas(5);
        out.coffrePieces = R.pickups.filter((q) => q.kind === "coin2").length; out.coffreParti = !cf.alive;
        // poisson-globe : il se gonfle
        c = cherche("h"); R = lance(c.i); const gl = R.enemies.find((e) => e.kind === "h"); place(R, c.x - 2, c.y); pas(30, { right: true }); out.globeGonfle = gl.gonfle > 0.5;
        // torpilles : le lance-torpilles tire et tue
        c = cherche("K"); R = lance(c.i); let tir = false;
        for (let k = 0; k < 400 && R.player.alive; k++) { place(R, c.x, c.y - 3); pas(1); if (R.torpilles.length) tir = true; }
        out.torpille = { tir, tue: !R.player.alive };
        // tourbillon : il inverse les commandes
        R = lance(t.LEVELS.findIndex((L) => L.tourbillons)); const w = R.tourbillons[0]; R.player.x = w.x - 5; R.player.y = w.y - 8; pas(10); out.tourbillonInverse = t.game.invert > 0;
        // poisson-lanterne : il avance de point en point quand Max le rejoint
        R = lance(t.LEVELS.findIndex((L) => L.lanterne)); const L0 = R.lanterne.i; R.player.invuln = 1e9;
        pas(400, {}, () => { R.player.x = R.lanterne.x - 5; R.player.y = R.lanterne.y - 8; R.player.vy = 0; R.o2 = 1; });
        out.lanterne = [L0, R.lanterne.i];
        return out;`);
      return bilan(m, [["la mine poussée explose", m.mineExplose], ["elle ouvre le mur fissuré", m.murOuvert],
        ["le sas s'ouvre et se ferme", m.sas.ouvert > 0 && m.sas.ferme > 0], ["le sas écrase Max", m.sas.ecrase],
        ["le requin chasse", m.requin === "chasse" && m.requinBouge !== 0], ["le coffre mord", m.coffreMord], ["assommé, le coffre crache 3 pièces", m.coffrePieces >= 3 && m.coffreParti],
        ["le poisson-globe se gonfle", m.globeGonfle], ["les torpilles tirent et tuent", m.torpille.tir && m.torpille.tue],
        ["le tourbillon inverse les commandes", m.tourbillonInverse], ["le poisson-lanterne avance", m.lanterne[1] >= m.lanterne[0] + 2]]);
    },
  },
  {
    nom: "Monde 4 (nuages) : nuage qui fond, trampoline, éclair, souffleur, pluie, moulin, oiseaux, étincelle, grêle",
    async run(page) {
      const m = await mesurer(page, `
        const out = {};
        let R = lance("Les nuages fondants"); let [x, y] = trouve(R, "%"); debout(R, x); pas(20); const a = R.tiles[y][x]; pas(40); const b = R.tiles[y][x];
        pas(300, {}, () => { R.player.alive = true; }); out.fond = [a, b, R.tiles[y][x]].join("");
        R = lance("Les trampolines"); [x, y] = trouve(R, "*"); debout(R, x); let P = R.player; const hs = []; let minY = 1e9, avant = 0;
        pas(400, {}, () => { P.x = x * T + 3; P.vx = 0; P.alive = true; P.invuln = 999; minY = Math.min(minY, P.y); if (avant < 0 && P.vy >= 0) { hs.push(+((y * T - minY) / T).toFixed(1)); minY = 1e9; } avant = P.vy; });
        out.trampoline = hs.slice(0, 3);
        R = lance("L'orage"); let f = R.foudres[2]; debout(R, f.x); P = R.player; let warn = false; pas(400, {}, () => { if (f.warn) warn = true; });
        out.eclair = { ombre: warn, tueDessous: !P.alive };
        R = lance("L'orage"); f = R.foudres[2]; debout(R, f.x - 2); pas(400); out.eclair.epargneACote = R.player.alive;
        R = lance("Le vent céleste"); const s = R.souffleurs[0]; P = R.player; debout(R, s.x - 4); P.invuln = 9999; s.t = 150; const x0 = P.x; pas(30, {}, () => { P.alive = true; }); out.souffle = Math.round((P.x - x0) * s.dir);
        R = lance("La pluie"); const z = R.pluies[0]; let X = Math.floor(z.x0 / T) + 1, yy; while ((yy = debout(R, X)) === undefined) X++; P = R.player; minY = 1e9;
        t.pressed.jump = true; pas(40, { jump: true }, () => { P.x = X * T + 3; minY = Math.min(minY, P.y); }); out.sautPluie = +((yy * T + 1 - minY) / T).toFixed(2);
        R = lance("Les moulins célestes"); const mv = R.movers.find((q) => q.circ); P = R.player; P.invuln = 9999; P.x = mv.x + 6; P.y = mv.y - P.h - 1; P.vy = 0; let porte = 0;
        pas(150, {}, () => { if (P.onMover === mv) porte++; P.alive = true; }); out.moulinPorte = porte;
        R = lance("Les oiseaux"); const o = R.enemies.find((q) => q.kind === "O"); const ox = o.x; debout(R, Math.floor(o.x / T) - 12); pas(40); out.oiseauVole = Math.round(ox - o.x);
        R = lance("Le palais céleste"); const e = R.enemies.find((q) => q.kind === "E"); const ey = e.y; debout(R, Math.floor(e.x / T) - 5); R.player.invuln = 9999; pas(400, {}, () => { R.player.alive = true; });
        out.etincelle = e.alive && Math.abs(e.y - ey) < 8;
        R = lance("La grêle"); const g = R.grele[0]; debout(R, Math.floor(g.x0 / T) + 4); g.t = g.per - 1; let n = 0; pas(120, {}, () => { n = Math.max(n, R.grelons.length); }); out.grelons = n;
        return out;`);
      return bilan(m, [["le nuage rose fond puis revient", m.fond === "%.%"], ["les rebonds de trampoline montent de plus en plus", m.trampoline.length >= 2 && m.trampoline[1] > m.trampoline[0]],
        ["l'éclair est annoncé par une ombre", m.eclair.ombre], ["il tue dessous", m.eclair.tueDessous], ["il épargne à côté", m.eclair.epargneACote],
        ["le souffleur pousse Max", m.souffle > 10], ["sous la pluie on saute moins haut", m.sautPluie >= 1 && m.sautPluie < 2],
        ["la pale du moulin porte Max", m.moulinPorte > 100], ["les oiseaux traversent", m.oiseauVole > 20], ["l'étincelle reste sur son nuage", m.etincelle], ["la grêle tombe", m.grelons > 0]]);
    },
  },
  {
    nom: "Monde 5 (cité d'or) : tapis, lave, jets de feu, golem, salamandre, gardien, robot, dalles qui fondent",
    async run(page) {
      const m = await mesurer(page, `
        const out = {};
        let R = lance("Les portes d'or"); let [x, y] = trouve(R, "}") || trouve(R, "{"); const sens = R.tiles[y][x]; debout(R, x); let x0 = R.player.x; pas(20);
        out.tapis = Math.round((R.player.x - x0) * (sens === "}" ? 1 : -1));
        R = lance("La rivière de lave"); [x, y] = trouve(R, "R"); let P = R.player; P.x = x * T + 3; P.y = (y - 1) * T; P.vy = 0; pas(30); out.laveTue = !P.alive;
        R = lance("Les jets de feu"); const j = R.jets[0]; debout(R, j.x); P = R.player; let warn = false; pas(400, {}, () => { if (j.warn && P.alive) warn = true; }); out.jet = { fumee: warn, tue: !P.alive };
        R = lance("Les golems"); let e = R.enemies.find((q) => q.kind === "N"); P = R.player; P.invuln = 9999;
        const coup = () => { P.x = e.x - 13; P.y = e.y + e.h - P.h; P.face = 1; t.pressed.fire = true; pas(20); };
        pas(100); coup(); out.golem1 = { armure: e.armure, stun: e.stun || 0 }; pas(30); coup(); out.golem2 = e.stun || 0;
        R = lance("Les salamandres"); e = R.enemies.find((q) => q.kind === "I"); debout(R, Math.floor(e.x / T) - 12); pas(150); out.braises = R.braises.length;
        R = lance("La salle des trésors"); e = R.enemies.find((q) => q.kind === "U"); const X = Math.floor(e.x / T) - 6; debout(R, X); P = R.player; P.invuln = 9999;
        x0 = e.x; pas(60, {}, () => { P.face = 1; P.x = X * T + 3; }); const regarde = Math.round(e.x - x0);
        x0 = e.x; pas(60, {}, () => { P.face = -1; P.x = X * T + 3; }); out.gardien = { regarde, dos: Math.round(e.x - x0) };
        R = lance("La forge d'Archibald"); e = R.enemies.find((q) => q.kind === "d"); P = R.player; P.invuln = 9999; e.vx = -0.5; debout(R, Math.floor(e.x / T) - 5); pas(10);
        out.alarme = R.alarme > 0; pas(120); out.magma = R.grelons.length;
        R = lance("La rivière de lave"); [x, y] = trouve(R, "%"); debout(R, x); pas(60, {}, () => { R.player.alive = true; R.player.invuln = 999; }); out.dalleFondue = R.tiles[y][x] === ".";
        return out;`);
      return bilan(m, [["le tapis roulant emporte Max", m.tapis > 10], ["la lave tue", m.laveTue], ["le jet de feu fume puis tue", m.jet.fumee && m.jet.tue],
        ["un coup casse la carapace du golem sans l'assommer", !m.golem1.armure && m.golem1.stun === 0], ["le deuxième coup l'assomme", m.golem2 > 0],
        ["la salamandre laisse une traînée de feu", m.braises > 0], ["le gardien d'or reste figé quand on le regarde", m.gardien.regarde === 0], ["il avance quand on lui tourne le dos", m.gardien.dos !== 0],
        ["le robot sonne l'alarme", m.alarme], ["l'alarme fait pleuvoir du magma", m.magma > 0], ["la dalle d'or fond", m.dalleFondue]]);
    },
  },
];
