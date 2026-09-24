// Volledig scherm, app installeren en de handleiding.
import { useState } from "react";
import Icoon from "./Icoon.jsx";
import Blad from "./Blad.jsx";
import { isIOS, isAndroid, isGeinstalleerd, kanVolledigScherm, useInstalleren, useVolledigScherm } from "../lib/apparaat.js";

export const HANDLEIDING = "/handleiding.pdf";

export function VolledigSchermKnop({ className = "" }) {
  const vs = useVolledigScherm();
  const [uitleg, setUitleg] = useState(false);
  const [geinstalleerd] = useState(() => isGeinstalleerd());
  const echt = kanVolledigScherm();
  if (geinstalleerd) return null; // als app op het beginscherm is hij al schermvullend
  return (
    <>
      <button className={`hulpknop ${className}`} onClick={() => (echt ? vs.wissel() : setUitleg(true))} aria-label={vs.aan ? "Volledig scherm uit" : "Volledig scherm"} title={vs.aan ? "Volledig scherm uit" : "Volledig scherm"}>
        <Icoon naam={vs.aan ? "kleinscherm" : "volscherm"} />
      </button>
      {/* iPhone en iPad kennen geen volledig-schermknop: leg uit hoe het wel kan. */}
      {!echt && <InstallerenBlad open={uitleg} onSluit={() => setUitleg(false)} volledigScherm />}
    </>
  );
}

export function HandleidingKnop({ className = "" }) {
  return (
    <a className={`hulpknop ${className}`} href={HANDLEIDING} target="_blank" rel="noreferrer" aria-label="Handleiding (PDF)" title="Handleiding">
      <Icoon naam="boek" />
    </a>
  );
}

export function InstallerenBlad({ open, onSluit, volledigScherm = false }) {
  const inst = useInstalleren();
  const [klaar, setKlaar] = useState(false);
  const ios = isIOS();
  return (
    <Blad open={open} onSluit={onSluit} titel={volledigScherm ? "Volledig scherm" : "Zet Toppers op je telefoon"} label={volledigScherm ? "Op iPhone en iPad" : "App installeren"}>
      {volledigScherm && <p className="meedoen-intro">Safari op iPhone en iPad heeft geen knop voor volledig scherm. Zet Toppers op je beginscherm: dan opent hij altijd schermvullend, zonder adresbalk.</p>}
      <div className="inst-held">
        <img src="/icoon-192.png" alt="" className="inst-icoon" />
        <p>Dan opent Toppers als een echte app: met een eigen icoon, schermvullend en zonder adresbalk. Er komt niets uit een app store aan te pas.</p>
      </div>
      {isGeinstalleerd() || klaar ? (
        <div className="melding ok"><Icoon naam="vink" />De app staat op je beginscherm. Veel fietsplezier!</div>
      ) : ios ? (
        <ol className="inst-stappen">
          <li><span className="inst-nr">1</span><div>Open deze pagina in <b>Safari</b>.</div></li>
          <li><span className="inst-nr">2</span><div>Tik onderin op <b>Delen</b> <span className="inst-ikoon"><Icoon naam="deelios" /></span></div></li>
          <li><span className="inst-nr">3</span><div>Scrol omlaag en kies <b>Zet op beginscherm</b> <span className="inst-ikoon"><Icoon naam="plusvak" /></span></div></li>
          <li><span className="inst-nr">4</span><div>Tik rechtsboven op <b>Voeg toe</b>. Klaar!</div></li>
        </ol>
      ) : inst.kan ? (
        <>
          <button className="knop primair vol inst-knop" onClick={async () => { if (await inst.installeer()) setKlaar(true); }}>
            <Icoon naam="installeer" />Installeer Toppers
          </button>
          <p className="klein" style={{ textAlign: "center", marginTop: 10 }}>Je telefoon vraagt nog één keer om bevestiging.</p>
        </>
      ) : (
        <ol className="inst-stappen">
          <li><span className="inst-nr">1</span><div>Open deze pagina in <b>{isAndroid() ? "Chrome" : "Chrome of Edge"}</b>.</div></li>
          <li><span className="inst-nr">2</span><div>Tik op het menu <span className="inst-ikoon"><Icoon naam="menu3" /></span></div></li>
          <li><span className="inst-nr">3</span><div>Kies <b>App installeren</b> of <b>Toevoegen aan startscherm</b>.</div></li>
        </ol>
      )}
    </Blad>
  );
}

export function InstallerenKnop({ className = "", tekst = true }) {
  const [open, setOpen] = useState(false);
  if (isGeinstalleerd()) return null;
  return (
    <>
      <button className={tekst ? `knop ${className}` : `hulpknop ${className}`} onClick={() => setOpen(true)} aria-label="App installeren" title="App installeren">
        <Icoon naam="installeer" />{tekst && "App op je telefoon"}
      </button>
      <InstallerenBlad open={open} onSluit={() => setOpen(false)} />
    </>
  );
}

// Uitloggen, met een korte bevestiging zodat je er niet per ongeluk uit tikt.
export function UitlogKnop({ onUit, naam = "", className = "" }) {
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  return (
    <>
      <button type="button" className={`hulpknop ${className}`} onClick={() => setOpen(true)} aria-label="Uitloggen" title="Uitloggen">
        <Icoon naam="uit" />
      </button>
      <Blad open={open} onSluit={() => setOpen(false)} titel="Afstappen?" label="Uitloggen">
        <p className="uitlog-tekst">{naam ? `${naam.split(" ")[0]}, je` : "Je"} logt uit op dit apparaat. Daarna log je weer in met je e-mailadres en je wachtwoord of code.</p>
        <div className="keuze2">
          <button className="knop gevaar" disabled={bezig} onClick={async () => { setBezig(true); await onUit(); }}><Icoon naam="uit" />{bezig ? "Bezig…" : "Uitloggen"}</button>
          <button className="knop" onClick={() => setOpen(false)}>Blijf ingelogd</button>
        </div>
      </Blad>
    </>
  );
}
