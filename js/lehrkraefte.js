/* Bereich Lehrkräfte: Dashboard, Ampel, Fach, Aufträge (mit Passwort), Verwaltung (mit Passwort). */
(function () {
  "use strict";
  const { D, H, F, R, B } = BG;
  const C = BG.config, Z = BG.zustand;
  const Dt = () => BG.Daten;

  function reiter(aktiv) {
    const r = [["coolflex", "Dashboard"], ["ampel", "Ampel"], ["fach", "Fach"], ["auftraege", "Aufträge"], ["verwaltung", "Verwaltung"]];
    return `<nav class="reiter" aria-label="Bereich Lehrkräfte">${r.map(([id, t]) => `<a href="#${id}" ${id === aktiv ? 'aria-current="page"' : ""}>${t}</a>`).join("")}
      ${Dt().angemeldet ? `<button type="button" class="knopf leer klein" data-aktion="abmelden" style="margin-left:auto">Abmelden</button>` : ""}</nav>`;
  }

  /* ---------- Dashboard ---------- */
  function coolflex() {
    const mo = Z.woche, A = Dt().auftraege;
    const kacheln = C.klassen.map(k => {
      const st = R.woche(k, mo, A);
      return `<button type="button" class="klassenkachel st-${st.status}" data-klasse-oeffnen="${k}">
        <span class="k">${k}</span>
        <span class="h">${st.status === "ferien" ? "Ferien" : H.std(st.stunden) + " Std."}</span>
        <span class="s">${st.status === "ferien" ? "" : (st.anzahl === 1 ? "1 Auftrag" : st.anzahl + " Aufträge") + " · " + R.statusText[st.status]}</span></button>`;
    }).join("");
    const hw = R.hinweise(A, mo, 6);
    const hwHtml = hw.length ? `<ul class="liste-hinweise">${hw.slice(0, 7).map(x => `<li><span class="punkt ${x.art}"></span>${x.k ? `<button type="button" data-zelle-oeffnen="${x.k}|${x.mo}">${H.esc(x.text)}</button>` : `<span>${H.esc(x.text)}</span>`}</li>`).join("")}</ul>` : `<p class="leise">Keine Auffälligkeiten in den nächsten sechs Wochen.</p>`;
    const nav = [["ampel", "i-ampel", "Ampel", "ganzes Halbjahr"], ["fach", "i-buch", "Fach", "alle Klassen je Fach"], ["auftraege", "i-plus", "Aufträge eintragen", "mit Passwort"], ["verwaltung", "i-zahnrad", "Verwaltung", "Ferien, Export"]];
    return `${reiter("coolflex")}
      <div class="seitenkopf"><div><span class="eyebrow">COOLflex · Einführungsphase</span><h1>Dashboard</h1></div>${B.wochenwahl(mo, "dashboard")}</div>
      <div class="klassenkacheln">${kacheln}</div>
      <div class="raster-2">
        <section class="karte"><div class="karte-kopf"><h2>Nächste 6 Wochen</h2><a href="#ampel" class="klein">Ganze Ampel →</a></div>
          <div class="scroll">${B.ampel(mo, 6, { kompakt: true })}</div></section>
        <section class="karte"><h2>Hinweise</h2>${hwHtml}</section>
      </div>
      <div class="kacheln">${nav.map(([h_, i, t, s]) => `<a class="kachel" href="#${h_}"><span class="symbol"><svg><use href="#${i}"/></svg></span><span class="t"><b>${t}</b><span>${s}</span></span></a>`).join("")}</div>`;
  }

  /* ---------- Ampel ---------- */
  function ampel() {
    const ab = Z.ampelStart, w = Z.ampelWochen, ende = ab + (w - 1) * 7 + 4;
    let detail = "";
    if (Z.auswahl) {
      const { k, mo } = Z.auswahl, st = R.woche(k, mo, Dt().auftraege), kor = R.korridor(st.schultage);
      let t = st.status === "viel" ? `Diese Woche liegt ${H.std(st.stunden - kor.max)} Std. über dem Zielbereich. Ein Auftrag könnte später starten oder länger laufen.`
        : st.status === "wenig" ? `Hier ist noch Platz für etwa ${H.std(kor.min - st.stunden)}–${H.std(kor.max - st.stunden)} Std.`
          : st.status === "leer" ? `In dieser Woche läuft für ${k} kein Auftrag.` : "Die Woche ist gut verteilt.";
      if (st.anzahl > R.einstellungen().maxParallel) t += ` Es laufen ${st.anzahl} Aufträge gleichzeitig.`;
      detail = `<section class="karte"><div class="karte-kopf"><h2>${k} · KW ${D.kw(mo)} <span class="leise" style="font-weight:500">(${D.tm(mo)}–${D.tm(mo + 4)}${st.schultage < 5 ? `, ${st.schultage} Schultage` : ""})</span></h2>
        <span class="pille st-${st.status}">${H.std(st.stunden)} Std. · ${R.statusText[st.status]}</span></div><p class="leise">${H.esc(t)}</p>${B.wochenliste(k, mo)}</section>`;
    }
    return `${reiter("ampel")}
      <div class="seitenkopf"><div><span class="eyebrow">COOLflex</span><h1>Ampel</h1><p class="leise">Geschätzte COOL-Stunden pro Klasse und Woche. In Wochen mit Ferientagen gilt der Zielbereich anteilig.</p></div></div>
      <section class="karte">
        <div class="karte-kopf"><div class="wochenwahl" style="flex-wrap:wrap">
          <button type="button" class="symbolknopf" data-ampel="-1" aria-label="Frühere Wochen"><svg width="18" height="18"><use href="#i-links"/></svg></button>
          <span class="label">KW ${D.kw(ab)} – KW ${D.kw(ende)} · ${D.tm(ab)}–${D.tmj(ende)}</span>
          <button type="button" class="symbolknopf" data-ampel="1" aria-label="Spätere Wochen"><svg width="18" height="18"><use href="#i-rechts"/></svg></button>
          <button type="button" class="knopf leer" data-ampel="0">Heute</button>
          <select id="ampel-wochen" class="schmal" aria-label="Anzahl Wochen">${[6, 12, 20, 26].map(n => `<option value="${n}" ${n === w ? "selected" : ""}>${n} Wochen</option>`).join("")}</select>
        </div></div>
        <div class="scroll">${B.ampel(ab, w, { auswahl: Z.auswahl })}</div>${B.legende()}
      </section>${detail}`;
  }

  /* ---------- Fach ---------- */
  function fach() {
    const f = Z.fach, A = Dt().auftraege.filter(a => a.fach === f);
    const mo = D.schulwoche();
    const zeilen = A.slice().sort((x, y) => D.vonText(x.start) - D.vonText(y.start));
    const kommend = zeilen.filter(a => D.vonText(a.ende) >= D.heute());
    return `${reiter("fach")}
      <div class="seitenkopf"><div><span class="eyebrow">COOLflex</span><h1>${H.esc(F.name(f))}</h1><p class="leise">Alle Aufträge dieses Fachs über alle Klassen.</p></div>
        <div class="klassenwahl">${C.faecher.map(x => `<button type="button" data-fach="${x.id}" aria-pressed="${x.id === f}">${H.esc(F.kurz(x.id))}</button>`).join("")}</div></div>
      <section class="karte"><div class="karte-kopf"><h2>Zeitstrahl</h2><span class="leise klein">${kommend.length} laufende oder kommende Aufträge</span></div>
        <div class="scroll">${B.zeitstrahl({ abMo: mo - 7, wochen: 12, filter: a => a.fach === f, bearbeitbar: Dt().angemeldet, beschriftung: a => `<b>${H.esc(a.klassen.join(", "))}</b> · ${H.esc(a.titel)}` })}</div></section>`;
  }

  /* ---------- Anmeldung ---------- */
  function anmeldung(ziel) {
    const d = Dt();
    if (d.modus === "server" && !d.passwortEingerichtet) return einrichten();
    return `<section class="karte" style="max-width:460px">
      <h2><svg width="18" height="18" style="vertical-align:-3px"><use href="#i-schloss"/></svg> Anmelden</h2>
      <p class="leise">${ziel} ist nur für Lehrkräfte. Bitte das gemeinsame Passwort des COOL-Teams eingeben.</p>
      ${d.modus === "vorschau" ? `<p class="banner">Vorschau ohne Server: jedes Passwort funktioniert.</p>` : ""}
      <form id="form-anmelden" class="formular" style="grid-template-columns:1fr" novalidate>
        <label class="feld">Passwort<input type="password" id="pw" autocomplete="current-password"></label>
        <div class="fuss"><span class="fehler" id="pw-fehler" role="alert"></span><button type="submit" class="knopf haupt">Anmelden</button></div>
      </form></section>`;
  }
  function einrichten() {
    return `<section class="karte" style="max-width:560px">
      <h2>Passwort einrichten</h2>
      <p>Auf diesem Server ist noch kein Passwort eingerichtet. So geht es:</p>
      <ol class="leise" style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:4px">
        <li>Gewünschtes Passwort eingeben (mindestens 10 Zeichen) und „Hash erzeugen“ wählen.</li>
        <li>Den angezeigten Hash in <code>api/config.php</code> bei <code>passwort_hash</code> eintragen.</li>
        <li>Seite neu laden und mit dem Passwort anmelden.</li></ol>
      <form id="form-hash" class="formular" style="grid-template-columns:1fr" novalidate>
        <label class="feld">Neues Passwort<input type="password" id="neu-pw" autocomplete="new-password"></label>
        <div class="fuss"><span class="fehler" id="hash-fehler" role="alert"></span><button type="submit" class="knopf haupt">Hash erzeugen</button></div>
        <textarea id="hash-ausgabe" readonly hidden rows="2"></textarea>
      </form></section>`;
  }

  /* ---------- Aufträge ---------- */
  function auftraege() {
    if (!Dt().angemeldet) return reiter("auftraege") + anmeldung("Das Eintragen");
    const liste = Dt().auftraege.filter(a => (Z.filterKlasse === "alle" || a.klassen.includes(Z.filterKlasse)) && (Z.filterFach === "alle" || a.fach === Z.filterFach))
      .sort((x, y) => D.vonText(x.start) - D.vonText(y.start));
    const vorschau = Dt().modus === "vorschau";
    return `${reiter("auftraege")}
      <div class="seitenkopf"><div><span class="eyebrow">COOLflex</span><h1>Aufträge</h1></div>
        <button type="button" class="knopf haupt" data-aktion="neu"><svg width="18" height="18"><use href="#i-plus"/></svg>Auftrag eintragen</button></div>
      ${vorschau && !Dt().auftraege.length ? `<div class="banner"><span>Noch leer. Zum Ausprobieren lassen sich Beispielaufträge laden – sie bleiben nur in diesem Browser.</span><button type="button" class="knopf" data-aktion="beispiele">Beispiele laden</button></div>` : ""}
      <section class="karte">
        <div class="karte-kopf"><span class="leise">${liste.length} ${liste.length === 1 ? "Auftrag" : "Aufträge"}</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <select id="filter-klasse" class="schmal" aria-label="Klasse"><option value="alle">Alle Klassen</option>${C.klassen.map(k => `<option ${k === Z.filterKlasse ? "selected" : ""}>${k}</option>`).join("")}</select>
            <select id="filter-fach" class="schmal" aria-label="Fach"><option value="alle">Alle Fächer</option>${C.faecher.map(f => `<option value="${f.id}" ${f.id === Z.filterFach ? "selected" : ""}>${H.esc(f.name)}</option>`).join("")}</select>
          </div></div>
        ${liste.length ? `<div class="scroll"><table class="tabelle"><thead><tr><th>Klassen</th><th>Fach</th><th>Auftrag</th><th>Zeitraum</th><th class="r">Umfang</th><th class="r">≈ pro Woche</th><th>Lehrkraft</th><th></th></tr></thead><tbody>
          ${liste.map(a => { const i = R.info(a), k1 = a.klassen.length === 1 ? a.klassen[0] : null; return `<tr>
            <td>${H.esc(a.klassen.join(", "))}</td><td>${F.chip(a.fach, k1)}</td>
            <td>${F.soz(a.sozialform)} ${H.esc(a.titel)}${a.notiz ? `<div class="leise klein">${H.esc(a.notiz)}</div>` : ""}</td>
            <td class="zahl" style="white-space:nowrap">${D.tm(i.s)} – ${D.tmj(i.e)}<div class="leise klein">${i.tage} Schultage</div></td>
            <td class="r zahl">${H.std(Number(a.umfang))} Std.</td><td class="r zahl">${i.tage ? H.std(i.proTag * 5) : "–"}</td>
            <td>${H.esc(a.lehrkraft || "")}</td><td><button type="button" class="knopf leer" data-bearbeiten="${H.esc(a.id)}">Bearbeiten</button></td></tr>`; }).join("")}
          </tbody></table></div>` : `<p class="leerzustand">Keine Aufträge${Z.filterKlasse !== "alle" || Z.filterFach !== "alle" ? " für diesen Filter" : ""}.</p>`}
      </section>`;
  }

  /* ---------- Verwaltung ---------- */
  function verwaltung() {
    if (!Dt().angemeldet) return reiter("verwaltung") + anmeldung("Die Verwaltung");
    const e = R.einstellungen(), d = Dt();
    const modusText = { server: "Gemeinsame Daten auf dem Schulserver.", offline: "Keine Verbindung – angezeigt wird der zuletzt geladene Stand.", vorschau: "Vorschau ohne Server: Daten liegen nur in diesem Browser." }[d.modus];
    return `${reiter("verwaltung")}
      <div class="seitenkopf"><div><span class="eyebrow">COOLflex</span><h1>Verwaltung</h1><p class="leise">${modusText}${d.stand ? ` Stand: ${new Date(d.stand).toLocaleString("de-DE")}` : ""}</p></div></div>
      <div class="raster-2">
        <section class="karte"><h2>Zielbereich</h2>
          <form id="form-einst" class="formular" novalidate>
            <label class="feld">ab (Std./Woche)<input type="number" id="e-min" min="0" step="0.5" value="${e.min}"></label>
            <label class="feld">bis (Std./Woche)<input type="number" id="e-max" min="0" step="0.5" value="${e.max}"></label>
            <label class="feld ganz">Höchstens parallele Aufträge je Klasse<input type="number" id="e-par" min="1" step="1" value="${e.maxParallel}"></label>
            <label class="feld ganz">Ferien und freie Tage <span class="tipp">Eine Zeile je Zeitraum: TT.MM.JJJJ – TT.MM.JJJJ Name. Vorbelegt aus öffentlichen Ferienkalendern – bitte mit dem Kultusministerium abgleichen.</span>
              <textarea id="e-ferien" rows="9">${H.esc((e.ferien || []).map(f => `${D.tmj(D.vonText(f.von))} – ${D.tmj(D.vonText(f.bis))} ${f.name}`).join("\n"))}</textarea></label>
            <div class="fuss ganz"><span class="fehler" id="e-fehler" role="alert"></span><button type="submit" class="knopf haupt">Speichern</button></div>
          </form></section>
        <div class="ansicht">
          <section class="karte"><h2>Sichern und übernehmen</h2>
            <p class="leise klein">CSV für Excel, JSON als Sicherung. Eine JSON-Sicherung lässt sich hier wieder einlesen; vorhandene Aufträge bleiben unverändert.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="knopf" data-aktion="csv">Als CSV</button>
              <button type="button" class="knopf" data-aktion="json">Sicherung (JSON)</button>
              <label class="knopf" for="import-datei">Sicherung einlesen</label><input type="file" id="import-datei" accept=".json,application/json" hidden>
            </div></section>
          ${d.modus === "server" ? `<section class="karte"><h2>Passwort ändern</h2><p class="leise klein">Neuen Hash erzeugen und in <code>api/config.php</code> eintragen. Das alte Passwort gilt bis dahin weiter.</p>
            <form id="form-hash" class="formular" style="grid-template-columns:1fr" novalidate>
              <label class="feld">Neues Passwort<input type="password" id="neu-pw" autocomplete="new-password"></label>
              <div class="fuss"><span class="fehler" id="hash-fehler" role="alert"></span><button type="submit" class="knopf">Hash erzeugen</button></div>
              <textarea id="hash-ausgabe" readonly hidden rows="2"></textarea></form></section>` : ""}
          ${d.modus === "vorschau" ? `<section class="karte"><h2>Vorschau</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="knopf" data-aktion="beispiele">Beispiele laden</button><button type="button" class="knopf gefahr" data-aktion="leeren">Alle Aufträge entfernen</button></div></section>` : ""}
        </div>
      </div>`;
  }

  /* ---------- Formular Auftrag ---------- */
  const dlg = () => document.getElementById("dlg-auftrag");
  const $ = id => document.getElementById(id);
  let bearbeiteId = null, loeschStufe = 0;
  function formularOeffnen(a) {
    if (!Dt().angemeldet) { location.hash = "#auftraege"; return; }
    bearbeiteId = a ? a.id : null; loeschStufe = 0;
    $("dlg-titel").textContent = a ? "Auftrag bearbeiten" : "Auftrag eintragen";
    const vorKlasse = C.klassen.includes(Z.klasse) ? Z.klasse : C.klassen[0];
    $("a-klassen").innerHTML = C.klassen.map(k => `<label><input type="checkbox" value="${k}" ${a ? (a.klassen.includes(k) ? "checked" : "") : (k === vorKlasse ? "checked" : "")}> ${k}</label>`).join("");
    $("a-fach").innerHTML = C.faecher.map(f => `<option value="${f.id}">${H.esc(f.name)}</option>`).join("");
    $("a-soz").innerHTML = Object.entries(C.sozialformen).map(([k, v]) => `<label><input type="radio" name="soz" value="${k}" ${a && a.sozialform === k ? "checked" : ""}> <span class="soz ${k}">${k}</span> ${v}</label>`).join("") + `<label><input type="radio" name="soz" value="" ${!a || !a.sozialform ? "checked" : ""}> offen lassen</label>`;
    const start = D.zuText(D.montag(D.heute()) + 7);
    $("a-fach").value = a ? a.fach : "P1";
    $("a-titel").value = a ? a.titel : ""; $("a-lehrkraft").value = a ? a.lehrkraft || "" : "";
    $("a-start").value = a ? a.start : start; $("a-ende").value = a ? a.ende : D.zuText(D.vonText(start) + 11);
    $("a-umfang").value = a ? a.umfang : 4; $("a-notiz").value = a ? a.notiz || "" : "";
    $("a-loeschen").hidden = !a; $("a-loeschen").textContent = "Löschen"; $("a-fehler").textContent = "";
    vorschau(); dlg().showModal(); setTimeout(() => $("a-titel").focus(), 30);
  }
  function lesen() {
    return {
      id: bearbeiteId || H.neueId(),
      klassen: [...$("a-klassen").querySelectorAll("input:checked")].map(i => i.value),
      fach: $("a-fach").value, titel: $("a-titel").value.trim(), lehrkraft: $("a-lehrkraft").value.trim().toUpperCase(),
      start: $("a-start").value, ende: $("a-ende").value, umfang: Number($("a-umfang").value),
      sozialform: (document.querySelector('input[name="soz"]:checked') || {}).value || "", notiz: $("a-notiz").value.trim()
    };
  }
  function pruefen(a) {
    if (!a.klassen.length) return "Bitte mindestens eine Klasse wählen.";
    if (!a.titel) return "Bitte einen Titel eintragen.";
    if (!a.start || !a.ende) return "Bitte Start und Ende eintragen.";
    if (a.ende < a.start) return "Das Ende liegt vor dem Start.";
    if (!(a.umfang >= 0.5 && a.umfang <= 60)) return "Umfang zwischen 0,5 und 60 Stunden.";
    return "";
  }
  function vorschau() {
    const a = lesen(), box = $("a-vorschau");
    if (!a.start || !a.ende || a.ende < a.start || !(a.umfang > 0)) { box.innerHTML = `<span class="leise">Start, Ende und Umfang eintragen – dann erscheint hier die Auswirkung auf die Wochen.</span>`; return; }
    const tmp = { ...a, id: "__vorschau" + Math.random() }, i = R.info(tmp);
    if (!i.tage) { box.innerHTML = `<span class="fehler">Im Zeitraum liegt kein Schultag (Wochenende oder Ferien).</span>`; return; }
    const alle = Dt().auftraege.filter(x => x.id !== bearbeiteId).concat([tmp]);
    const zeilen = a.klassen.map(k => {
      let max = null;
      for (let mo = D.montag(i.s); mo <= i.e; mo += 7) { const st = R.woche(k, mo, alle); if (st.status !== "ferien" && (!max || st.stunden > max.st.stunden)) max = { mo, st }; }
      return max ? `<span><strong>${k}:</strong> höchste Woche KW ${D.kw(max.mo)} mit ${H.std(max.st.stunden)} Std. <span class="pille st-${max.st.status}">${R.statusText[max.st.status]}</span>${max.st.anzahl > R.einstellungen().maxParallel ? ` · ${max.st.anzahl} parallel` : ""}</span>` : "";
    });
    box.innerHTML = `<span>${i.tage} Schultage · ca. <strong class="zahl">${H.std(i.proTag * 5)} Std. pro Woche</strong> für diesen Auftrag</span>${zeilen.join("")}`;
  }
  let beschaeftigt = false;
  async function absenden(ev) {
    ev.preventDefault(); if (beschaeftigt) return;
    const a = lesen(), f = pruefen(a); if (f) { $("a-fehler").textContent = f; return; }
    beschaeftigt = true; $("a-speichern").disabled = true;
    try { await Dt().speichern(a); dlg().close(); BG.meldung(bearbeiteId ? "Auftrag gespeichert" : "Auftrag eingetragen"); }
    catch (e) { $("a-fehler").textContent = e.message; }
    finally { beschaeftigt = false; $("a-speichern").disabled = false; }
  }
  async function loeschen() {
    if (!loeschStufe) { loeschStufe = 1; $("a-loeschen").textContent = "Wirklich löschen?"; return; }
    try { await Dt().loeschen(bearbeiteId); dlg().close(); BG.meldung("Auftrag gelöscht"); } catch (e) { $("a-fehler").textContent = e.message; }
  }

  /* ---------- Export ---------- */
  function datei(name, inhalt, typ) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([inhalt], { type: typ })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function csv() {
    const z = [["Klassen", "Fach", "Titel", "Sozialform", "Start", "Ende", "Umfang (Std.)", "Schultage", "Std. pro Woche", "Lehrkraft", "Notiz"]];
    for (const a of Dt().auftraege.slice().sort((x, y) => x.start.localeCompare(y.start))) {
      const i = R.info(a);
      z.push([a.klassen.join(" "), F.kurz(a.fach, a.klassen.length === 1 ? a.klassen[0] : null), a.titel, a.sozialform ? C.sozialformen[a.sozialform] : "", D.tmj(i.s), D.tmj(i.e), H.std(+a.umfang), i.tage, i.tage ? H.std(i.proTag * 5) : "", a.lehrkraft || "", a.notiz || ""]);
    }
    return "﻿" + z.map(r => r.map(v => { v = String(v ?? ""); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(";")).join("\r\n");
  }
  function ferienLesen(text) {
    const re = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s*[-–]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(.*)$/, out = [];
    for (const z of text.split("\n").map(s => s.trim()).filter(Boolean)) {
      const m = z.match(re); if (!m) throw new Error(`Zeile nicht lesbar: „${z}“`);
      const iso = (t, mo, j) => `${j}-${String(mo).padStart(2, "0")}-${String(t).padStart(2, "0")}`;
      const von = iso(m[1], m[2], m[3]), bis = iso(m[4], m[5], m[6]);
      if (bis < von) throw new Error(`Ende vor Beginn: „${z}“`);
      out.push({ von, bis, name: (m[7] || "Ferien").slice(0, 40) });
    }
    return out;
  }

  /* ---------- Ereignisse (einmal registriert) ---------- */
  function verbinden() {
    const f = $("form-auftrag");
    f.addEventListener("input", vorschau); f.addEventListener("change", vorschau); f.addEventListener("submit", absenden);
    $("a-loeschen").addEventListener("click", loeschen);
    dlg().querySelectorAll("[data-schliessen]").forEach(b => b.addEventListener("click", () => dlg().close()));

    document.addEventListener("submit", async ev => {
      const id = ev.target.id;
      if (id === "form-anmelden") {
        ev.preventDefault();
        try { await Dt().anmelden($("pw").value); BG.meldung("Angemeldet"); } catch (e) { $("pw-fehler").textContent = e.message; }
      }
      if (id === "form-hash") {
        ev.preventDefault();
        try { const h = await Dt().passwortHash($("neu-pw").value); const out = $("hash-ausgabe"); out.hidden = false; out.value = h; out.select(); $("hash-fehler").textContent = ""; }
        catch (e) { $("hash-fehler").textContent = e.message; }
      }
      if (id === "form-einst") {
        ev.preventDefault();
        try {
          const min = Number($("e-min").value), max = Number($("e-max").value), par = Math.round(Number($("e-par").value));
          if (!(min >= 0 && max > min)) throw new Error("„bis“ muss größer sein als „ab“.");
          if (!(par >= 1)) throw new Error("Mindestens 1 paralleler Auftrag.");
          await Dt().einstellungenSpeichern({ min, max, maxParallel: par, ferien: ferienLesen($("e-ferien").value) });
          BG.meldung("Einstellungen gespeichert");
        } catch (e) { $("e-fehler").textContent = e.message; }
      }
    });
    document.addEventListener("click", async ev => {
      const t = ev.target.closest("[data-aktion],[data-bearbeiten]"); if (!t) return;
      if (t.dataset.bearbeiten) { const a = Dt().auftraege.find(x => x.id === t.dataset.bearbeiten); if (a && Dt().angemeldet) formularOeffnen(a); return; }
      const ak = t.dataset.aktion;
      if (ak === "neu") formularOeffnen(null);
      if (ak === "abmelden") { await Dt().abmelden(); BG.meldung("Abgemeldet"); }
      if (ak === "beispiele") { Dt().beispieleLaden(); BG.meldung("Beispiele geladen"); }
      if (ak === "leeren") { if (t.dataset.sicher) { Dt().vorschauLeeren(); BG.meldung("Alle Aufträge entfernt"); } else { t.dataset.sicher = "1"; t.textContent = "Wirklich alle entfernen?"; } }
      if (ak === "csv") { if (!Dt().auftraege.length) return BG.meldung("Noch keine Aufträge"); datei(`${D.zuText(D.heute())}_COOLflex-Auftraege.csv`, csv(), "text/csv"); }
      if (ak === "json") datei(`${D.zuText(D.heute())}_COOLflex-Auftraege.json`, JSON.stringify({ format: "coolflex-auftraege", version: 1, exportiert: new Date().toISOString(), einstellungen: R.einstellungen(), auftraege: Dt().auftraege }, null, 2), "application/json");
    });
    document.addEventListener("change", async ev => {
      if (ev.target.id === "import-datei") {
        const file = ev.target.files[0]; ev.target.value = ""; if (!file) return;
        try { const j = JSON.parse(await file.text()); const n = await Dt().importieren(Array.isArray(j) ? j : j.auftraege || []); BG.meldung(n ? `${n} Aufträge übernommen` : "Nichts Neues in der Datei"); }
        catch (e) { BG.meldung("Die Datei ist keine gültige Sicherung."); }
      }
    });
  }

  BG.lehrkraefte = { coolflex, ampel, fach, auftraege, verwaltung, verbinden, formularOeffnen };
})();
