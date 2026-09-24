import { useEffect, useRef, useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../lib/api.js";
import Icoon from "../components/Icoon.jsx";
import { Rugnummer } from "../components/Merk.jsx";
import RitFormulier from "./RitFormulier.jsx";
import Blad from "../components/Blad.jsx";
import { welkomTekst, openMail, welkomWhatsApp, toonMobiel } from "../lib/mail.js";
import { TypeChip } from "../components/RitKaartje.jsx";
import { datumLang, eindMoment, tijdAgo } from "../lib/tijd.js";
import { km } from "../lib/gpx.js";

function Cijferslot({ onOpen }) {
  const [code, setCode] = useState("");
  const [fout, setFout] = useState("");
  const [schud, setSchud] = useState(false);
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);

  async function probeer(c = code) {
    if (c.length < 4 || bezig) return;
    setBezig(true); setFout("");
    try {
      const r = await api("admin/ontgrendel", { methode: "POST", body: { code: c } });
      setOpen(true);
      if (navigator.vibrate) navigator.vibrate([12, 40, 12]);
      setTimeout(() => onOpen(r), 650);
    } catch (e) {
      setFout(e.message); setSchud(true); setCode("");
      if (navigator.vibrate) navigator.vibrate(120);
      setTimeout(() => setSchud(false), 500);
    }
    setBezig(false);
  }
  const druk = (n) => { if (code.length < 8) setCode(code + n); };

  useEffect(() => {
    const k = (e) => {
      if (/^\d$/.test(e.key)) druk(e.key);
      else if (e.key === "Backspace") setCode((c) => c.slice(0, -1));
      else if (e.key === "Enter") probeer();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  return (
    <div className="pagina slotpagina">
      <div className={`slot ${open ? "open" : ""} ${schud ? "schud" : ""}`}>
        <svg viewBox="0 0 120 150" className="slot-beugel" aria-hidden="true">
          <path className="beugel" d="M30 70 V45 a30 30 0 0 1 60 0 V70" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
          <rect x="12" y="66" width="96" height="78" rx="16" fill="currentColor" />
          <circle cx="60" cy="100" r="9" fill="#0c0d0f" /><rect x="56" y="104" width="8" height="18" rx="4" fill="#0c0d0f" />
        </svg>
        <h1>Admin</h1>
        <p className="klein">Toets de admincode in.</p>
        <div className="codepunten" aria-live="polite" aria-label={`${code.length} cijfers ingevoerd`}>
          {Array.from({ length: Math.max(4, code.length) }).map((_, i) => <i key={i} className={i < code.length ? "vol" : ""} />)}
        </div>
        {fout && <div className="melding fout"><Icoon naam="let" />{fout}</div>}
        <div className="toetsen">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => <button key={n} onClick={() => druk(n)} className="tab">{n}</button>)}
          <button onClick={() => setCode(code.slice(0, -1))} aria-label="Wis"><Icoon naam="terug" /></button>
          <button onClick={() => druk("0")} className="tab">0</button>
          <button className="ok" onClick={() => probeer()} disabled={code.length < 4 || bezig} aria-label="Openen"><Icoon naam="open" /></button>
        </div>
      </div>
    </div>
  );
}

// Na accepteren of een nieuwe code: de code groot in beeld, en de admin kiest hoe het bericht verstuurd wordt.
function CodeKaart({ gegevens, onKlaar }) {
  const { lid } = useApp();
  const volledig = { ...gegevens, afzender: lid.naam !== "Admin" ? lid.naam : "" };
  const [verstuurd, setVerstuurd] = useState({});
  const [gekopieerd, setGekopieerd] = useState(false);
  const voornaam = gegevens.naam.split(" ")[0];
  const zet = (k) => setVerstuurd((v) => ({ ...v, [k]: true }));
  const kaart = useRef(null);
  useEffect(() => { setTimeout(() => kaart.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); }, []);
  return (
    <div className="kaart pad codekaart" ref={kaart} style={{ scrollMarginTop: 16 }}>
      <div className="label">{gegevens.nieuweCode ? "Nieuwe code voor" : "Toegelaten:"} {gegevens.naam}</div>
      <div className="code-cijfers tab" aria-label={`Code ${gegevens.code}`}>
        {gegevens.code.split("").map((c, i) => <span key={i}>{c}</span>)}
      </div>
      <p className="klein" style={{ margin: "0 0 12px" }}>Stuur {voornaam} het welkomstbericht met de code en de link naar de handleiding. Kies hoe. Het bericht staat klaar, je drukt alleen nog op verzenden.</p>
      <div className="verstuurkeuze">
        <a className={`verstuurknop-groot wa ${verstuurd.wa ? "gedaan" : ""}`} href={welkomWhatsApp(volledig)} target="_blank" rel="noreferrer" onClick={() => zet("wa")}>
          <Icoon naam={verstuurd.wa ? "vink" : "chat"} />
          <b>WhatsApp</b>
          <span className="klein">{gegevens.mobiel ? toonMobiel(gegevens.mobiel) : "je kiest zelf het gesprek"}</span>
        </a>
        <button type="button" className={`verstuurknop-groot mail ${verstuurd.mail ? "gedaan" : ""}`} onClick={() => { zet("mail"); openMail(volledig); }}>
          <Icoon naam={verstuurd.mail ? "vink" : "mail"} />
          <b>Mail</b>
          <span className="klein">{gegevens.email}</span>
        </button>
      </div>
      <div className="knoppenrij" style={{ marginTop: 10 }}>
        <button className="knop klein" onClick={async () => { try { await navigator.clipboard.writeText(welkomTekst(volledig)); setGekopieerd(true); } catch {} }}><Icoon naam={gekopieerd ? "vink" : "kopie"} />{gekopieerd ? "Gekopieerd" : "Kopieer bericht"}</button>
        <button className="knop klein stil" onClick={onKlaar}>Klaar</button>
      </div>
    </div>
  );
}

function Aanvragen({ onAantal }) {
  const [lijst, setLijst] = useState(null);
  const [gekozen, setGekozen] = useState(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [resultaat, setResultaat] = useState(null);
  const [afwijzen, setAfwijzen] = useState(false);

  const laad = () => api("admin/aanvragen").then((r) => { setLijst(r.aanvragen); onAantal(r.aanvragen.length); }).catch((e) => setFout(e.message));
  useEffect(() => { laad(); }, []);

  async function accepteer() {
    setBezig(true); setFout("");
    try {
      const r = await api(`admin/aanvragen/${gekozen.id}/accepteer`, { methode: "POST" });
      setResultaat({ naam: r.lid.naam, email: r.lid.email, mobiel: r.lid.mobiel, code: r.code });
      setGekozen(null); laad();
    } catch (e) { setFout(e.message); laad(); }
    setBezig(false);
  }
  async function wijsAf() {
    if (!afwijzen) { setAfwijzen(true); return; }
    setBezig(true);
    try { await api(`admin/aanvragen/${gekozen.id}`, { methode: "DELETE" }); setGekozen(null); laad(); } catch (e) { setFout(e.message); }
    setBezig(false); setAfwijzen(false);
  }

  return (
    <div>
      {resultaat && <CodeKaart gegevens={resultaat} onKlaar={() => setResultaat(null)} />}
      {fout && <div className="melding fout"><Icoon naam="let" />{fout}</div>}
      {!lijst && <div className="skelet" style={{ height: 160 }} />}
      {lijst && !lijst.length && !resultaat && (
        <div className="leeg">
          <Icoon naam="bel" className="i26" />
          <h3>Geen nieuwe aanvragen</h3>
          <p className="klein">Iemand die op de startpagina op Meedoen tikt, verschijnt hier. Je krijgt dan ook een melding.</p>
        </div>
      )}
      <div className="ledenlijst">
        {lijst?.map((a) => (
          <button key={a.id} className="lidrij klikbaar" onClick={() => { setGekozen(a); setAfwijzen(false); setFout(""); }}>
            <span className="aanvraag-avatar">{a.naam.slice(0, 1).toUpperCase()}</span>
            <div className="lid-info">
              <b>{a.naam}<em className="rolbadge nieuw">nieuw</em></b>
              <span className="klein">{a.email} · {tijdAgo(a.tijd)}</span>
            </div>
            <Icoon naam="verder" className="i18 grijs" />
          </button>
        ))}
      </div>

      <Blad open={!!gekozen} onSluit={() => setGekozen(null)} titel={gekozen?.naam || ""} label="Aanvraag om mee te doen">
        {gekozen && (
          <div>
            <dl className="gegevens">
              <div><dt>E-mailadres</dt><dd>{gekozen.email}</dd></div>
              {gekozen.mobiel && <div><dt>Mobiel</dt><dd className="tab">{toonMobiel(gekozen.mobiel)}</dd></div>}
              <div><dt>Aangevraagd</dt><dd>{new Date(gekozen.tijd).toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</dd></div>
              {gekozen.fietsen?.length > 0 && <div><dt>Fietst op</dt><dd>{gekozen.fietsen.map((f) => <TypeChip key={f} type={f} />)}</dd></div>}
              {gekozen.bericht && <div><dt>Bericht</dt><dd className="bericht">“{gekozen.bericht}”</dd></div>}
            </dl>
            <p className="klein">Bij <b>Accepteren</b> maakt de app een persoonlijke code van 8 cijfers. Daarna kies je of je het welkomstbericht via WhatsApp of mail stuurt.</p>
            <div className="keuze2">
              <button className="knop primair" onClick={accepteer} disabled={bezig}><Icoon naam="vink" />Accepteren</button>
              <button className={`knop ${afwijzen ? "gevaar" : ""}`} onClick={wijsAf} disabled={bezig}><Icoon naam="kruis" />{afwijzen ? "Zeker afwijzen?" : "Afwijzen"}</button>
            </div>
            {afwijzen && <p className="klein" style={{ marginTop: 10 }}>De aanvraag wordt verwijderd. Er gaat geen bericht naar de aanvrager.</p>}
          </div>
        )}
      </Blad>
    </div>
  );
}

function Leden() {
  const { lid } = useApp();
  const [leden, setLeden] = useState(null);
  const [ritten, setRitten] = useState([]);
  const [nieuw, setNieuw] = useState(null);
  const [melding, setMelding] = useState(null);
  const [resultaat, setResultaat] = useState(null);
  const [gekozen, setGekozen] = useState(null);
  const [bewerk, setBewerk] = useState(null);
  const [bevestig, setBevestig] = useState(null);
  const [bezig, setBezig] = useState(false);
  const [zoek, setZoek] = useState("");

  const laad = () => api("admin/leden").then((r) => setLeden(r.leden)).catch((e) => setMelding({ fout: e.message }));
  useEffect(() => { laad(); api("ritten").then((r) => setRitten(r.ritten)).catch(() => {}); }, []);

  async function voegToe(e) {
    e.preventDefault();
    setMelding(null); setBezig(true);
    try {
      const r = await api("admin/leden", { methode: "POST", body: { naam: nieuw.naam, email: nieuw.email, mobiel: nieuw.mobiel, rol: nieuw.rol } });
      setResultaat({ naam: r.lid.naam, email: r.lid.email, mobiel: r.lid.mobiel, code: r.code });
      setNieuw(null); laad();
    } catch (err) { setMelding({ fout: err.message }); }
    setBezig(false);
  }

  async function nieuweCode() {
    if (bevestig !== "code") { setBevestig("code"); return; }
    setBezig(true);
    try {
      const r = await api(`admin/leden/${gekozen.id}/nieuwecode`, { methode: "POST" });
      setResultaat({ naam: r.lid.naam, email: r.lid.email, mobiel: r.lid.mobiel, code: r.code, nieuweCode: true });
      setGekozen(null); setBevestig(null); laad();
    } catch (err) { setMelding({ fout: err.message }); setGekozen(null); }
    setBezig(false);
  }

  async function verwijder() {
    if (bevestig !== "weg") { setBevestig("weg"); return; }
    setBezig(true);
    try { await api(`admin/leden/${gekozen.id}`, { methode: "DELETE" }); setMelding({ ok: `${gekozen.naam} is verwijderd.` }); setGekozen(null); setBevestig(null); laad(); }
    catch (err) { setMelding({ fout: err.message }); }
    setBezig(false);
  }

  async function bewaarBewerk(e) {
    e.preventDefault();
    setBezig(true);
    try {
      await api(`admin/leden/${bewerk.id}`, { methode: "PUT", body: { naam: bewerk.naam, email: bewerk.email, mobiel: bewerk.mobiel || "", rugnummer: bewerk.rugnummer, rol: bewerk.rol } });
      setMelding({ ok: `${bewerk.naam} is bijgewerkt.` });
      setBewerk(null); setGekozen(null); laad();
    } catch (err) { setMelding({ fout: err.message }); }
    setBezig(false);
  }

  const statsVan = (id) => {
    const nu = new Date();
    const gereden = ritten.filter((r) => eindMoment(r) < nu && r.aanmeldingen.some((a) => a.lidId === id && a.status === "ja"));
    const komend = ritten.filter((r) => eindMoment(r) >= nu && r.aanmeldingen.some((a) => a.lidId === id && a.status === "ja"));
    return { gereden: gereden.length, km: Math.round(gereden.reduce((s, r) => s + (r.route?.afstand || 0), 0) / 1000), komend: komend.length };
  };
  const zichtbaar = (leden || []).filter((l) => !zoek || `${l.naam} ${l.email} ${l.rugnummer}`.toLowerCase().includes(zoek.toLowerCase()));
  const echt = (leden || []).filter((l) => !l.demo).length;

  return (
    <div>
      {melding && <div className={`melding ${melding.ok ? "ok" : "fout"}`}><Icoon naam={melding.ok ? "vink" : "let"} />{melding.ok || melding.fout}</div>}
      {resultaat && <CodeKaart gegevens={resultaat} onKlaar={() => setResultaat(null)} />}

      {!nieuw ? (
        <button className="knop primair vol" onClick={() => { setNieuw({ naam: "", email: "", mobiel: "", rol: "lid" }); setResultaat(null); }}><Icoon naam="plus" />Fietser toevoegen</button>
      ) : (
        <form className="kaart pad" onSubmit={voegToe}>
          <h3 style={{ marginBottom: 6 }}>Nieuwe fietser</h3>
          <p className="klein" style={{ marginTop: 0 }}>De app maakt een code van 8 cijfers. Daarna stuur je het welkomstbericht via WhatsApp of mail.</p>
          <label className="veld"><span>Naam</span><input className="invoer" required value={nieuw.naam} onChange={(e) => setNieuw({ ...nieuw, naam: e.target.value })} autoFocus /></label>
          <label className="veld"><span>E-mailadres</span><input className="invoer" type="email" required value={nieuw.email} onChange={(e) => setNieuw({ ...nieuw, email: e.target.value })} /></label>
          <label className="veld"><span>Mobiel nummer (optioneel, voor WhatsApp)</span><input className="invoer tab" type="tel" inputMode="tel" autoComplete="off" value={nieuw.mobiel} onChange={(e) => setNieuw({ ...nieuw, mobiel: e.target.value })} placeholder="06 12345678" /></label>
          <label className="schakelaar"><input type="checkbox" checked={nieuw.rol === "admin"} onChange={(e) => setNieuw({ ...nieuw, rol: e.target.checked ? "admin" : "lid" })} /><span />Ook organisatie (admin)</label>
          <div className="knoppenrij" style={{ marginTop: 14 }}>
            <button className="knop primair" disabled={bezig}>Toevoegen</button>
            <button type="button" className="knop stil" onClick={() => setNieuw(null)}>Annuleren</button>
          </div>
        </form>
      )}

      <div className="leden-kop">
        <span className="label tab">{echt} {echt === 1 ? "fietser" : "fietsers"} doen mee</span>
        {leden?.length > 6 && <input className="invoer zoekveld" placeholder="Zoek op naam of nummer" value={zoek} onChange={(e) => setZoek(e.target.value)} />}
      </div>
      <div className="ledenlijst">
        {!leden && <div className="skelet" style={{ height: 200 }} />}
        {zichtbaar.map((l) => (
          <button key={l.id} className="lidrij klikbaar" onClick={() => { setGekozen(l); setBevestig(null); setBewerk(null); }}>
            <Rugnummer nummer={l.rugnummer} schaal={0.85} demo={l.demo} />
            <div className="lid-info">
              <b>{l.naam}{l.rol === "admin" && <em className="rolbadge">admin</em>}{l.demo && <em className="rolbadge demo">demo</em>}</b>
              <span className="klein">{l.demo ? "voorbeeldrenner, kan niet inloggen" : l.email}{l.wachtwoordStandaard && !l.demo ? " · code nog niet gewijzigd" : ""}</span>
            </div>
            <Icoon naam="verder" className="i18 grijs" />
          </button>
        ))}
      </div>

      <Blad open={!!gekozen} onSluit={() => { setGekozen(null); setBewerk(null); setBevestig(null); }} titel={gekozen?.naam || ""} label={gekozen ? `Rugnummer ${gekozen.rugnummer}` : ""}>
        {gekozen && !bewerk && (() => {
          const st = statsVan(gekozen.id);
          return (
            <div>
              <dl className="gegevens">
                <div><dt>E-mailadres</dt><dd>{gekozen.demo ? "voorbeeldrenner" : gekozen.email}</dd></div>
                {gekozen.mobiel && <div><dt>Mobiel</dt><dd className="tab">{toonMobiel(gekozen.mobiel)}</dd></div>}
                <div><dt>Rol</dt><dd>{gekozen.rol === "admin" ? "Organisatie (admin)" : "Fietser"}</dd></div>
                {gekozen.fietsen?.length > 0 && <div><dt>Fietst op</dt><dd>{gekozen.fietsen.map((f) => <TypeChip key={f} type={f} />)}</dd></div>}
                <div><dt>Doet mee sinds</dt><dd>{gekozen.aangemaakt ? new Date(gekozen.aangemaakt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "onbekend"}</dd></div>
                <div><dt>Ritten</dt><dd className="tab">{st.gereden} gereden · {st.km} km · {st.komend} aangemeld</dd></div>
                <div><dt>Inloggen</dt><dd>{gekozen.demo ? "kan niet inloggen" : gekozen.wachtwoordStandaard ? "met de code uit de mail" : "met een eigen wachtwoord"}</dd></div>
              </dl>
              {!gekozen.demo && (
                <>
                  <button className={`knop vol ${bevestig === "code" ? "primair" : ""}`} onClick={nieuweCode} disabled={bezig}><Icoon naam="mail" />{bevestig === "code" ? "Ja, maak een nieuwe code" : "Nieuwe code sturen"}</button>
                  {bevestig === "code" && <p className="klein" style={{ margin: "8px 0 0" }}>De huidige code of het eigen wachtwoord van {gekozen.naam.split(" ")[0]} werkt daarna niet meer.</p>}
                </>
              )}
              <div className="keuze2" style={{ marginTop: 10 }}>
                <button className="knop" onClick={() => setBewerk({ ...gekozen })}><Icoon naam="bewerk" />Bewerken</button>
                {gekozen.id !== lid.id && <button className={`knop ${bevestig === "weg" ? "gevaar" : ""}`} onClick={verwijder} disabled={bezig}><Icoon naam="prullenbak" />{bevestig === "weg" ? "Zeker?" : "Verwijderen"}</button>}
              </div>
            </div>
          );
        })()}
        {gekozen && bewerk && (
          <form onSubmit={bewaarBewerk}>
            <div className="rij2">
              <label className="veld"><span>Naam</span><input className="invoer" value={bewerk.naam} onChange={(e) => setBewerk({ ...bewerk, naam: e.target.value })} /></label>
              <label className="veld"><span>Rugnummer</span><input className="invoer" type="number" min={1} max={999} value={bewerk.rugnummer} onChange={(e) => setBewerk({ ...bewerk, rugnummer: e.target.value })} /></label>
            </div>
            {!bewerk.demo && <label className="veld"><span>E-mailadres</span><input className="invoer" type="email" value={bewerk.email} onChange={(e) => setBewerk({ ...bewerk, email: e.target.value })} /></label>}
            {!bewerk.demo && <label className="veld"><span>Mobiel nummer (optioneel)</span><input className="invoer tab" type="tel" inputMode="tel" value={toonMobiel(bewerk.mobiel) || bewerk.mobiel || ""} onChange={(e) => setBewerk({ ...bewerk, mobiel: e.target.value })} placeholder="06 12345678" /></label>}
            {bewerk.id !== lid.id && !bewerk.demo && <label className="schakelaar"><input type="checkbox" checked={bewerk.rol === "admin"} onChange={(e) => setBewerk({ ...bewerk, rol: e.target.checked ? "admin" : "lid" })} /><span />Organisatie (admin)</label>}
            <div className="keuze2" style={{ marginTop: 14 }}>
              <button className="knop primair" disabled={bezig}>Opslaan</button>
              <button type="button" className="knop stil" onClick={() => setBewerk(null)}>Terug</button>
            </div>
          </form>
        )}
      </Blad>
    </div>
  );
}

function RittenBeheer() {
  const { ga } = useApp();
  const [ritten, setRitten] = useState(null);
  const [bevestig, setBevestig] = useState(null);
  const laad = () => api("ritten").then((r) => setRitten(r.ritten));
  useEffect(() => { laad(); }, []);
  async function verwijder(r) {
    if (bevestig !== r.id) { setBevestig(r.id); setTimeout(() => setBevestig((b) => (b === r.id ? null : b)), 3500); return; }
    await api(`admin/ritten/${r.id}`, { methode: "DELETE" });
    setBevestig(null); laad();
  }
  const nu = new Date();
  return (
    <div>
      <button className="knop primair vol" onClick={() => ga("/admin/rit/nieuw")}><Icoon naam="plus" />Nieuwe rit plannen</button>
      <div className="ledenlijst">
        {!ritten && <div className="skelet" style={{ height: 200 }} />}
        {ritten && !ritten.length && <p className="klein">Nog geen ritten.</p>}
        {ritten?.slice().reverse().map((r) => (
          <div key={r.id} className={`lidrij ${eindMoment(r) < nu ? "oud" : ""}`}>
            <TypeChip type={r.type} />
            <div className="lid-info">
              <b>{r.titel}{r.demo && <em className="rolbadge demo">demo</em>}</b>
              <span className="klein tab">{datumLang(r.datum)} · {r.starttijd} · {km(r.route?.afstand || 0, 0)} km · {r.aanmeldingen.filter((a) => a.status === "ja").length} mee</span>
            </div>
            <div className="lid-knoppen">
              <button className="icoonknop" onClick={() => ga(`/admin/rit/${r.id}`)} aria-label="Bewerken"><Icoon naam="bewerk" /></button>
              <button className={`icoonknop ${bevestig === r.id ? "bevestig" : ""}`} onClick={() => verwijder(r)} aria-label="Verwijderen">{bevestig === r.id ? <span>Zeker?</span> : <Icoon naam="prullenbak" />}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Alle foto's uit het peloton, zodat de organisatie een ongepaste foto snel kan weghalen.
function FotoBeheer() {
  const [fotos, setFotos] = useState(null);
  const [gekozen, setGekozen] = useState(null);
  const [zeker, setZeker] = useState(false);
  const [fout, setFout] = useState("");
  const [alle, setAlle] = useState(false);
  const laad = () => api("admin/fotos").then((r) => setFotos(r.fotos)).catch((e) => setFout(e.message));
  useEffect(() => { laad(); }, []);
  async function weg() {
    if (!zeker) { setZeker(true); return; }
    try { await api(`chat/${gekozen.id}/foto`, { methode: "DELETE" }); setFotos((f) => f.filter((x) => x.id !== gekozen.id)); setGekozen(null); }
    catch (e) { setFout(e.message); }
    setZeker(false);
  }
  const lijst = fotos ? (alle ? fotos : fotos.slice(0, 12)) : [];
  return (
    <div className="kaart pad" style={{ marginTop: 16 }}>
      <h3>Foto's in het peloton</h3>
      <p className="klein">Staat er een foto in de chat die er niet hoort? Tik erop en verwijder hem. De tekst van het bericht blijft staan, met de melding dat de organisatie de foto heeft verwijderd.</p>
      {fout && <div className="melding fout"><Icoon naam="let" />{fout}</div>}
      {!fotos && <div className="skelet" style={{ height: 90 }} />}
      {fotos && !fotos.length && <p className="klein" style={{ marginBottom: 0 }}><i>Er staan nog geen foto's in het peloton.</i></p>}
      {lijst.length > 0 && (
        <div className="fotoraster">
          {lijst.map((f) => (
            <button key={f.id} className="fotoraster-item" onClick={() => { setGekozen(f); setZeker(false); }} aria-label={`Foto van ${f.naam}`}>
              <img src={`/api/foto/${f.fotoId}`} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {fotos?.length > 12 && !alle && <button className="knop klein stil" style={{ marginTop: 10 }} onClick={() => setAlle(true)}>Toon alle {fotos.length} foto's</button>}
      <Blad open={!!gekozen} onSluit={() => setGekozen(null)} titel={gekozen ? `Foto van ${gekozen.naam}` : ""} label={gekozen ? new Date(gekozen.tijd).toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : ""}>
        {gekozen && (
          <div>
            <img className="fotoblad-img" src={`/api/foto/${gekozen.fotoId}`} alt={`Foto van ${gekozen.naam}`} />
            {gekozen.tekst && <p className="klein">“{gekozen.tekst}”</p>}
            <button className={`knop vol ${zeker ? "gevaar" : ""}`} onClick={weg}><Icoon naam="prullenbak" />{zeker ? "Zeker weten? Tik nog een keer" : "Foto verwijderen"}</button>
          </div>
        )}
      </Blad>
    </div>
  );
}

function Instellingen() {
  const { sessie, setSessie } = useApp();
  const [code, setCode] = useState({ nieuw: "", herhaal: "" });
  const [melding, setMelding] = useState(null);
  const [demo, setDemo] = useState(null);
  const [heeftDemo, setHeeftDemo] = useState(false);
  useEffect(() => { api("leden").then((r) => setHeeftDemo(r.leden.some((l) => l.demo))).catch(() => {}); }, []);

  async function wijzigCode(e) {
    e.preventDefault();
    if (code.nieuw !== code.herhaal) return setMelding({ fout: "De codes zijn niet gelijk." });
    try {
      await api("admin/code", { methode: "PUT", body: { code: code.nieuw } });
      setCode({ nieuw: "", herhaal: "" });
      setSessie({ ...sessie, codeStandaard: code.nieuw === "7000" });
      setMelding({ ok: "De nieuwe admincode is actief. Andere admins moeten hem opnieuw invoeren." });
    } catch (err) { setMelding({ fout: err.message }); }
  }

  const [melder, setMelder] = useState(sessie.meldingsEmail || "");
  const [melderBezig, setMelderBezig] = useState(false);
  const [melderInfo, setMelderInfo] = useState(null);
  async function bewaarMelding(e) {
    e.preventDefault();
    setMelderBezig(true); setMelderInfo(null);
    try {
      const r = await api("admin/meldingen", { methode: "PUT", body: { email: melder } });
      setSessie({ ...sessie, meldingsEmail: r.meldingsEmail });
      if (!r.meldingsEmail) setMelderInfo({ ok: true, tekst: "Meldingen per e-mail staan uit. Nieuwe aanvragen zie je nog wel in de app." });
      else if (r.test?.verstuurd) setMelderInfo({ ok: true, tekst: `Opgeslagen. Er is een testmail onderweg naar ${r.meldingsEmail}. Is dit een nieuw adres? Klik dan één keer op de bevestigingslink in de eerste mail (van FormSubmit), daarna komen alle meldingen binnen.` });
      else setMelderInfo({ ok: false, tekst: "Opgeslagen, maar de testmail kon nu niet worden verstuurd. Nieuwe aanvragen zie je in elk geval in de app." });
    } catch (err) { setMelderInfo({ ok: false, tekst: err.message }); }
    setMelderBezig(false);
  }

  async function wisDemo() {
    setDemo("wissen");
    try { const r = await api("admin/demo", { methode: "DELETE" }); setDemo(r.mislukt ? null : "weg"); setMelding(r.mislukt ? { fout: `Niet alles kon worden verwijderd. Tik nog een keer op Verwijder voorbeelden.` } : { ok: `Voorbeeldinhoud verwijderd: ${r.ritten} ritten, ${r.leden} renners en ${r.berichten} berichten.` }); }
    catch (e) { setDemo(null); setMelding({ fout: e.message }); }
  }

  return (
    <div>
      {melding && <div className={`melding ${melding.ok ? "ok" : "fout"}`}><Icoon naam={melding.ok ? "vink" : "let"} />{melding.ok || melding.fout}</div>}
      <form className="kaart pad" onSubmit={wijzigCode}>
        <h3>Admincode wijzigen</h3>
        <p className="klein">Met deze code open je de adminpagina. Gebruik 4 tot 8 cijfers.</p>
        <div className="rij2">
          <label className="veld"><span>Nieuwe code</span><input className="invoer tab" inputMode="numeric" pattern="\d{4,8}" required value={code.nieuw} onChange={(e) => setCode({ ...code, nieuw: e.target.value.replace(/\D/g, "").slice(0, 8) })} /></label>
          <label className="veld"><span>Herhaal</span><input className="invoer tab" inputMode="numeric" pattern="\d{4,8}" required value={code.herhaal} onChange={(e) => setCode({ ...code, herhaal: e.target.value.replace(/\D/g, "").slice(0, 8) })} /></label>
        </div>
        <button className="knop primair vol">Code wijzigen</button>
      </form>

      <form className="kaart pad" style={{ marginTop: 16 }} onSubmit={bewaarMelding}>
        <h3>Meldingen per e-mail</h3>
        <p className="klein">Op dit adres krijg je een mail zodra iemand op de startpagina op <b>Meedoen</b> tikt. Je kunt het altijd wijzigen, bijvoorbeeld naar het adres van een andere organisator.</p>
        <label className="veld"><span>E-mailadres voor meldingen</span><input className="invoer" type="email" value={melder} onChange={(e) => setMelder(e.target.value)} placeholder="organisatie@voorbeeld.nl" /></label>
        <button className="knop primair vol" disabled={melderBezig}>{melderBezig ? "Opslaan…" : "Opslaan en testmail sturen"}</button>
        {melderInfo && <div className={`melding ${melderInfo.ok ? "ok" : "let"}`} style={{ marginTop: 12, marginBottom: 0 }}><Icoon naam={melderInfo.ok ? "vink" : "info"} /><span>{melderInfo.tekst}</span></div>}
      </form>

      <FotoBeheer />

      {heeftDemo && demo !== "weg" && (
        <div className="kaart pad" style={{ marginTop: 16 }}>
          <h3>Voorbeeldinhoud</h3>
          <p className="klein">Er staan nog voorbeeldritten, voorbeeldrenners en berichten in de app. Ga je zelf ritten plannen? Haal ze dan met één knop weg. Daarna verdwijnt deze kaart.</p>
          <button className="knop klein gevaar" onClick={wisDemo} disabled={demo === "wissen"}>{demo === "wissen" ? "Bezig…" : "Verwijder voorbeelden"}</button>
        </div>
      )}

      <form className="kaart pad" style={{ marginTop: 16 }} onSubmit={async (e) => { e.preventDefault(); await api("admin/vergrendel", { methode: "POST" }); setSessie({ ...sessie, adminOpen: false }); }}>
        <h3>Admin vergrendelen</h3>
        <p className="klein">Admin gaat na twee uur vanzelf op slot. Lenen anderen je telefoon? Vergrendel dan nu.</p>
        <button className="knop vol"><Icoon naam="admin" />Nu vergrendelen</button>
      </form>
    </div>
  );
}

export default function Admin({ deel }) {
  const { sessie, setSessie, ga } = useApp();
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get("tab") || (sessie.aanvragen > 0 ? "aanvragen" : "ritten"));

  if (!sessie.adminOpen) {
    return <Cijferslot onOpen={(r) => setSessie({ ...sessie, adminOpen: true, codeStandaard: r.codeStandaard })} />;
  }

  if (deel[0] === "rit") return <RitFormulier id={deel[1] === "nieuw" ? null : deel[1]} />;

  const kies = (t) => { setTab(t); history.replaceState(null, "", `/admin?tab=${t}`); };

  return (
    <div className="pagina admin">
      <header className="admin-kop">
        <span className="label"><Icoon naam="open" className="i16" /> Ontgrendeld</span>
        <h1>Organisatie</h1>
      </header>
      {(sessie.codeStandaard || sessie.lid.wachtwoordStandaard || !sessie.meldingsEmail) && (
        <div className="melding let">
          <Icoon naam="let" />
          <div>
            {sessie.codeStandaard && <div>De admincode is nog de standaardcode. <button className="linkknop" onClick={() => kies("instellingen")}>Wijzig de code.</button></div>}
            {sessie.lid.wachtwoordStandaard && <div>Je wachtwoord is nog het startwachtwoord. <button className="linkknop" onClick={() => ga("/profiel")}>Wijzig je wachtwoord.</button></div>}
            {!sessie.meldingsEmail && <div>Er is nog geen e-mailadres voor meldingen over nieuwe aanvragen. <button className="linkknop" onClick={() => kies("instellingen")}>Stel het in.</button></div>}
          </div>
        </div>
      )}
      <div className="segment vier" role="tablist">
        {[["aanvragen", "Aanvragen"], ["ritten", "Ritten"], ["leden", "Fietsers"], ["instellingen", "Instellingen"]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "aan" : ""} onClick={() => kies(k)}>
            {l}{k === "aanvragen" && sessie.aanvragen > 0 && <em className="segment-badge">{sessie.aanvragen}</em>}
          </button>
        ))}
      </div>
      {tab === "aanvragen" && <Aanvragen onAantal={(n) => setSessie((s) => ({ ...s, aanvragen: n }))} />}
      {tab === "ritten" && <RittenBeheer />}
      {tab === "leden" && <Leden />}
      {tab === "instellingen" && <Instellingen />}
    </div>
  );
}
