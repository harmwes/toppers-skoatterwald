import { useEffect, useState } from "react";
import { WeerIcoon } from "./Icoon.jsx";
import Icoon from "./Icoon.jsx";
import { beaufort, BFT_NAAM, windstreek, windstreekLang, weerOmschrijving, urenVanRit, haalWeer } from "../lib/weer.js";
import { startMoment, hhmm } from "../lib/tijd.js";

export function useWeer(rit) {
  const [staat, setStaat] = useState({ laden: true });
  const start = rit?.route?.punten?.[0];
  useEffect(() => {
    if (!rit || !start) { setStaat({ laden: false }); return; }
    let weg = false;
    setStaat({ laden: true });
    haalWeer(start[0], start[1], rit.datum)
      .then((w) => !weg && setStaat({ laden: false, weer: w }))
      .catch(() => !weg && setStaat({ laden: false, fout: "Het weer is nu even niet op te halen. Probeer het straks opnieuw." }));
    return () => { weg = true; };
  }, [rit?.id, rit?.datum, start?.[0], start?.[1]]);
  return staat;
}

export function WindKompas({ richting, kmh, grootte = 120 }) {
  const [hoek, setHoek] = useState(richting - 90);
  useEffect(() => { const t = requestAnimationFrame(() => setHoek(richting)); return () => cancelAnimationFrame(t); }, [richting]);
  const bft = beaufort(kmh);
  return (
    <div className="kompas" style={{ width: grootte, height: grootte }}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="55" fill="#0c0d0f" stroke="#2c3036" strokeWidth="2" />
        {Array.from({ length: 36 }).map((_, i) => (
          <line key={i} x1="60" y1="8" x2="60" y2={i % 9 === 0 ? 16 : 12} stroke={i % 9 === 0 ? "#f3f0e7" : "#3a3f46"} strokeWidth={i % 9 === 0 ? 2 : 1.3} transform={`rotate(${i * 10} 60 60)`} />
        ))}
        <text x="60" y="27" textAnchor="middle" className="kompas-letter">N</text>
        <text x="95" y="64" textAnchor="middle" className="kompas-letter">O</text>
        <text x="60" y="100" textAnchor="middle" className="kompas-letter">Z</text>
        <text x="25" y="64" textAnchor="middle" className="kompas-letter">W</text>
        <g style={{ transform: `rotate(${hoek}deg)`, transformOrigin: "60px 60px", transition: "transform 1.4s cubic-bezier(.2,.9,.25,1.15)" }}>
          {/* staart bij de windbron, pijlpunt benedenwinds */}
          <path d="M60 14 L60 88" stroke="#f3f0e7" strokeWidth="3" strokeLinecap="round" />
          <path d="M60 104 L51 86 L60 90 L69 86 Z" fill="#f3f0e7" />
          <path d="M60 14 l-7 -2 M60 20 l-7 -2 M60 26 l-7 -2" stroke="#e5322d" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="60" cy="60" r="15" fill="#e5322d" />
        <text x="60" y="66" textAnchor="middle" className="kompas-bft">{bft}</text>
      </svg>
    </div>
  );
}

