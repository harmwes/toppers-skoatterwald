import { useEffect, useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../lib/api.js";
import Icoon from "../components/Icoon.jsx";
import { Rugnummer } from "../components/Merk.jsx";
import RitFormulier from "./RitFormulier.jsx";
import { TypeChip } from "../components/RitKaartje.jsx";
import { datumLang, eindMoment } from "../lib/tijd.js";
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

function wachtwoordVoorstel() {
  const woorden = ["kopgroep", "waaier", "demarrage", "bidon", "zadel", "ketting", "tempo", "klimmer", "sprint", "derailleur", "knobbel", "gravel", "polder", "dijk", "wind"];
  const w = woorden[Math.floor(Math.random() * woorden.length)];
  return `${w}${Math.floor(10 + Math.random() * 89)}`;
}

function Leden() {
  const { lid } = useApp();
  const [leden, setLeden] = useState(null);
  const [nieuw, setNieuw] = useState(null);
  const [melding, setMelding] = useState(null);
  const [welkom, setWelkom] = useState(null);
  const [bevestig, setBevestig] = useState(null);
  const [bewerk, setBewerk] = useState(null);

  const laad = () => api("admin/leden").then((r) => setLeden(r.leden)).catch((e) => setMelding({ fout: e.message }));
  useEffect(() => { laad(); }, []);

  async function voegToe(e) {
    e.preventDefault();
    setMelding(null);
    try {
      await api("admin/leden", { methode: "POST", body: nieuw });
      setWelkom({ naam: nieuw.naam, email: nieuw.email.trim().toLowerCase(), wachtwoord: nieuw.wachtwoord });
      setNieuw(null);
      laad();
    } catch (err) { setMelding({ fout: err.message }); }
  }

  async function verwijder(l) {
    if (bevestig !== l.id) { setBevestig(l.id); setTimeout(() => setBevestig((b) => (b === l.id ? null : b)), 3500); return; }
    setBevestig(null);
    try { await api(`admin/leden/${l.id}`, { methode: "DELETE" }); setMelding({ ok: `${l.naam} is verwijderd.` }); laad(); }
    catch (err) { setMelding({ fout: err.message }); }
  }

  async function bewaarBewerk(e) {
    e.preventDefault();
    try {
      const body = { naam: bewerk.naam, email: bewerk.email, rugnummer: bewerk.rugnummer, rol: bewerk.rol };
      if (bewerk.wachtwoord) body.wachtwoord = bewerk.wachtwoord;
      await api(`admin/leden/${bewerk.id}`, { methode: "PUT", body });
      if (bewerk.wachtwoord) setWelkom({ naam: bewerk.naam, email: bewerk.email, wachtwoord: bewerk.wachtwoord, reset: true });
      else setMelding({ ok: `${bewerk.naam} is bijgewerkt.` });
      setBewerk(null); laad();
    } catch (err) { setMelding({ fout: err.message }); }
  }

  const welkomTekst = welkom && `Hoi ${welkom.naam.split(" ")[0]}! ${welkom.reset ? "Je nieuwe startwachtwoord" : "Je account"} voor de app van Toppers Skoatterwâld:\n\n${window.location.origin}\nE-mail: ${welkom.email}\nWachtwoord: ${welkom.wachtwoord}\n\nKies na het inloggen je eigen wachtwoord via Profiel.`;

  return (
    <div>
      {melding && <div className={`melding ${melding.ok ? "ok" : "fout"}`}><Icoon naam={melding.ok ? "vink" : "let"} />{melding.ok || melding.fout}</div>}

      {welkom && (
        <div className="kaart pad welkomkaart">
          <div className="label">Inloggegevens voor {welkom.naam}</div>
          <pre className="welkomtekst">{welkomTekst}</pre>
          <div className="knoppenrij">
            <a className="knop primair klein" href={`https://wa.me/?text=${encodeURIComponent(welkomTekst)}`} target="_blank" rel="noreferrer"><Icoon naam="chat" />WhatsApp</a>
            <a className="knop klein" href={`mailto:${welkom.email}?subject=${encodeURIComponent("Je account voor Toppers Skoatterwâld")}&body=${encodeURIComponent(welkomTekst)}`}><Icoon naam="mail" />Mail</a>
            <button className="knop klein" onClick={() => navigator.clipboard?.writeText(welkomTekst)}><Icoon naam="kopie" />Kopieer</button>
            <button className="knop klein stil" onClick={() => setWelkom(null)}>Klaar</button>
          </div>
        </div>
      )}

      {!nieuw ? (
        <button className="knop primair vol" onClick={() => { setNieuw({ naam: "", email: "", wachtwoord: wachtwoordVoorstel(), rol: "lid" }); setWelkom(null); }}><Icoon naam="plus" />Fietser toevoegen</button>
      ) : (
        <form className="kaart pad" onSubmit={voegToe}>
          <h3 style={{ marginBottom: 14 }}>Nieuwe fietser</h3>
          <label className="veld"><span>Naam</span><input className="invoer" required value={nieuw.naam} onChange={(e) => setNieuw({ ...nieuw, naam: e.target.value })} autoFocus /></label>
          <label className="veld"><span>E-mailadres</span><input className="invoer" type="email" required value={nieuw.email} onChange={(e) => setNieuw({ ...nieuw, email: e.target.value })} /></label>
          <label className="veld"><span>Startwachtwoord</span>
            <div className="wachtwoordveld"><input className="invoer" required minLength={6} value={nieuw.wachtwoord} onChange={(e) => setNieuw({ ...nieuw, wachtwoord: e.target.value })} /><button type="button" className="toon" onClick={() => setNieuw({ ...nieuw, wachtwoord: wachtwoordVoorstel() })}>Nieuw</button></div>
          </label>
          <label className="schakelaar"><input type="checkbox" checked={nieuw.rol === "admin"} onChange={(e) => setNieuw({ ...nieuw, rol: e.target.checked ? "admin" : "lid" })} /><span />Ook organisatie (admin)</label>
          <div className="knoppenrij" style={{ marginTop: 14 }}>
            <button className="knop primair">Toevoegen</button>
            <button type="button" className="knop stil" onClick={() => setNieuw(null)}>Annuleren</button>
          </div>
        </form>
      )}

      <div className="ledenlijst">
        {!leden && <div className="skelet" style={{ height: 200 }} />}
        {leden?.map((l) => (
          <div key={l.id} className="lidrij">
            {bewerk?.id === l.id ? (
              <form className="lid-bewerk" onSubmit={bewaarBewerk}>
                <div className="rij2">
                  <label className="veld"><span>Naam</span><input className="invoer" value={bewerk.naam} onChange={(e) => setBewerk({ ...bewerk, naam: e.target.value })} /></label>
                  <label className="veld"><span>Rugnummer</span><input className="invoer" type="number" min={1} max={999} value={bewerk.rugnummer} onChange={(e) => setBewerk({ ...bewerk, rugnummer: e.target.value })} /></label>
                </div>
                <label className="veld"><span>E-mailadres</span><input className="invoer" type="email" value={bewerk.email} onChange={(e) => setBewerk({ ...bewerk, email: e.target.value })} /></label>
                <label className="veld"><span>Nieuw startwachtwoord (leeg = ongewijzigd)</span>
                  <div className="wachtwoordveld"><input className="invoer" value={bewerk.wachtwoord} minLength={6} onChange={(e) => setBewerk({ ...bewerk, wachtwoord: e.target.value })} /><button type="button" className="toon" onClick={() => setBewerk({ ...bewerk, wachtwoord: wachtwoordVoorstel() })}>Maak</button></div>
                </label>
                {l.id !== lid.id && <label className="schakelaar"><input type="checkbox" checked={bewerk.rol === "admin"} onChange={(e) => setBewerk({ ...bewerk, rol: e.target.checked ? "admin" : "lid" })} /><span />Organisatie (admin)</label>}
                <div className="knoppenrij" style={{ marginTop: 12 }}>
                  <button className="knop primair klein">Opslaan</button>
                  <button type="button" className="knop klein stil" onClick={() => setBewerk(null)}>Annuleren</button>
                </div>
              </form>
            ) : (
              <>
                <Rugnummer nummer={l.rugnummer} schaal={0.85} demo={l.demo} />
                <div className="lid-info">
                  <b>{l.naam}{l.rol === "admin" && <em className="rolbadge">admin</em>}{l.demo && <em className="rolbadge demo">demo</em>}</b>
                  <span className="klein">{l.demo ? "voorbeeldrenner, kan niet inloggen" : l.email}{l.wachtwoordStandaard && !l.demo ? " · startwachtwoord" : ""}</span>
                </div>
                <div className="lid-knoppen">
                  <button className="icoonknop" onClick={() => setBewerk({ ...l, wachtwoord: "" })} aria-label={`${l.naam} bewerken`}><Icoon naam="bewerk" /></button>
                  {l.id !== lid.id && (
                    <button className={`icoonknop ${bevestig === l.id ? "bevestig" : ""}`} onClick={() => verwijder(l)} aria-label={`${l.naam} verwijderen`}>
                      {bevestig === l.id ? <span>Zeker?</span> : <Icoon naam="prullenbak" />}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
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

function Instellingen() {
  const { sessie, setSessie } = useApp();
  const [code, setCode] = useState({ nieuw: "", herhaal: "" });
  const [melding, setMelding] = useState(null);
  const [demo, setDemo] = useState(null);

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

  async function laadDemo() {
    setDemo("laden");
    try {
      const data = await (await fetch("/demo.json")).json();
      // Verschuif de voorbeeldritten naar komende weekenden, zodat ze altijd actueel zijn.
      const vandaag = new Date();
      data.ritten.forEach((r) => {
        const d = new Date(vandaag); d.setDate(d.getDate() + r.dagenVanaf);
        r.datum = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      });
      await api("admin/demo", { methode: "POST", body: data });
      setDemo("klaar");
    } catch (e) { setDemo(null); setMelding({ fout: e.message }); }
  }
  async function wisDemo() {
    setDemo("wissen");
    try { const r = await api("admin/demo", { methode: "DELETE" }); setDemo(null); setMelding({ ok: `Voorbeeldinhoud verwijderd (${r.ritten} ritten, ${r.leden} renners).` }); }
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

      <div className="kaart pad" style={{ marginTop: 16 }}>
        <h3>Voorbeeldinhoud</h3>
        <p className="klein">Drie voorbeeldritten rond Heerenveen met voorbeeldrenners en een paar berichten, handig om de app te laten zien. Alles is gemarkeerd als demo en met één knop weer weg.</p>
        <div className="knoppenrij">
          <button className="knop klein" onClick={laadDemo} disabled={!!demo}>{demo === "laden" ? "Bezig…" : demo === "klaar" ? "Geladen" : "Laad voorbeelden"}</button>
          <button className="knop klein gevaar" onClick={wisDemo} disabled={demo === "wissen"}>Verwijder voorbeelden</button>
        </div>
      </div>

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
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get("tab") || "ritten");

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
      {(sessie.codeStandaard || sessie.lid.wachtwoordStandaard) && (
        <div className="melding let">
          <Icoon naam="let" />
          <div>
            {sessie.codeStandaard && <div>De admincode is nog de standaardcode. <button className="linkknop" onClick={() => kies("instellingen")}>Wijzig de code.</button></div>}
            {sessie.lid.wachtwoordStandaard && <div>Je wachtwoord is nog het startwachtwoord. <button className="linkknop" onClick={() => ga("/profiel")}>Wijzig je wachtwoord.</button></div>}
          </div>
        </div>
      )}
      <div className="segment" role="tablist">
        {[["ritten", "Ritten"], ["leden", "Fietsers"], ["instellingen", "Instellingen"]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "aan" : ""} onClick={() => kies(k)}>{l}</button>
        ))}
      </div>
      {tab === "ritten" && <RittenBeheer />}
      {tab === "leden" && <Leden />}
      {tab === "instellingen" && <Instellingen />}
    </div>
  );
}
