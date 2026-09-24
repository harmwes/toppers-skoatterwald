import { useEffect, useMemo, useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../lib/api.js";
import { Logo } from "../components/Merk.jsx";
import Icoon from "../components/Icoon.jsx";
import RitKaartje, { LuieKaart, TypeChip, Rijders, MijnStatus } from "../components/RitKaartje.jsx";
import { WeerChip } from "../components/Weer.jsx";
import { TYPES, startMoment, eindMoment, aftellen, datumLang, relatief, hhmm } from "../lib/tijd.js";
import { km } from "../lib/gpx.js";

function groet(naam) {
  const u = new Date().getHours();
  const deel = u < 6 ? "Goeienacht" : u < 12 ? "Goeiemoarn" : u < 18 ? "Goeiemiddei" : "Goejûn";
  return `${deel}, ${naam.split(" ")[0]}`;
}

function Aftellen({ doel }) {
  const [nu, setNu] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNu(new Date()), 1000); return () => clearInterval(t); }, []);
  const a = aftellen(doel, nu);
  if (a.voorbij) return <div className="aftellen bezig"><span className="live" />Onderweg</div>;
  return (
    <div className="aftellen tab" aria-label={`Nog ${a.d} dagen, ${a.u} uur en ${a.m} minuten tot de start`}>
      {a.d > 0 && <span><b>{a.d}</b><i>dag{a.d === 1 ? "" : "en"}</i></span>}
      <span><b>{String(a.u).padStart(2, "0")}</b><i>uur</i></span>
      <span><b>{String(a.m).padStart(2, "0")}</b><i>min</i></span>
      {a.d === 0 && <span><b>{String(a.s).padStart(2, "0")}</b><i>sec</i></span>}
    </div>
  );
}

function Volgende({ rit, lidId, onOpen }) {
  return (
    <section className="volgende" style={{ viewTransitionName: `rit-${rit.id}` }}>
      <div className="vg-kaart" onClick={onOpen}>
        <LuieKaart route={rit.route} type={rit.type} />
        <div className="vg-verloop" />
        <div className="vg-bovenop">
          <span className="label vg-label">Volgende start · {relatief(rit.datum)}</span>
          <TypeChip type={rit.type} />
        </div>
      </div>
      <div className="vg-info">
        <h2 className="vg-titel">{rit.titel}</h2>
        <div className="vg-datum">{datumLang(rit.datum)} · {rit.starttijd}{rit.route ? ` – ±${hhmm(eindMoment(rit))}` : ""}</div>
        <Aftellen doel={startMoment(rit)} />
        <div className="vg-feiten tab">
          {rit.route && <div><b>{km(rit.route.afstand, 0)}</b><span>km</span></div>}
          {rit.route && <div><b>{rit.route.stijging}</b><span>hoogtemeters</span></div>}
          <div><b>{rit.tempo || TYPES[rit.type].tempo}</b><span>km/u tempo</span></div>
          <div className="vg-weer"><WeerChip rit={rit} /></div>
        </div>
        {rit.startplek && <div className="vg-plek klein"><Icoon naam="pin" className="i16" /> {rit.startplek}</div>}
        <div className="vg-voet">
          <Rijders aanmeldingen={rit.aanmeldingen} max={7} />
          <MijnStatus aanmeldingen={rit.aanmeldingen} lidId={lidId} />
        </div>
        <button className="knop primair vol" onClick={onOpen}>Bekijk de etappe <Icoon naam="verder" /></button>
      </div>
    </section>
  );
}

export default function Ritten() {
  const { lid, ga } = useApp();
  const [ritten, setRitten] = useState(null);
  const [fout, setFout] = useState("");
  const [filter, setFilter] = useState("alles");
  const [alleOud, setAlleOud] = useState(false);

  useEffect(() => {
    api("ritten").then((r) => setRitten(r.ritten)).catch((e) => setFout(e.message));
  }, []);

  const { komend, verleden } = useMemo(() => {
    const nu = new Date();
    const lijst = (ritten || []).filter((r) => filter === "alles" || r.type === filter);
    const komend = lijst.filter((r) => (r.route ? eindMoment(r) : startMoment(r)) >= nu);
    const verleden = lijst.filter((r) => !komend.includes(r)).reverse();
    return { komend, verleden };
  }, [ritten, filter]);

  const volgende = komend[0];
  const rest = komend.slice(1);

  return (
    <div className="pagina">
      <header className="ritten-kop">
        <Logo className="alleen-mobiel" />
        <div className="groet">
          <span className="label">{groet(lid.naam)}</span>
        </div>
      </header>

      {lid.wachtwoordStandaard && (
        <button className="melding let klikbaar" onClick={() => ga("/profiel")}>
          <Icoon naam="sleutel" /><span>Je gebruikt nog je startwachtwoord. <u>Kies nu je eigen wachtwoord.</u></span>
        </button>
      )}

      {fout && <div className="melding fout"><Icoon naam="let" />{fout}</div>}

      {!ritten && !fout && <div className="skelet" style={{ height: 420, marginTop: 8 }} />}

      {ritten && (
        <>
          <div className="filters" role="tablist" aria-label="Soort rit">
            {["alles", "race", "gravel", "atb"].map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} className={`filter ${filter === f ? "aan" : ""}`} onClick={() => setFilter(f)}>
                {f !== "alles" && <i style={{ background: TYPES[f].kleur }} />}
                {f === "alles" ? "Alles" : TYPES[f].naam}
              </button>
            ))}
          </div>

          {volgende ? (
            <Volgende rit={volgende} lidId={lid.id} onOpen={() => ga(`/rit/${volgende.id}`)} />
          ) : (
            <div className="leeg">
              <svg viewBox="0 0 200 80" className="leeg-weg" aria-hidden="true"><path d="M0 60 Q 50 20 100 50 T 200 30" /></svg>
              <h3>Nog geen rit gepland</h3>
              <p className="klein">{lid.rol === "admin" ? "Plan de eerste rit via Admin. Upload een GPX en de groep ziet hem meteen." : "Zodra de organisatie een rit plant, zie je hem hier."}</p>
              {lid.rol === "admin" && <button className="knop primair" onClick={() => ga("/admin/rit/nieuw")}><Icoon naam="plus" />Rit plannen</button>}
            </div>
          )}

          {rest.length > 0 && (
            <section className="sectie">
              <div className="sectiekop"><h2>Kalender</h2><span className="label tab">{rest.length} gepland</span></div>
              <div className="ritlijst">
                {rest.map((r) => <RitKaartje key={r.id} rit={r} lidId={lid.id} onOpen={() => ga(`/rit/${r.id}`)} />)}
              </div>
            </section>
          )}

          {verleden.length > 0 && (
            <section className="sectie">
              <div className="sectiekop"><h2>Gereden</h2><span className="label tab">{verleden.length} {verleden.length === 1 ? "rit" : "ritten"}</span></div>
              <div className="ritlijst">
                {(alleOud ? verleden : verleden.slice(0, 3)).map((r) => <RitKaartje key={r.id} rit={r} lidId={lid.id} verleden onOpen={() => ga(`/rit/${r.id}`)} />)}
              </div>
              {verleden.length > 3 && !alleOud && <button className="knop stil vol" style={{ marginTop: 12 }} onClick={() => setAlleOud(true)}>Toon alle gereden ritten</button>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
