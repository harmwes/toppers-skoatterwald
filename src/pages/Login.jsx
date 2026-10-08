import { useState } from "react";
import { api } from "../lib/api.js";
import { Logo, Pompeblad } from "../components/Merk.jsx";
import Icoon, { TypeIcoon } from "../components/Icoon.jsx";
import Blad from "../components/Blad.jsx";
import { VolledigSchermKnop, HandleidingKnop, InstallerenKnop } from "../components/Hulpknoppen.jsx";
import { TYPES } from "../lib/tijd.js";

function MeedoenBlad({ open, onSluit }) {
  const [v, setV] = useState({ naam: "", email: "", mobiel: "", bericht: "", fietsen: [] });
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [klaar, setKlaar] = useState(false);
  const [honing, setHoning] = useState("");

  async function verstuur(e) {
    e.preventDefault();
    setFout(""); setBezig(true);
    try {
      await api("aanvraag", { methode: "POST", body: { ...v, website: honing } });
      setKlaar(true);
    } catch (err) { setFout(err.message); }
    setBezig(false);
  }
  const wisselFiets = (f) => setV({ ...v, fietsen: v.fietsen.includes(f) ? v.fietsen.filter((x) => x !== f) : [...v.fietsen, f] });

  return (
    <Blad open={open} onSluit={onSluit} titel={klaar ? "Je staat op de wachtlijst" : "Rij mee met de Toppers"} label="Meedoen">
      {klaar ? (
        <div className="meedoen-klaar">
          <div className="meedoen-vlag"><Icoon naam="vink" /></div>
          <p><b>Bedankt, {v.naam.split(" ")[0]}!</b> Je aanvraag is binnen bij de organisatie.</p>
          <p>Zodra je bent toegelaten, krijg je een mail van harmwesseling@yahoo.com op <b>{v.email.trim().toLowerCase()}</b> met je wachtwoord en een link naar de handleiding. Kijk voor de zekerheid ook even in je spam.</p>
          <p className="klein">Tot die tijd: banden oppompen en ketting smeren.</p>
          <button className="knop vol" onClick={onSluit}>Sluiten</button>
        </div>
      ) : (
        <form onSubmit={verstuur}>
          <p className="meedoen-intro">Fiets je graag mee op de racefiets, gravelbike of mountainbike? Laat je gegevens achter. De organisatie bekijkt je aanvraag en stuurt je een wachtwoord.</p>
          {fout && <div className="melding fout"><Icoon naam="let" />{fout}</div>}
          <label className="veld"><span>Je naam</span><input className="invoer" required maxLength={60} autoComplete="name" value={v.naam} onChange={(e) => setV({ ...v, naam: e.target.value })} placeholder="Voor- en achternaam" /></label>
          <label className="veld"><span>E-mailadres</span><input className="invoer" type="email" required autoComplete="email" inputMode="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} placeholder="jij@voorbeeld.nl" /></label>
          <label className="veld"><span>Mobiel nummer (optioneel)</span><input className="invoer tab" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={v.mobiel} onChange={(e) => setV({ ...v, mobiel: e.target.value })} placeholder="06 12345678" /><small className="klein veldhulp">Vul je dit in, dan kan de organisatie je ook via WhatsApp bereiken.</small></label>
          <div className="veld">
            <span>Waar fiets je op? (optioneel)</span>
            <div className="meedoen-fietsen">
              {Object.entries(TYPES).map(([k, t]) => (
                <button type="button" key={k} className={`filter ${v.fietsen.includes(k) ? "aan" : ""}`} onClick={() => wisselFiets(k)} aria-pressed={v.fietsen.includes(k)}>
                  <TypeIcoon type={k} className="i18" />{t.naam}
                </button>
              ))}
            </div>
          </div>
          <label className="veld"><span>Bericht aan de organisatie (optioneel)</span><textarea className="invoer" maxLength={400} value={v.bericht} onChange={(e) => setV({ ...v, bericht: e.target.value })} placeholder="Bijvoorbeeld: ik woon in Heerenveen en rij zo'n 30 km/u gemiddeld" /></label>
          <input className="sr" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honing} onChange={(e) => setHoning(e.target.value)} name="website" />
          <button className="knop primair vol" disabled={bezig}>{bezig ? "Versturen…" : <><Icoon naam="handzwaai" />Aanvraag versturen</>}</button>
          <p className="klein" style={{ marginTop: 12 }}>We gebruiken je gegevens alleen voor deze app en slaan ze versleuteld op. Je mobiele nummer ziet alleen de organisatie.</p>
        </form>
      )}
    </Blad>
  );
}

