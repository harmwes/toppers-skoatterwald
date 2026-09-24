import { useEffect, useRef, useState } from "react";
import RouteKaart from "./RouteKaart.jsx";
import { Rugnummer } from "./Merk.jsx";
import Icoon, { TypeIcoon } from "./Icoon.jsx";
import { WeerChip } from "./Weer.jsx";
import { TYPES, datumKort, relatief, rijduurMin, duurTekst } from "../lib/tijd.js";
import { km } from "../lib/gpx.js";

export function LuieKaart(props) {
  const ref = useRef(null);
  const [zichtbaar, setZichtbaar] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setZichtbaar(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`luiekaart ${props.className || ""}`}>{zichtbaar ? <RouteKaart {...props} className="" interactief={false} /> : <div className="skelet vol" />}</div>;
}

export function TypeChip({ type }) {
  return <span className={`typechip ${type}`}><TypeIcoon type={type} />{TYPES[type]?.naam}</span>;
}

export function Rijders({ aanmeldingen, max = 6 }) {
  const ja = aanmeldingen.filter((a) => a.status === "ja").sort((a, b) => a.rugnummer - b.rugnummer);
  if (!ja.length) return <span className="klein">Nog niemand op de startlijst</span>;
  return (
    <span className="rijders">
      <span className="rij-bibs">
        {ja.slice(0, max).map((a) => <Rugnummer key={a.lidId} nummer={a.rugnummer} schaal={0.62} />)}
      </span>
      <span className="klein tab">{ja.length} {ja.length === 1 ? "rijder" : "rijders"}</span>
    </span>
  );
}

export function MijnStatus({ aanmeldingen, lidId }) {
  const mijn = aanmeldingen.find((a) => a.lidId === lidId);
  if (!mijn) return <span className="mijnstatus open">Geef je op</span>;
  const tekst = { ja: "Je rijdt mee", nee: "Je past", misschien: "Misschien" }[mijn.status];
  return <span className={`mijnstatus ${mijn.status}`}>{mijn.status === "ja" && <Icoon naam="vink" />}{tekst}{mijn.thuis ? ` · thuis ${mijn.thuis}` : ""}</span>;
}

export default function RitKaartje({ rit, lidId, onOpen, verleden }) {
  const d = datumKort(rit.datum);
  return (
    <div role="link" tabIndex={0} className={`ritkaartje ${verleden ? "verleden" : ""}`} onClick={onOpen} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())} aria-label={`${rit.titel}, ${rit.datum}`}>
      <div className="rk-kaart">
        {rit.route && <LuieKaart route={rit.route} type={rit.type} />}
        <div className="rk-datum">
          <span>{d.dag}</span><b className="tab">{d.nr}</b><span>{d.maand}</span>
        </div>
        <div className="rk-type"><TypeChip type={rit.type} /></div>
      </div>
      <div className="rk-info">
        <div className="rk-kop">
          <h3>{rit.titel}</h3>
          {!verleden && <WeerChip rit={rit} />}
        </div>
        <div className="rk-feiten tab">
          <span><Icoon naam="klok" />{rit.starttijd}</span>
          {rit.route && <span><Icoon naam="afstand" />{km(rit.route.afstand, 0)} km</span>}
          {rit.route?.stijging > 0 && <span><Icoon naam="berg" />{rit.route.stijging} hm</span>}
          {rit.route && <span className="rk-duur">±{duurTekst(rijduurMin(rit))}</span>}
        </div>
        <div className="rk-voet">
          <Rijders aanmeldingen={rit.aanmeldingen} max={5} />
          {verleden ? <span className="klein">{relatief(rit.datum)}</span> : <MijnStatus aanmeldingen={rit.aanmeldingen} lidId={lidId} />}
        </div>
      </div>
    </div>
  );
}
