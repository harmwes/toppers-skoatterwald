import { toonMobiel } from "../lib/mail.js";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../lib/api.js";
import Icoon, { TypeIcoon } from "../components/Icoon.jsx";
import { Rugnummer, Pompeblad } from "../components/Merk.jsx";
import { InstallerenKnop, HANDLEIDING } from "../components/Hulpknoppen.jsx";
import { TYPES, eindMoment } from "../lib/tijd.js";

function Formuliervak({ titel, children, open: startOpen = false, icoon }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className={`kaart vak ${open ? "open" : ""}`}>
      <button className="vak-kop" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icoon naam={icoon} className="i20" /><span>{titel}</span><Icoon naam="verder" className="i18 pijl" />
      </button>
      {open && <div className="vak-inhoud">{children}</div>}
    </div>
  );
}

export default function Profiel() {
  const { lid, setSessie, sessie, ga } = useApp();
  const [ritten, setRitten] = useState([]);
  const [naam, setNaam] = useState(lid.naam);
  const [email, setEmail] = useState(lid.email);
  const [mobiel, setMobiel] = useState(toonMobiel(lid.mobiel));
  const [pwVoorEmail, setPwVoorEmail] = useState("");
  const [pw, setPw] = useState({ huidig: "", nieuw: "", herhaal: "" });
  const [melding, setMelding] = useState({});
  const [bezig, setBezig] = useState("");

  useEffect(() => { api("ritten").then((r) => setRitten(r.ritten)).catch(() => {}); }, []);

  const stats = useMemo(() => {
    const nu = new Date();
    const gereden = ritten.filter((r) => eindMoment(r) < nu && r.aanmeldingen.some((a) => a.lidId === lid.id && a.status === "ja"));
    const perType = { race: 0, gravel: 0, atb: 0 };
    gereden.forEach((r) => { perType[r.type]++; });
    const fav = Object.entries(perType).sort((a, b) => b[1] - a[1])[0];
    return {
      aantal: gereden.length,
      km: Math.round(gereden.reduce((s, r) => s + (r.route?.afstand || 0), 0) / 1000),
      hm: gereden.reduce((s, r) => s + (r.route?.stijging || 0), 0),
      fav: fav && fav[1] > 0 ? TYPES[fav[0]].naam : "–",
    };
  }, [ritten, lid.id]);

  const zet = (lidNieuw) => setSessie({ ...sessie, lid: lidNieuw });

  async function bewaarGegevens(e) {
    e.preventDefault();
    setBezig("gegevens"); setMelding({});
    try {
      const body = { naam, mobiel };
      if (email.trim().toLowerCase() !== lid.email) { body.email = email; body.huidigWachtwoord = pwVoorEmail; }
      const r = await api("ik", { methode: "PUT", body });
      zet({ ...lid, ...r.lid });
      setMobiel(toonMobiel(r.lid.mobiel));
      setPwVoorEmail("");
      setMelding({ gegevens: { ok: "Je gegevens zijn opgeslagen." } });
    } catch (err) { setMelding({ gegevens: { fout: err.message } }); }
    setBezig("");
  }

  async function bewaarWachtwoord(e) {
    e.preventDefault();
    setMelding({});
    if (pw.nieuw !== pw.herhaal) return setMelding({ pw: { fout: "De twee nieuwe wachtwoorden zijn niet gelijk." } });
    setBezig("pw");
    try {
      const r = await api("ik/wachtwoord", { methode: "PUT", body: { huidig: pw.huidig, nieuw: pw.nieuw } });
      zet({ ...lid, ...r.lid });
      setPw({ huidig: "", nieuw: "", herhaal: "" });
      setMelding({ pw: { ok: "Je nieuwe wachtwoord is actief." } });
    } catch (err) { setMelding({ pw: { fout: err.message } }); }
    setBezig("");
  }

  async function wisselFiets(t) {
    const fietsen = lid.fietsen.includes(t) ? lid.fietsen.filter((f) => f !== t) : [...lid.fietsen, t];
    zet({ ...lid, fietsen });
    try { await api("ik", { methode: "PUT", body: { fietsen } }); } catch {}
  }

  async function uitloggen() {
    await api("logout", { methode: "POST" }).catch(() => {});
    setSessie({ laden: false, lid: null });
    history.replaceState(null, "", "/");
  }

  const M = ({ m }) => m ? <div className={`melding ${m.ok ? "ok" : "fout"}`}><Icoon naam={m.ok ? "vink" : "let"} />{m.ok || m.fout}</div> : null;

  return (
    <div className="pagina profiel">
      <section className="profielheld">
        <div className="held-streep" />
        <Rugnummer nummer={lid.rugnummer} schaal={2.3} className="held-bib" />
        <div className="held-tekst">
          <span className="label">{lid.rol === "admin" ? "Organisatie" : "Renner"} · Toppers Skoatterwâld</span>
          <h1>{lid.naam}</h1>
          <span className="klein">{lid.email}</span>
        </div>
      </section>

      <div className="profielstats tab">
        <div><b>{stats.aantal}</b><span>ritten</span></div>
        <div><b>{stats.km}</b><span>km</span></div>
        <div><b>{stats.hm}</b><span>hm</span></div>
        <div><b>{stats.fav}</b><span>favoriet</span></div>
      </div>

      {lid.wachtwoordStandaard && (
        <div className="melding let" style={{ marginTop: 18 }}><Icoon naam="sleutel" /><span>Je gebruikt nog het wachtwoord dat je van de organisatie kreeg. Kies hieronder je eigen wachtwoord.</span></div>
      )}

      <section className="sectie">
        <div className="sectiekop"><h2>Mijn fietsen</h2></div>
        <div className="fietskeuze">
          {Object.entries(TYPES).map(([k, t]) => (
            <button key={k} className={`fietstegel ${k} ${lid.fietsen.includes(k) ? "aan" : ""}`} onClick={() => wisselFiets(k)} aria-pressed={lid.fietsen.includes(k)}>
              <TypeIcoon type={k} />
              <span>{t.lang}</span>
              <i>{lid.fietsen.includes(k) ? <Icoon naam="vink" /> : null}</i>
            </button>
          ))}
        </div>
      </section>

      <section className="sectie vakken">
        <Formuliervak titel="Naam en e-mailadres" icoon="mail">
          <form onSubmit={bewaarGegevens}>
            <M m={melding.gegevens} />
            <label className="veld"><span>Naam</span><input className="invoer" value={naam} onChange={(e) => setNaam(e.target.value)} required maxLength={60} /></label>
            <label className="veld"><span>E-mailadres (hiermee log je in)</span><input className="invoer" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label className="veld"><span>Mobiel nummer (optioneel)</span><input className="invoer tab" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={mobiel} onChange={(e) => setMobiel(e.target.value)} placeholder="06 12345678" /><small className="klein veldhulp">Alleen zichtbaar voor de organisatie, bijvoorbeeld om je een nieuwe code via WhatsApp te sturen.</small></label>
            {email.trim().toLowerCase() !== lid.email && (
              <label className="veld"><span>Huidig wachtwoord ter bevestiging</span><input className="invoer" type="password" autoComplete="current-password" value={pwVoorEmail} onChange={(e) => setPwVoorEmail(e.target.value)} required /></label>
            )}
            <button className="knop primair vol" disabled={bezig === "gegevens"}>Opslaan</button>
          </form>
        </Formuliervak>

        <Formuliervak titel="Wachtwoord wijzigen" icoon="sleutel" open={lid.wachtwoordStandaard}>
          <form onSubmit={bewaarWachtwoord}>
            <M m={melding.pw} />
            <input type="email" hidden autoComplete="username" value={lid.email} readOnly />
            <label className="veld"><span>Huidig wachtwoord</span><input className="invoer" type="password" autoComplete="current-password" value={pw.huidig} onChange={(e) => setPw({ ...pw, huidig: e.target.value })} required /></label>
            <label className="veld"><span>Nieuw wachtwoord (min. 6 tekens)</span><input className="invoer" type="password" autoComplete="new-password" minLength={6} value={pw.nieuw} onChange={(e) => setPw({ ...pw, nieuw: e.target.value })} required /></label>
            <label className="veld"><span>Nieuw wachtwoord nog een keer</span><input className="invoer" type="password" autoComplete="new-password" minLength={6} value={pw.herhaal} onChange={(e) => setPw({ ...pw, herhaal: e.target.value })} required /></label>
            <button className="knop primair vol" disabled={bezig === "pw"}>Wachtwoord wijzigen</button>
          </form>
        </Formuliervak>

        <a className="kaart vak vak-kop vak-link" href={HANDLEIDING} target="_blank" rel="noreferrer">
          <Icoon naam="boek" className="i20" /><span>Handleiding (PDF)</span><Icoon naam="verder" className="i18 pijl" />
        </a>
        <InstallerenKnop className="vol installeer-profiel" />
      </section>

      {lid.rol === "admin" && (
        <button className="knop vol" style={{ marginTop: 18 }} onClick={() => ga("/admin")}><Icoon naam="admin" />Naar Admin</button>
      )}
      <button className="knop gevaar vol" style={{ marginTop: 12 }} onClick={uitloggen}><Icoon naam="uit" />Uitloggen</button>

      <footer className="over">
        <Pompeblad className="pompeblad i20" />
        <p><b>Toppers Skoatterwâld</b><br />Een idee van Harm, voor de hele groep.<br /><span className="klein">Weer: Open-Meteo · Kaart: OpenStreetMap</span></p>
      </footer>
    </div>
  );
}
