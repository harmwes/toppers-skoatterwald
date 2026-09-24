// Volledig scherm, app installeren en de handleiding.
import { useState } from "react";
import Icoon from "./Icoon.jsx";
import Blad from "./Blad.jsx";
import { isIOS, isAndroid, isGeinstalleerd, kanVolledigScherm, useInstalleren, useVolledigScherm } from "../lib/apparaat.js";

export const HANDLEIDING = "/handleiding.pdf";

export function VolledigSchermKnop({ className = "" }) {
  const vs = useVolledigScherm();
  if (!kanVolledigScherm()) return null;
  return (
    <button className={`hulpknop ${className}`} onClick={vs.wissel} aria-label={vs.aan ? "Volledig scherm uit" : "Volledig scherm"} title={vs.aan ? "Volledig scherm uit" : "Volledig scherm"}>
      <Icoon naam={vs.aan ? "kleinscherm" : "volscherm"} />
    </button>
  );
}

export function HandleidingKnop({ className = "" }) {
  return (
    <a className={`hulpknop ${className}`} href={HANDLEIDING} target="_blank" rel="noreferrer" aria-label="Handleiding (PDF)" title="Handleiding">
      <Icoon naam="boek" />
    </a>
  );
}

export function InstallerenBlad({ open, onSluit }) {
  const inst = useInstalleren();
  const [klaar, setKlaar] = useState(false);
  const ios = isIOS();
  return (
    <Blad open={open} onSluit={onSluit} titel="Zet Toppers op je telefoon" label="App installeren">
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
