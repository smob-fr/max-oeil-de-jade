#!/usr/bin/env node
// Tests de bout en bout du jeu, dans un vrai navigateur (Chromium piloté par Playwright).
//
//   cd outils/tests && npm install && npx playwright install chromium   (une seule fois)
//   node outils/tests/lancer.js              tous les tests
//   node outils/tests/lancer.js boss saut    seulement les tests dont le nom contient « boss » ou « saut »
//
// Le lanceur sert lui-même les fichiers du jeu (pas besoin de serveur), ouvre une page par test
// et pilote le jeu par l'objet de test window.__temple (voir la fin de game.js).
// Code de sortie : 0 si tout passe, 1 sinon.
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

let playwright;
try { playwright = require("playwright"); } catch (_) {
  console.error("Playwright est introuvable. Une seule fois : cd outils/tests && npm install && npx playwright install chromium");
  process.exit(2);
}
const { chromium, devices } = playwright;

const RACINE = path.resolve(__dirname, "..", "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".css": "text/css" };

function serveur() {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      let f = decodeURIComponent(req.url.split("?")[0]);
      if (f.endsWith("/")) f += "index.html";
      const p = path.join(RACINE, f);
      if (!p.startsWith(RACINE)) { res.writeHead(403); res.end(); return; }
      fs.readFile(p, (e, d) => {
        if (e) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
        res.end(d);
      });
    });
    s.listen(0, "127.0.0.1", () => ok(s));
  });
}

async function main() {
  const filtres = process.argv.slice(2).map((a) => a.toLowerCase());
  const tests = [];
  for (const f of fs.readdirSync(__dirname).filter((f) => f.endsWith(".test.js")).sort()) {
    for (const t of require(path.join(__dirname, f))) tests.push({ ...t, fichier: f });
  }
  const choisis = tests.filter((t) => !filtres.length || filtres.some((m) => (t.fichier + " " + t.nom).toLowerCase().includes(m)));
  if (!choisis.length) { console.error("Aucun test ne correspond à :", filtres.join(" ")); process.exit(2); }

  const srv = await serveur();
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const navigateur = await chromium.launch();
  let echecs = 0;
  const debut = Date.now();
  for (const t of choisis) {
    const contexte = await navigateur.newContext(t.mobile ? { ...devices["iPhone 13 landscape"] } : { viewport: { width: 844, height: 390 } });
    const page = await contexte.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message));
    const t0 = Date.now();
    let r;
    try {
      await page.goto(url);
      await page.waitForFunction(() => window.__temple && window.__temple.LEVELS.length > 0);
      r = await t.run(page, contexte);
    } catch (e) {
      r = { ok: false, detail: "exception : " + (e && e.message ? e.message.split("\n")[0] : e) };
    }
    if (erreurs.length) r = { ok: false, detail: "erreur JavaScript dans la page : " + erreurs[0] + (r.detail ? " | " + r.detail : "") };
    const s = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`${r.ok ? "✓" : "✗"} ${t.nom} (${s} s)${r.detail ? "\n    " + r.detail : ""}`);
    if (!r.ok) echecs++;
    await contexte.close();
  }
  await navigateur.close();
  srv.close();
  console.log(`\n${choisis.length - echecs}/${choisis.length} tests réussis en ${Math.round((Date.now() - debut) / 1000)} s`);
  process.exit(echecs ? 1 : 0);
}

main();
