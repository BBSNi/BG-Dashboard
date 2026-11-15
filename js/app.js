/* Steuerung: Seitenwechsel über die Adresse (#start, #klasse, #coolflex …), Klassenwahl, Meldungen, Offline-Fähigkeit. */
(function () {
  "use strict";
  const { D, H } = BG;
  const C = BG.config, Z = BG.zustand;
  const ANSICHTEN = {
    start: { bereich: "start", titel: "Start", f: () => BG.ansichten.start() },
    klasse: { bereich: "klasse", titel: "Meine Klasse", f: () => BG.ansichten.klasse() },
    alle: { bereich: "alle", titel: "Alle Seiten", f: () => BG.ansichten.alle() },
    coolflex: { bereich: "lehrkraefte", titel: "Dashboard", f: () => BG.lehrkraefte.coolflex() },
    ampel: { bereich: "lehrkraefte", titel: "Ampel", f: () => BG.lehrkraefte.ampel() },
    fach: { bereich: "lehrkraefte", titel: "Fach", f: () => BG.lehrkraefte.fach() },
    auftraege: { bereich: "lehrkraefte", titel: "Aufträge", f: () => BG.lehrkraefte.auftraege() },
    verwaltung: { bereich: "lehrkraefte", titel: "Verwaltung", f: () => BG.lehrkraefte.verwaltung() }
  };

  /* Adresse lesen: #klasse-11b setzt zugleich die Klasse (für Links aus IServ je Klasse) */
  function aktuelleAnsicht() {
    let h = (location.hash || "#start").slice(1).toLowerCase();
    const m = h.match(/^klasse-(\w+)$/);
    if (m) { const k = C.klassen.find(x => x.toLowerCase() === m[1]); if (k) klasseSetzen(k, false); h = "klasse"; }
    if (h === "klasse" && !BG.coolflexAktiv()) h = "start";   // vor dem COOLflex-Start gibt es "Meine Klasse" noch nicht
    return ANSICHTEN[h] ? h : "start";
  }
  let letzteAnsicht = null;
  function zeichnen() {
    const name = aktuelleAnsicht(), v = ANSICHTEN[name], cool = BG.coolflexAktiv();
    document.title = (name === "start" ? "" : v.titel + " · ") + "BG-Dashboard";
    /* COOLflex-Teile der Navigation erst ab Stichtag; den Lehrkräfte-Punkt auch, wenn jemand per Direktlink dort ist */
    document.querySelectorAll('[data-bereich="klasse"]').forEach(a => { a.hidden = !cool; });
    document.querySelectorAll('[data-bereich="lehrkraefte"]').forEach(a => { a.hidden = !cool && v.bereich !== "lehrkraefte"; });
    document.querySelectorAll("[data-bereich]").forEach(a => { if (a.dataset.bereich === v.bereich) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    meldungenZeichnen(cool || v.bereich === "lehrkraefte");
    const ziel = document.getElementById("ansicht");
    ziel.innerHTML = v.f();
    if (letzteAnsicht !== name) { window.scrollTo(0, 0); letzteAnsicht = name; }
  }
  /* Hinweise zu Server/Vorschau betreffen nur COOLflex – ohne COOLflex braucht das Dashboard keinen Server */
  function meldungenZeichnen(mitDaten) {
    const d = BG.Daten; let h = "";
    if (!mitDaten) { document.getElementById("meldungen").innerHTML = ""; return; }
    if (d.modus === "laden") h = `<div class="banner">Daten werden geladen …</div>`;
    if (d.modus === "offline") h = `<div class="banner gelb"><span>Keine Verbindung. Angezeigt wird der Stand vom ${d.stand ? new Date(d.stand).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "letzten Besuch"}.</span></div>`;
    if (d.modus === "vorschau") h = `<div class="banner"><span><strong>Vorschau ohne Server.</strong> Einträge bleiben nur in diesem Browser. Auf dem Schulserver teilen sich alle dieselben Daten.</span></div>`;
    if (d.modus === "server" && !d.https && d.angemeldet === false && location.protocol !== "https:" && location.hostname !== "localhost") h += `<div class="banner rot">Diese Seite läuft ohne https. Anmelden ist so nicht möglich.</div>`;
    document.getElementById("meldungen").innerHTML = h;
  }

  /* Phase bzw. Klasse merken ("E", "Q" oder für COOLflex "11A" …) */
  function klasseSetzen(k, neu = true) {
    Z.klasse = k; H.speicher.schreiben("bg-klasse", k);
    if (neu) zeichnen();
  }
  function phaseSetzen(p) {
    if (p === "E" && /^11./.test(Z.klasse || "")) return;   // gewählte Klasse 11A … behalten
    klasseSetzen(p);
  }

  /* Meldung unten */
  let zeit = null;
  BG.meldung = function (text) {
    let el = document.querySelector(".meldung");
    if (!el) { el = document.createElement("div"); el.className = "meldung"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = text; el.hidden = false; clearTimeout(zeit); zeit = setTimeout(() => { el.hidden = true; }, 2600);
  };

  /* Klicks in den Ansichten */
  document.addEventListener("click", ev => {
    const t = ev.target.closest("button, a"); if (!t) return;
    const ds = t.dataset;
    if (ds.woche !== undefined) { const s = Number(ds.woche); Z.woche = s === 0 ? D.schulwoche() : Z.woche + s * 7; zeichnen(); return; }
    if (ds.ampel !== undefined) { const s = Number(ds.ampel); Z.ampelStart = s === 0 ? D.schulwoche() - 7 : Z.ampelStart + s * Math.max(1, Math.floor(Z.ampelWochen / 2)) * 7; zeichnen(); return; }
    if (ds.phase) { phaseSetzen(ds.phase); return; }
    if (ds.klasseSetzen) { klasseSetzen(ds.klasseSetzen); return; }
    if (ds.klasseOeffnen) { klasseSetzen(ds.klasseOeffnen, false); location.hash = "#klasse"; return; }
    if (ds.zelle) { const [k, mo] = ds.zelle.split("|"); const neu = { k, mo: Number(mo) }; Z.auswahl = Z.auswahl && Z.auswahl.k === k && Z.auswahl.mo === neu.mo ? null : neu; if (location.hash === "#ampel") zeichnen(); else location.hash = "#ampel"; return; }
    if (ds.zelleOeffnen) { const [k, mo] = ds.zelleOeffnen.split("|"); Z.auswahl = { k, mo: Number(mo) }; Z.ampelStart = Math.min(Z.ampelStart, Number(mo)); location.hash = "#ampel"; return; }
    if (ds.fach) { Z.fach = ds.fach; zeichnen(); return; }
  });
  document.addEventListener("change", ev => {
    const id = ev.target.id;
    if (id === "ampel-wochen") { Z.ampelWochen = Number(ev.target.value); H.speicher.schreiben("bg-ampel-wochen", Z.ampelWochen); zeichnen(); }
    if (id === "filter-klasse") { Z.filterKlasse = ev.target.value; zeichnen(); }
    if (id === "filter-fach") { Z.filterFach = ev.target.value; zeichnen(); }
  });

  window.addEventListener("hashchange", zeichnen);
  /* Beim Zurückkehren in die App frische Daten holen */
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") BG.Daten.neuLaden(); });
  window.addEventListener("online", () => BG.Daten.neuLaden());
  let fensterZeit = null;
  window.addEventListener("resize", () => { clearTimeout(fensterZeit); fensterZeit = setTimeout(zeichnen, 200); });

  /* Start */
  BG.lehrkraefte.verbinden();
  BG.Daten.beimAendern(zeichnen);
  zeichnen();
  BG.Daten.start();

  /* Offline-Fähigkeit (nur über http(s), nicht bei lokal geöffneter Datei) */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => { });
  }
})();
