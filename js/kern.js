/* Kern: Datum, Berechnung der Wochenbelastung, kleine Hilfsfunktionen.
   Ein Datum wird intern als "Tageszahl" (Tage seit 1.1.1970, UTC) geführt – so gibt es keine Probleme mit der Sommerzeit. */
(function () {
  "use strict";
  const C = BG.config;
  const TAG = 864e5;

  const D = {
    vonText(s) { const [j, m, t] = String(s).split("-").map(Number); return Math.round(Date.UTC(j, m - 1, t) / TAG); },
    zuText(n) { return new Date(n * TAG).toISOString().slice(0, 10); },
    wochentag(n) { return ((n + 4) % 7 + 7) % 7; },            // 0 = Sonntag … 6 = Samstag
    montag(n) { return n - ((D.wochentag(n) + 6) % 7); },
    kw(n) {                                                      // ISO-Kalenderwoche
      const do_ = D.montag(n) + 3;
      const jahr = new Date(do_ * TAG).getUTCFullYear();
      const w1 = D.montag(Math.round(Date.UTC(jahr, 0, 4) / TAG));
      return 1 + Math.floor((do_ - w1) / 7);
    },
    heute() { const d = new Date(); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / TAG); },
    /* Montag der aktuellen Schulwoche – am Wochenende schon die kommende Woche */
    schulwoche() { return D.montag(D.heute() + 2); },
    tm(n) { const d = new Date(n * TAG); return String(d.getUTCDate()).padStart(2, "0") + "." + String(d.getUTCMonth() + 1).padStart(2, "0") + "."; },
    tmj(n) { return D.tm(n) + new Date(n * TAG).getUTCFullYear(); },
    wochentagKurz(n) { return ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][D.wochentag(n)]; }
  };

  const zf = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
  const H = {
    std(x) { return zf.format(Math.round(x * 10) / 10); },
    esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
    neueId() { return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
    speicher: {
      lesen(k, ersatz) { try { const v = localStorage.getItem(k); return v === null ? ersatz : JSON.parse(v); } catch (e) { return ersatz; } },
      schreiben(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
    }
  };

  /* ---------- Fächer und Darstellung ---------- */
  const F = {
    farbe(id) { return (C.faecher.find(f => f.id === id) || C.faecher[0]).farbe; },
    kurz(id) { return id === "P1" ? "Profil" : id === "BVVW" ? "BV/VW" : id; },
    name(id) { return (C.faecher.find(f => f.id === id) || { name: id }).name; },
    chip(id, klasse) { return `<span class="fach" style="background:var(${F.farbe(id)})">${H.esc(F.kurz(id, klasse))}</span>`; },
    soz(s) { return s && C.sozialformen[s] ? `<span class="soz ${s}" title="${H.esc(C.sozialformen[s])}">${s}</span>` : ""; }
  };

  /* ---------- Berechnung ---------- */
  let ferienTage = new Set(), ferienName = new Map(), einst = C.einstellungen;
  const cache = new Map();

  const R = {
    setzeEinstellungen(e) {
      einst = e; ferienTage = new Set(); ferienName = new Map(); cache.clear();
      for (const f of e.ferien || []) {
        const a = D.vonText(f.von), b = D.vonText(f.bis);
        for (let n = a; n <= b; n++) { ferienTage.add(n); ferienName.set(n, f.name || "Ferien"); }
      }
    },
    einstellungen() { return einst; },
    istFerien(n) { return ferienTage.has(n); },
    ferienName(n) { return ferienName.get(n) || "Ferien"; },
    istSchultag(n) { const w = D.wochentag(n); return w >= 1 && w <= 5 && !ferienTage.has(n); },

    /* Schultage und Stunden pro Schultag eines Auftrags */
    info(a) {
      const schl = a.id + "|" + a.start + "|" + a.ende + "|" + a.umfang;
      const c = cache.get(schl); if (c) return c;
      const s = D.vonText(a.start), e = D.vonText(a.ende); let tage = 0;
      for (let n = s; n <= e; n++) if (R.istSchultag(n)) tage++;
      const r = { s, e, tage, proTag: tage ? Number(a.umfang) / tage : 0 };
      cache.set(schl, r); return r;
    },

    /* Belastung einer Klasse in der Woche ab Montag mo */
    woche(klasse, mo, auftraege) {
      let stunden = 0, schultage = 0; const liste = [];
      for (let n = mo; n < mo + 5; n++) if (R.istSchultag(n)) schultage++;
      for (const a of auftraege) {
        if (klasse && !(a.klassen || []).includes(klasse)) continue;
        const i = R.info(a); if (i.e < mo || i.s > mo + 4) continue;
        let anteil = 0, aktiv = false;
        for (let n = Math.max(mo, i.s); n <= Math.min(mo + 4, i.e); n++) if (R.istSchultag(n)) { anteil += i.proTag; aktiv = true; }
        if (aktiv) { stunden += anteil; liste.push({ a, anteil }); }
      }
      return { stunden, schultage, anzahl: liste.length, liste, status: R.status(stunden, schultage) };
    },
    korridor(schultage) { const f = schultage / 5; return { min: einst.min * f, max: einst.max * f }; },
    status(stunden, schultage) {
      if (schultage === 0) return "ferien";
      if (stunden < 0.05) return "leer";
      const k = R.korridor(schultage);
      if (stunden < k.min - 0.05) return "wenig";
      if (stunden > k.max + 0.05) return "viel";
      return "ok";
    },
    statusText: { leer: "nichts geplant", wenig: "Platz frei", ok: "passend", viel: "zu viel", ferien: "Ferien" },

    /* Automatische Hinweise für das Dashboard */
    hinweise(auftraege, abMontag, wochen) {
      const out = [];
      for (let w = 0; w < wochen; w++) {
        const mo = abMontag + w * 7;
        for (const k of C.klassen) {
          const st = R.woche(k, mo, auftraege);
          if (st.status === "viel") out.push({ art: "viel", k, mo, text: `${k}, KW ${D.kw(mo)}: ${H.std(st.stunden - R.korridor(st.schultage).max)} Std. zu viel` });
          if (st.anzahl > einst.maxParallel) out.push({ art: "viel", k, mo, text: `${k}, KW ${D.kw(mo)}: ${st.anzahl} Aufträge gleichzeitig` });
        }
      }
      const heute = D.heute(), mo = D.schulwoche();
      const faellig = auftraege.filter(a => { const e = D.vonText(a.ende); return e >= heute && e <= mo + 6; });
      if (faellig.length) out.push({ art: "info", text: `Diese Woche fällig: ${faellig.length} ${faellig.length === 1 ? "Abgabe" : "Abgaben"}` });
      for (const k of C.klassen) {
        const st = R.woche(k, mo, auftraege);
        if (st.status === "wenig" || st.status === "leer") out.push({ art: "wenig", k, mo, text: `${k}, diese Woche: noch Platz für ${H.std(R.korridor(st.schultage).min - st.stunden)}–${H.std(R.korridor(st.schultage).max - st.stunden)} Std.` });
      }
      return out;
    }
  };

  /* ---------- Beispieldaten für die Vorschau ---------- */
  function beispiele() {
    const M = D.montag(D.heute()), d = k => D.zuText(M + k);
    let i = 0;
    const b = (klassen, fach, titel, soz, a, e, umfang) => ({ id: "bsp" + (i++) + Date.now().toString(36), klassen, fach, titel, sozialform: soz, start: d(a), ende: d(e), umfang, lehrkraft: "", notiz: "Beispiel" });
    return [
      b(["11A", "11B"], "P1", "Fallstudie Marktanalyse", "A", -7, 4, 5),
      b(["11A", "11B", "11C", "11D"], "DE", "Erörterung: Social Media", "B", 0, 11, 4),
      b(["11A"], "EN", "Podcast: Future of Work", "A", 7, 25, 5),
      b(["11A"], "BIF", "HTML-Steckbrief", "C", -4, 8, 3),
      b(["11B"], "BIF", "Tabellenkalkulation", "B", 0, 4, 3),
      b(["11B"], "EN", "Job Application", "B", 0, 11, 3),
      b(["11B"], "BVVW", "Wirtschaftskreislauf", "A", 3, 11, 3),
      b(["11C"], "P1", "Beobachtungsbogen Kita", "C", 7, 32, 6),
      b(["11C", "11D"], "BIF", "Datenbank-Quiz", "B", 14, 18, 2),
      b(["11D"], "P1", "Bodenprobe auswerten", "A", -3, 15, 6),
      b(["11D"], "EN", "Short Story Analysis", "B", 17, 32, 4)
    ];
  }

  Object.assign(BG, { D, H, F, R, beispiele });
  R.setzeEinstellungen(C.einstellungen);
})();
