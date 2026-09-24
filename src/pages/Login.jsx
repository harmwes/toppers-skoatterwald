import { useState } from "react";
import { api } from "../lib/api.js";
import { Logo, Pompeblad } from "../components/Merk.jsx";
import Icoon from "../components/Icoon.jsx";

export default function Login({ onIngelogd, fout: startFout }) {
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [toon, setToon] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(startFout || "");

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
      <div className="login-inhoud">
        <div className="login-top">
          <span className="label">Fietsgroep · sinds vandaag digitaal</span>
          <Logo groot />
          <p className="login-slogan">Race, gravel en ATB.<br />Samen uit, samen thuis.</p>
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
          <p className="klein login-hulp">Nog geen account? Je krijgt je inlog van de organisatie. Wachtwoord vergeten? Vraag de admin om een nieuw startwachtwoord.</p>
        </form>
        <div className="login-voet klein">Een idee van Harm · <Pompeblad className="pompeblad i14" /> Skoatterwâld</div>
      </div>
    </div>
  );
}