export function WeerBlok({ rit, staat, wind }) {
  if (staat.laden) return <div className="kaart pad weerblok"><div className="skelet" style={{ height: 150 }} /></div>;
  if (staat.fout) return <div className="kaart pad weerblok klein"><Icoon naam="info" className="i18" /> {staat.fout}</div>;
  const w = staat.weer;
  if (!w) return null;
  if (!w.beschikbaar) {
    const v = w.vanaf;
    return (
      <div className="kaart pad weerblok weer-later">
        <WeerIcoon icoon="halfzon" className="weer-later-icoon" />
        <div>
          <div className="dik">Nog te ver weg voor een betrouwbare verwachting</div>
          <div className="klein">Vanaf {v.getDate()}-{v.getMonth() + 1} verschijnt hier het weer en de wind op de route.</div>
        </div>
      </div>
    );
  }
  const uren = urenVanRit(w, rit);
  const startUur = startMoment(rit).getHours();
  const nu = w.uren.find((u) => u.uur === startUur) || uren[0] || w.uren[12];
  const oms = weerOmschrijving(nu.code);
  const maxKans = Math.max(0, ...uren.map((u) => u.kans ?? 0));
  const bft = beaufort(nu.wind);
  const verleden = w.vooruit < 0;
  return (
    <div className="kaart weerblok">
      <div className="weer-hoofd">
        <div className="weer-nu">
          <div className="label">{verleden ? "Weer tijdens de rit" : `Verwachting om ${rit.starttijd}`}</div>
          <div className="weer-temp">
            <WeerIcoon icoon={oms.icoon} className="weer-groot" />
            <span className="tab">{Math.round(nu.temp)}°</span>
          </div>
          <div className="weer-oms">{oms.tekst}{nu.gevoel != null && Math.abs(nu.gevoel - nu.temp) >= 2 ? ` · voelt als ${Math.round(nu.gevoel)}°` : ""}</div>
          <div className="weer-kans"><Icoon naam="druppel" className="i16" /> {maxKans}% kans op regen tijdens de rit</div>
        </div>
        <div className="weer-wind">
          <WindKompas richting={nu.richting} kmh={nu.wind} />
          <div className="wind-tekst">
            <b>{bft} Bft</b> {BFT_NAAM[bft]}<br />
            uit het {windstreekLang(nu.richting)}<br />
            <span className="klein tab">{Math.round(nu.wind)} km/u · vlagen {Math.round(nu.vlagen ?? nu.wind)}</span>
          </div>
        </div>
      </div>
      {uren.length > 1 && (
        <div className="uurstrook" role="list" aria-label="Weer per uur tijdens de rit">
          {uren.map((u) => (
            <div key={u.uur} className="uur" role="listitem">
              <span className="klein tab">{String(u.uur).padStart(2, "0")}:00</span>
              <WeerIcoon icoon={weerOmschrijving(u.code).icoon} className="i26" />
              <b className="tab">{Math.round(u.temp)}°</b>
              <svg viewBox="0 0 24 24" className="uurpijl" style={{ transform: `rotate(${u.richting + 180}deg)` }} aria-hidden="true"><path d="M12 3l5 12-5-3-5 3z" fill="currentColor" /></svg>
              <span className="klein tab">{beaufort(u.wind)} Bft {windstreek(u.richting)}</span>
              {u.kans != null && <span className={`uurkans tab ${u.kans >= 50 ? "hoog" : ""}`}>{u.kans}%</span>}
            </div>
          ))}
        </div>
      )}
      {wind && (
        <div className="windroute">
          <div className="label">Wind op de route</div>
          <div className="windbalk" aria-hidden="true">
            <i style={{ width: `${wind.pct.tegen}%`, background: "var(--tegen)" }} />
            <i style={{ width: `${wind.pct.zij}%`, background: "var(--zij)" }} />
            <i style={{ width: `${wind.pct.mee}%`, background: "var(--mee)" }} />
          </div>
          <div className="windcijfers tab">
            <span><i style={{ background: "var(--tegen)" }} />{wind.pct.tegen}% tegen</span>
            <span><i style={{ background: "var(--zij)" }} />{wind.pct.zij}% zij</span>
            <span><i style={{ background: "var(--mee)" }} />{wind.pct.mee}% mee</span>
          </div>
          <p className="windadvies">{wind.advies}</p>
          {wind.waaierAlarm && (
            <div className="melding let waaier"><Icoon naam="wind" /><div><b>Waaieralarm.</b> Ongeveer {wind.waaierKm} km harde zijwind. Rijd in een waaier en houd de rand vrij.</div></div>
          )}
        </div>
      )}
      {w.zonOnder && <div className="zonregel klein tab"><Icoon naam="zon" className="i16" /> Zon op {w.zonOp} · onder {w.zonOnder}</div>}
    </div>
  );
}

export function WeerChip({ rit }) {
  const staat = useWeer(rit);
  const w = staat.weer;
  if (!w?.beschikbaar) return null;
  const uur = startMoment(rit).getHours();
  const u = w.uren.find((x) => x.uur === uur);
  if (!u) return null;
  return (
    <span className="weerchip tab">
      <WeerIcoon icoon={weerOmschrijving(u.code).icoon} className="i18" />
      {Math.round(u.temp)}°
      <svg viewBox="0 0 24 24" className="i14" style={{ transform: `rotate(${u.richting + 180}deg)` }} aria-hidden="true"><path d="M12 3l5 12-5-3-5 3z" fill="currentColor" /></svg>
      {beaufort(u.wind)} Bft
    </span>
  );
}

export { hhmm };
