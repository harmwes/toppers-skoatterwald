import { useEffect, useMemo, useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../lib/api.js";
import Icoon from "../components/Icoon.jsx";
import { Rugnummer } from "../components/Merk.jsx";
import RouteKaart from "../components/RouteKaart.jsx";
import Etappeprofiel from "../components/Etappeprofiel.jsx";
import { WeerBlok, useWeer } from "../components/Weer.jsx";
import { TypeChip } from "../components/RitKaartje.jsx";
import { windLangsRoute } from "../lib/weer.js";
import { TYPES, datumLang, rijduurMin, duurTekst, eindMoment, hhmm, thuisAnalyse, tempoVan, startMoment, relatief } from "../lib/tijd.js";
import { km } from "../lib/gpx.js";

const THUIS_SNEL = (rit) => {
  const eind = eindMoment(rit);
  const opties = [];
  const basis = new Date(startMoment(rit));
  basis.setMinutes(0, 0, 0);
  for (let i = 1; i <= 8; i++) {
    const t = new Date(basis.getTime() + i * 3600000);
    if (t > startMoment(rit) && t < new Date(eind.getTime() + 3600000)) opties.push(hhmm(t));
  }
  return opties.slice(-4);
};

function Aanmelden({ rit, mijn, onGewijzigd }) {
  const [status, setStatus] = useState(mijn?.status || null);
  const [thuis, setThuis] = useState(mijn?.thuis || "");
  const [notitie, setNotitie] = useState(mijn?.notitie || "");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [bewaard, setBewaard] = useState(false);
  const verleden = eindMoment(rit) < new Date();

  async function bewaar(nieuw) {
    const s = { status, thuis, notitie, ...nieuw };
    setStatus(s.status); setThuis(s.thuis); setBezig(true); setFout(""); setBewaard(false);
    try {
      await api(`ritten/${rit.id}/aanmelding`, { methode: "PUT", body: { status: s.status, thuis: s.status === "nee" ? null : s.thuis || null, notitie: s.notitie } });
      if (s.status === "ja" && navigator.vibrate) navigator.vibrate(18);
      setBewaard(true);
      onGewijzigd();
    } catch (e) { setFout(e.message); }
    setBezig(false);
  }

  const analyse = status && status !== "nee" && thuis ? thuisAnalyse(rit, thuis) : null;

  if (verleden) {
    return (
      <div className="kaart pad aanmelden">
        <div className="label">Deze rit is gereden</div>
        <p className="klein" style={{ margin: "6px 0 0" }}>{mijn?.status === "ja" ? "Jij stond op de startlijst. Chapeau." : "Je stond niet op de startlijst."}</p>
      </div>
    );
  }

  return (
    <div className={`kaart pad aanmelden ${status || ""}`}>
      <div className="aanmelden-kop">
        <h3>Rij je mee?</h3>
        {bewaard && !bezig && <span className="bewaard"><Icoon naam="vink" />Opgeslagen</span>}
      </div>
      <div className="keuze3" role="radiogroup" aria-label="Rij je mee?">
        <button role="radio" aria-checked={status === "ja"} className={`k-ja ${status === "ja" ? "aan" : ""}`} onClick={() => bewaar({ status: "ja" })} disabled={bezig}>
          <Icoon naam="vink" /><span>Ik rijd mee</span>
        </button>
        <button role="radio" aria-checked={status === "misschien"} className={`k-misschien ${status === "misschien" ? "aan" : ""}`} onClick={() => bewaar({ status: "misschien" })} disabled={bezig}>
          <b>?</b><span>Misschien</span>
        </button>
        <button role="radio" aria-checked={status === "nee"} className={`k-nee ${status === "nee" ? "aan" : ""}`} onClick={() => bewaar({ status: "nee" })} disabled={bezig}>
          <Icoon naam="kruis" /><span>Ik pas</span>
        </button>
      </div>

      {status && status !== "nee" && (
        <div className="thuis">
          <div className="label"><Icoon naam="huis" className="i16" /> Uiterlijk thuis om</div>
          <div className="thuis-keuzes">
            <button className={`filter ${!thuis ? "aan" : ""}`} onClick={() => bewaar({ thuis: "" })}>Geen haast</button>
            {THUIS_SNEL(rit).map((t) => (
              <button key={t} className={`filter tab ${thuis === t ? "aan" : ""}`} onClick={() => bewaar({ thuis: t })}>{t}</button>
            ))}
            <label className={`filter tijdkiezer ${thuis && !THUIS_SNEL(rit).includes(thuis) ? "aan" : ""}`}>
              <Icoon naam="klok" className="i16" />
              <input type="time" value={thuis} onChange={(e) => setThuis(e.target.value)} onBlur={(e) => e.target.value !== (mijn?.thuis || "") && bewaar({ thuis: e.target.value })} aria-label="Andere tijd" />
            </label>
          </div>
          {analyse && (
            <div className={`thuis-uitkomst ${analyse.heleRit ? "goed" : "kort"}`}>
              {analyse.heleRit && <>Je rijdt de hele etappe uit. Verwachte finish ±{hhmm(analyse.eind)}, ruim op tijd thuis.</>}
              {analyse.nietHaalbaar && <>Dat wordt krap: de rit duurt tot ±{hhmm(analyse.eind)}. Misschien een korter rondje?</>}
              {analyse.afhaakKm && <>Haak af rond <b>km {Math.round(analyse.afhaakKm / 1000)}</b>, dan is het nog ±{Math.round(analyse.terugKm / 1000)} km naar huis. Het afhaakpunt staat op de kaart.</>}
            </div>
          )}
          <label className="veld notitieveld">
            <span>Opmerking voor de groep (optioneel)</span>
            <input className="invoer" maxLength={140} value={notitie} placeholder="Bijvoorbeeld: ik sluit aan bij de brug" onChange={(e) => setNotitie(e.target.value)} onBlur={() => notitie !== (mijn?.notitie || "") && bewaar({})} />
          </label>
        </div>
      )}
      {fout && <div className="melding fout" style={{ marginTop: 12 }}><Icoon naam="let" />{fout}</div>}
    </div>
  );
}

function Startlijst({ rit }) {
  const groepen = [
    ["ja", "Op de startlijst"],
    ["misschien", "Twijfelt nog"],
    ["nee", "Past deze keer"],
  ];
  const a = rit.aanmeldingen;
  if (!a.length) return <p className="klein">Nog niemand heeft zich aangemeld. Wees de eerste.</p>;
  return (
    <div className="startlijst">
      {groepen.map(([s, titel]) => {
        const rij = a.filter((x) => x.status === s).sort((x, y) => x.rugnummer - y.rugnummer);
        if (!rij.length) return null;
        return (
          <div key={s} className={`sl-groep ${s}`}>
            <div className="label">{titel} <span className="tab">({rij.length})</span></div>
            {rij.map((x) => {
              const an = x.thuis && s !== "nee" ? thuisAnalyse(rit, x.thuis) : null;
              return (
                <div key={x.lidId} className="sl-rij">
                  <Rugnummer nummer={x.rugnummer} schaal={0.8} />
                  <div className="sl-naam">
                    <b>{x.naam}</b>
                    {x.notitie && <span className="klein">“{x.notitie}”</span>}
                  </div>
                  {x.thuis && s !== "nee" && (
                    <div className={`sl-thuis tab ${an && !an.heleRit ? "kort" : ""}`}>
                      <Icoon naam="huis" className="i14" />{x.thuis}
                      {an?.afhaakKm && <em>tot km {Math.round(an.afhaakKm / 1000)}</em>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function Rit({ id }) {
  const { lid, ga } = useApp();
  const [rit, setRit] = useState(null);
  const [fout, setFout] = useState("");
  const [laag, setLaag] = useState("route");
  const [markeer, setMarkeer] = useState(null);
  const weerStaat = useWeer(rit);

  const laad = () => api(`ritten/${id}`).then((r) => setRit(r.rit)).catch((e) => setFout(e.message));
  useEffect(() => { laad(); }, [id]);

  const wind = useMemo(() => (rit && weerStaat.weer ? windLangsRoute(rit, weerStaat.weer) : null), [rit, weerStaat.weer]);
  useEffect(() => { if (wind) setLaag("wind"); }, [!!wind]);

  if (fout) return <div className="pagina"><button className="terug" onClick={() => ga("/")}><Icoon naam="terug" className="i18" />Ritten</button><div className="melding fout" style={{ marginTop: 16 }}><Icoon naam="let" />{fout}</div></div>;
  if (!rit) return <div className="pagina"><div className="skelet" style={{ height: 60, marginBottom: 14 }} /><div className="skelet" style={{ height: 340 }} /></div>;

  const mijn = rit.aanmeldingen.find((a) => a.lidId === lid.id);
  const mijnAnalyse = mijn && mijn.status !== "nee" && mijn.thuis ? thuisAnalyse(rit, mijn.thuis) : null;
  const t = TYPES[rit.type];

  async function deel() {
    const url = window.location.href;
    const tekst = `${rit.titel} · ${datumLang(rit.datum)} ${rit.starttijd} · ${km(rit.route?.afstand || 0, 0)} km`;
    if (navigator.share) { try { await navigator.share({ title: rit.titel, text: tekst, url }); } catch {} }
    else { try { await navigator.clipboard.writeText(`${tekst}\n${url}`); alert("Link gekopieerd"); } catch {} }
  }

  return (
    <div className="pagina breed ritpagina">
      <div className="topbalk">
        <button className="terug" onClick={() => (history.length > 1 ? history.back() : ga("/"))}><Icoon naam="terug" className="i18" />Ritten</button>
        <div className="topknoppen">
          {lid.rol === "admin" && <button className="icoonknop" onClick={() => ga(`/admin/rit/${rit.id}`)} aria-label="Rit bewerken"><Icoon naam="bewerk" /></button>}
          <button className="icoonknop" onClick={deel} aria-label="Delen"><Icoon naam="delen" /></button>
          <a className="icoonknop" href={`/api/ritten/${rit.id}/gpx`} download aria-label="GPX downloaden"><Icoon naam="download" /></a>
        </div>
      </div>

      <div className="rit-raster">
        <div className="rit-links">
          <header className="rit-kop" style={{ viewTransitionName: `rit-${rit.id}` }}>
            <div className="rit-meta"><TypeChip type={rit.type} /><span className="label">{relatief(rit.datum)}</span></div>
            <h1>{rit.titel}</h1>
            <div className="rit-wanneer">{datumLang(rit.datum)} · start {rit.starttijd}</div>
            {rit.startplek && <div className="rit-plek"><Icoon naam="pin" className="i16" />{rit.startplek}</div>}
          </header>

          <div className="kaartvak">
            {rit.route ? (
              <>
                <RouteKaart route={rit.route} type={rit.type} wind={wind} toonWind={laag === "wind"} afhaak={mijnAnalyse?.punt} markeer={markeer} kmMarkers className="grote-kaart" />
                <div className="kaartschakel" role="tablist">
                  <button role="tab" aria-selected={laag === "route"} className={laag === "route" ? "aan" : ""} onClick={() => setLaag("route")}>Route</button>
                  <button role="tab" aria-selected={laag === "wind"} className={laag === "wind" ? "aan" : ""} onClick={() => setLaag("wind")} disabled={!wind}><Icoon naam="wind" className="i16" />Windlijnen</button>
                </div>
                {laag === "wind" && wind && (
                  <div className="kaartlegenda"><span><i style={{ background: "var(--tegen)" }} />tegen</span><span><i style={{ background: "var(--zij)" }} />zij</span><span><i style={{ background: "var(--mee)" }} />mee</span></div>
                )}
              </>
            ) : <div className="klein pad">Geen route bij deze rit.</div>}
          </div>

          {rit.route && (
            <div className="statbalk tab">
              <div><b>{km(rit.route.afstand)}</b><span>km</span></div>
              <div><b>{rit.route.stijging}</b><span>hm</span></div>
              <div><b>{duurTekst(rijduurMin(rit))}</b><span>rijtijd</span></div>
              <div><b>{hhmm(eindMoment(rit))}</b><span>finish</span></div>
              <div><b>{tempoVan(rit)}</b><span>km/u</span></div>
            </div>
          )}

          {rit.route && (
            <section className="kaart profielkaart">
              <div className="sectiekop pad-x"><h3>Etappeprofiel</h3><span className="klein">Sleep over het profiel</span></div>
              <Etappeprofiel route={rit.route} onScrub={setMarkeer} />
            </section>
          )}
        </div>

        <div className="rit-rechts">
          <Aanmelden rit={rit} mijn={mijn} onGewijzigd={laad} />

          <section className="sectie">
            <div className="sectiekop"><h2>Weer & wind</h2></div>
            <WeerBlok rit={rit} staat={weerStaat} wind={wind} />
          </section>

          <section className="sectie">
            <div className="sectiekop"><h2>Startlijst</h2><span className="label tab">{rit.aanmeldingen.filter((a) => a.status === "ja").length} rijders</span></div>
            <div className="kaart pad"><Startlijst rit={rit} /></div>
          </section>

          {rit.omschrijving && (
            <section className="sectie">
              <div className="sectiekop"><h2>Van de organisatie</h2></div>
              <div className="kaart pad omschrijving">{rit.omschrijving}</div>
            </section>
          )}

          <section className="sectie gpxvak">
            <a className="knop krijt vol" href={`/api/ritten/${rit.id}/gpx`} download><Icoon naam="download" />Download GPX</a>
            <p className="klein">Zet het bestand op je Garmin, Wahoo, Hammerhead of in Komoot en Strava. {rit.gpxNaam && <span className="gpxnaam">{rit.gpxNaam}</span>}</p>
            <button className="knop stil vol" onClick={() => ga(`/peloton?rit=${rit.id}`)}><Icoon naam="chat" />Bespreek deze rit in het peloton</button>
          </section>
          <p className="klein gemaakt">{t.lang} · gepland door {rit.gemaaktDoor || "de organisatie"}</p>
        </div>
      </div>
    </div>
  );
}
