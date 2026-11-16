/* Datenzugriff.
   Modus "server":   api.php antwortet – gemeinsame Daten für alle.
   Modus "offline":  Server war schon erreichbar, ist es gerade nicht – zuletzt geladene Daten werden gezeigt.
   Modus "vorschau": Kein Server (z. B. Datei lokal geöffnet oder GitHub Pages) – Daten bleiben in diesem Browser. */
(function () {
  "use strict";
  const { H, R } = BG;
  const C = BG.config;
  const K = { cache: "bg-cache-daten", vorschau: "bg-vorschau-auftraege", vorschauEinst: "bg-vorschau-einstellungen", warServer: "bg-war-server", portal: "bg-cache-portal" };
  const zuhoerer = [];

  async function api(aktion, nutzlast) {
    const opt = { credentials: "same-origin", headers: { "Accept": "application/json" } };
    if (nutzlast !== undefined) { opt.method = "POST"; opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(nutzlast); }
    const antwort = await fetch(C.api + "?aktion=" + encodeURIComponent(aktion), opt);
    let json = null;
    try { json = await antwort.json(); } catch (e) { throw Object.assign(new Error("Keine gültige Antwort vom Server."), { keinServer: true }); }
    if (!antwort.ok || !json.ok) throw Object.assign(new Error(json.fehler || "Fehler " + antwort.status), { status: antwort.status });
    return json;
  }
  function einstellungenNormal(e) {
    const s = structuredClone(C.einstellungen);
    if (!e || typeof e !== "object") return s;
    if (Number.isFinite(+e.min)) s.min = +e.min;
    if (Number.isFinite(+e.max)) s.max = +e.max;
    if (Number.isFinite(+e.maxParallel)) s.maxParallel = +e.maxParallel;
    if (Array.isArray(e.ferien)) s.ferien = e.ferien.filter(f => f && /^\d{4}-\d\d-\d\d$/.test(f.von) && /^\d{4}-\d\d-\d\d$/.test(f.bis));
    return s;
  }
  const gueltig = a => a && a.id && Array.isArray(a.klassen) && /^\d{4}-\d\d-\d\d$/.test(a.start || "") && /^\d{4}-\d\d-\d\d$/.test(a.ende || "") && Number(a.umfang) > 0;

  const Daten = {
    modus: "laden", auftraege: [], einstellungen: structuredClone(C.einstellungen),
    angemeldet: false, passwortEingerichtet: true, https: true, stand: null,
    portal: H.speicher.lesen(K.portal, null),   // zuletzt geladene Portal-Inhalte, damit beim Start nichts aufblitzt

    beimAendern(fn) { zuhoerer.push(fn); },
    melden() { R.setzeEinstellungen(this.einstellungen); zuhoerer.forEach(fn => fn()); },

    async start() {
      this.portal = await this.ladePortal();
      try {
        const [d, s] = await Promise.all([api("daten"), api("status")]);
        this.uebernehmen(d); this.modus = "server";
        this.angemeldet = s.angemeldet; this.passwortEingerichtet = s.passwortEingerichtet; this.https = s.https;
        H.speicher.schreiben(K.warServer, true);
        H.speicher.schreiben(K.cache, d);
      } catch (e) {
        const cache = H.speicher.lesen(K.cache, null);
        if (H.speicher.lesen(K.warServer, false) && cache) {
          this.uebernehmen(cache); this.modus = "offline";
        } else {
          this.modus = "vorschau";
          this.auftraege = H.speicher.lesen(K.vorschau, []).filter(gueltig);
          this.einstellungen = einstellungenNormal(H.speicher.lesen(K.vorschauEinst, null));
          this.angemeldet = H.speicher.lesen("bg-vorschau-angemeldet", false);
        }
      }
      this.melden();
    },
    uebernehmen(d) {
      this.auftraege = (d.auftraege || []).filter(gueltig);
      this.einstellungen = einstellungenNormal(d.einstellungen);
      this.stand = d.stand || null;
    },
    async neuLaden() {
      if (this.modus === "vorschau") return;
      try { const d = await api("daten"); this.uebernehmen(d); this.modus = "server"; H.speicher.schreiben(K.cache, d); this.melden(); }
      catch (e) { /* bleibt beim bisherigen Stand */ }
    },
    async ladePortal() {
      try {
        const r = await fetch("config/portal.json", { cache: "no-cache" });
        const j = await r.json(); H.speicher.schreiben(K.portal, j); return j;
      } catch (e) { return H.speicher.lesen(K.portal, { titel: "Berufliches Gymnasium", gruppen: [], kacheln: [], hinweise: [], fusszeile: [] }); }
    },

    /* ---------- Schreiben ---------- */
    vorschauSichern() { H.speicher.schreiben(K.vorschau, this.auftraege); H.speicher.schreiben(K.vorschauEinst, this.einstellungen); },
    pruefeSchreiben() { if (this.modus === "offline") throw new Error("Gerade keine Verbindung zum Server. Bitte später erneut versuchen."); },

    async anmelden(passwort) {
      if (this.modus === "vorschau") { this.angemeldet = true; H.speicher.schreiben("bg-vorschau-angemeldet", true); this.melden(); return; }
      this.pruefeSchreiben();
      await api("anmelden", { passwort }); this.angemeldet = true; this.melden();
      await this.neuLaden();   // erst angemeldet liefert der Server die Kürzel der Lehrkräfte mit
    },
    async abmelden() {
      if (this.modus === "vorschau") { this.angemeldet = false; H.speicher.schreiben("bg-vorschau-angemeldet", false); this.melden(); return; }
      try { await api("abmelden", {}); } catch (e) { }
      this.angemeldet = false; this.melden();
      await this.neuLaden();   // Kürzel wieder aus dem Zwischenspeicher dieses Geräts entfernen
    },
    async speichern(a) {
      if (this.modus === "vorschau") {
        const i = this.auftraege.findIndex(x => x.id === a.id);
        if (i >= 0) this.auftraege[i] = a; else this.auftraege.push(a);
        this.vorschauSichern(); this.melden(); return;
      }
      this.pruefeSchreiben();
      try { await api("auftrag_speichern", { auftrag: a }); }
      catch (e) { if (e.status === 401) { this.angemeldet = false; this.melden(); } throw e; }
      await this.neuLaden();
    },
    async loeschen(id) {
      if (this.modus === "vorschau") { this.auftraege = this.auftraege.filter(x => x.id !== id); this.vorschauSichern(); this.melden(); return; }
      this.pruefeSchreiben();
      await api("auftrag_loeschen", { id }); await this.neuLaden();
    },
    async einstellungenSpeichern(e) {
      if (this.modus === "vorschau") { this.einstellungen = e; this.vorschauSichern(); this.melden(); return; }
      this.pruefeSchreiben();
      await api("einstellungen", { einstellungen: e }); await this.neuLaden();
    },
    async importieren(liste) {
      const neu = liste.filter(gueltig).filter(a => !this.auftraege.some(x => x.id === a.id));
      if (this.modus === "vorschau") { this.auftraege.push(...neu); this.vorschauSichern(); this.melden(); return neu.length; }
      this.pruefeSchreiben();
      const r = await api("import", { auftraege: neu }); await this.neuLaden(); return r.neu;
    },
    async passwortHash(passwort) {
      if (this.modus === "vorschau") throw new Error("Der Hash wird auf dem Server erzeugt. In der Vorschau ohne Server geht das nicht.");
      return (await api("passwort_hash", { passwort })).hash;
    },
    beispieleLaden() { if (this.modus !== "vorschau") return; this.auftraege = BG.beispiele(); this.vorschauSichern(); this.melden(); },
    vorschauLeeren() { if (this.modus !== "vorschau") return; this.auftraege = []; this.vorschauSichern(); this.melden(); }
  };

  BG.Daten = Daten;

  /* COOLflex-Schalter: config/portal.json → "coolflex": { "sichtbar_ab": "JJJJ-MM-TT" }.
     Vorher sehen Lernende weder die COOLflex-Woche noch "Meine Klasse"; der Lehrkräfte-Bereich
     ist nur über den direkten Link (…/#coolflex) erreichbar. Fehlt der Eintrag, ist COOLflex an. */
  BG.coolflexAktiv = function () {
    const p = Daten.portal;
    if (!p) return false;                      // noch nichts geladen: lieber nichts zeigen als aufblitzen
    const c = p.coolflex;
    if (!c || !c.sichtbar_ab) return true;
    return BG.D.heute() >= BG.D.vonText(c.sichtbar_ab);
  };
})();
