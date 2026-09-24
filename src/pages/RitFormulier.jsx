import { useEffect, useRef, useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../lib/api.js";
import { leesGpx, km } from "../lib/gpx.js";
import { TYPES, rijduurMin, duurTekst } from "../lib/tijd.js";
import Icoon, { TypeIcoon } from "../components/Icoon.jsx";
import RouteKaart from "../components/RouteKaart.jsx";
import Etappeprofiel from "../components/Etappeprofiel.jsx";

function volgendeZondag() {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RitFormulier({ id }) {
  const { ga } = useApp();
  const [rit, setRit] = useState(id ? null : { titel: "", type: "race", datum: volgendeZondag(), starttijd: "09:00", startplek: "", omschrijving: "", tempo: "" });
  const [route, setRoute] = useState(null);
  const [gpx, setGpx] = useState(null);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const [sleep, setSleep] = useState(false);
  const [markeer, setMarkeer] = useState(null);
  const bestand = useRef(null);

  useEffect(() => {
    if (!id) return;
    api(`ritten/${id}`).then((r) => { setRit({ ...r.rit, tempo: r.rit.tempo || "" }); setRoute(r.rit.route); }).catch((e) => setFout(e.message));
  }, [id]);

  async function leesBestand(f) {
    if (!f) return;
    setFout("");
    if (f.size > 5 * 1024 * 1024) return setFout("Dit GPX-bestand is groter dan 5 MB.");
    try {
      const tekst = await f.text();
      const r = leesGpx(tekst);
      setRoute(r);
      setGpx({ naam: f.name, tekst });
      if (!rit.titel && r.naam) setRit((x) => ({ ...x, titel: r.naam.slice(0, 80) }));
    } catch (e) { setFout(e.message); }
  }

  async function bewaar(e) {
    e.preventDefault();
    setFout("");
    if (!id && !gpx) return setFout("Voeg eerst een GPX-bestand toe.");
    setBezig(true);
    try {
      const body = { titel: rit.titel, type: rit.type, datum: rit.datum, starttijd: rit.starttijd, startplek: rit.startplek, omschrijving: rit.omschrijving, tempo: rit.tempo || null };
      if (gpx) { body.gpx = gpx; body.route = route; }
      const r = await api(id ? `admin/ritten/${id}` : "admin/ritten", { methode: id ? "PUT" : "POST", body });
      ga(`/rit/${r.rit.id}`, { vervang: true });
    } catch (err) { setFout(err.message); setBezig(false); }
  }

  if (!rit) return <div className="pagina">{fout ? <div className="melding fout">{fout}</div> : <div className="skelet" style={{ height: 400 }} />}</div>;
  const voorbeeld = route ? { ...rit, route, tempo: Number(rit.tempo) || null } : null;

  return (
    <div className="pagina breed ritformulier">
      <div className="topbalk">
        <button className="terug" onClick={() => ga("/admin")}><Icoon naam="terug" className="i18" />Admin</button>
      </div>
      <h1>{id ? "Rit bewerken" : "Nieuwe rit"}</h1>

      <form onSubmit={bewaar} className="rf-raster">
        <div className="rf-links">
          <div
            className={`gpxdrop ${sleep ? "sleep" : ""} ${route ? "gevuld" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setSleep(true); }}
            onDragLeave={() => setSleep(false)}
            onDrop={(e) => { e.preventDefault(); setSleep(false); leesBestand(e.dataTransfer.files?.[0]); }}
          >
            {route ? (
              <>
                <RouteKaart route={route} type={rit.type} markeer={markeer} kmMarkers className="rf-kaart" />
                <div className="rf-stats tab">
                  <span><b>{km(route.afstand)}</b> km</span>
                  <span><b>{route.stijging}</b> hm</span>
                  <span><b>{duurTekst(rijduurMin(voorbeeld))}</b> rijtijd</span>
                  <span>{route.rondrit ? "Rondrit" : "Van A naar B"}</span>
                </div>
                <Etappeprofiel route={route} onScrub={setMarkeer} compact />
                <button type="button" className="knop klein" onClick={() => bestand.current?.click()}><Icoon naam="upload" />Andere GPX kiezen</button>
                {gpx && <span className="klein gpxnaam">{gpx.naam}</span>}
              </>
            ) : (
              <button type="button" className="gpxdrop-knop" onClick={() => bestand.current?.click()}>
                <Icoon naam="upload" />
                <b>GPX uploaden</b>
                <span className="klein">Tik om een bestand te kiezen, of sleep het hierheen. Uit Komoot, Strava, Garmin of RideWithGPS.</span>
              </button>
            )}
            <input ref={bestand} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" hidden onChange={(e) => { leesBestand(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        </div>

        <div className="rf-rechts">
          {fout && <div className="melding fout"><Icoon naam="let" />{fout}</div>}
          <div className="veld">
            <span>Soort rit</span>
            <div className="typekeuze" role="radiogroup">
              {Object.entries(TYPES).map(([k, t]) => (
                <button type="button" key={k} role="radio" aria-checked={rit.type === k} className={`typetegel ${k} ${rit.type === k ? "aan" : ""}`} onClick={() => setRit({ ...rit, type: k })}>
                  <TypeIcoon type={k} /><span>{t.naam}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="veld"><span>Naam van de rit</span><input className="invoer" required maxLength={80} value={rit.titel} onChange={(e) => setRit({ ...rit, titel: e.target.value })} placeholder="Rondje Gaasterland" /></label>
          <div className="rij2">
            <label className="veld"><span>Datum</span><input className="invoer" type="date" required value={rit.datum} onChange={(e) => setRit({ ...rit, datum: e.target.value })} /></label>
            <label className="veld"><span>Starttijd</span><input className="invoer" type="time" required value={rit.starttijd} onChange={(e) => setRit({ ...rit, starttijd: e.target.value })} /></label>
          </div>
          <label className="veld"><span>Startplek</span><input className="invoer" maxLength={120} value={rit.startplek} onChange={(e) => setRit({ ...rit, startplek: e.target.value })} placeholder="Bijvoorbeeld: parkeerplaats Skoatterwâld" /></label>
          <label className="veld"><span>Tempo in km/u (leeg = {TYPES[rit.type].tempo} voor {TYPES[rit.type].naam.toLowerCase()})</span><input className="invoer tab" type="number" min={8} max={45} value={rit.tempo} onChange={(e) => setRit({ ...rit, tempo: e.target.value })} placeholder={String(TYPES[rit.type].tempo)} /></label>
          <label className="veld"><span>Toelichting voor de groep</span><textarea className="invoer" maxLength={1500} value={rit.omschrijving} onChange={(e) => setRit({ ...rit, omschrijving: e.target.value })} placeholder="Koffiestop, wie neemt de kop, wat moet je meenemen…" /></label>
          <button className="knop primair vol" disabled={bezig}>{bezig ? "Bezig met opslaan…" : id ? "Wijzigingen opslaan" : "Rit plannen"}</button>
        </div>
      </form>
    </div>
  );
}