export default function Login({ onIngelogd, fout: startFout }) {
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [toon, setToon] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(startFout || "");
  const [meedoen, setMeedoen] = useState(false);

  async function verstuur(e) {
    e.preventDefault();
    setFout(""); setBezig(true);
    try {
      const r = await api("login", { methode: "POST", body: { email, wachtwoord } });
      onIngelogd(r.lid);
    } catch (err) {
      setFout(err.message);
      setBezig(false);
    }
  }

  return (
    <div className="login">
      <svg className="login-route" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path className="lr-schaduw" d="M-20 610 C 60 560, 90 640, 150 600 S 230 470, 290 500 S 380 620, 420 540" />
        <path className="lr-lijn" d="M-20 610 C 60 560, 90 640, 150 600 S 230 470, 290 500 S 380 620, 420 540" />
        <path className="lr-lijn twee" d="M-20 700 C 70 690, 120 720, 190 690 S 300 640, 420 680" />
        {Array.from({ length: 7 }).map((_, i) => <line key={i} className="lr-snel" x1={-60 + i * 30} y1={140 + i * 36} x2={140 + i * 40} y2={140 + i * 36} style={{ animationDelay: `${i * 0.18}s` }} />)}
      </svg>
      <div className="login-hulp-rij">
        <HandleidingKnop />
        <VolledigSchermKnop />
      </div>
      <div className="login-inhoud">
        <div className="login-top">
          <span className="label">Fietsgroep · race · gravel · ATB</span>
          <Logo groot />
          <p className="login-slogan">Race, gravel en ATB.{" "}<br />Samen uit, samen thuis.</p>
        </div>
        <form className="login-form" onSubmit={verstuur}>
          {fout && <div className="melding fout" role="alert"><Icoon naam="let" /><span>{fout}</span></div>}
          <label className="veld">
            <span>E-mailadres</span>
            <input className="invoer" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jij@voorbeeld.nl" />
          </label>
          <label className="veld">
            <span>Wachtwoord</span>
            <div className="wachtwoordveld">
              <input className="invoer" type={toon ? "text" : "password"} autoComplete="current-password" required value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)} />
              <button type="button" className="toon" onClick={() => setToon(!toon)}>{toon ? "Verberg" : "Toon"}</button>
            </div>
          </label>
          <button className="knop primair vol login-knop" disabled={bezig}>
            {bezig ? "Even klikken…" : <>Naar de start <Icoon naam="verder" /></>}
          </button>
          <div className="login-scheiding"><span>nog geen account?</span></div>
          <button type="button" className="knop vol meedoen-knop" onClick={() => setMeedoen(true)}><Icoon naam="handzwaai" />Meedoen</button>
          <InstallerenKnop className="vol stil installeer-login" />
          <p className="klein login-hulp">Wachtwoord kwijt? Vraag de organisatie om een nieuw wachtwoord. Dat krijg je per mail.</p>
        </form>
        <div className="login-voet klein">Een idee van Harm · <Pompeblad className="pompeblad i14" /> Skoatterwâld</div>
      </div>
      <MeedoenBlad open={meedoen} onSluit={() => setMeedoen(false)} />
    </div>
  );
}
