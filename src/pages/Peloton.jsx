import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../App.jsx";
import { api, verkleinFoto, opslag } from "../lib/api.js";
import Icoon from "../components/Icoon.jsx";
import { Rugnummer } from "../components/Merk.jsx";
import { tijdAgo, hhmm } from "../lib/tijd.js";

function dagLabel(iso) {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const v = new Date(); v.setHours(0, 0, 0, 0);
  const verschil = Math.round((v - d) / 86400000);
  if (verschil === 0) return "Vandaag";
  if (verschil === 1) return "Gisteren";
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

export default function Peloton({ onGelezen }) {
  const { lid, ga } = useApp();
  const [berichten, setBerichten] = useState(null);
  const [ritten, setRitten] = useState({});
  const [tekst, setTekst] = useState("");
  const [foto, setFoto] = useState(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [groot, setGroot] = useState(null);
  const [zeker, setZeker] = useState(false);
  useEffect(() => setZeker(false), [groot]);
  const [menu, setMenu] = useState(null);
  const [ritId, setRitId] = useState(() => new URLSearchParams(window.location.search).get("rit"));
  const lijst = useRef(null);
  const onderaan = useRef(true);
  const laatste = useRef("");
  const invoer = useRef(null);
  const bestand = useRef(null);

  function markeerGelezen(rijen) {
    if (rijen.length) { opslag("tsw-gelezen", rijen[rijen.length - 1].id); onGelezen?.(); }
  }

  useEffect(() => {
    let weg = false;
    api("chat").then((r) => {
      if (weg) return;
      setBerichten(r.berichten);
      laatste.current = r.berichten.length ? r.berichten[r.berichten.length - 1].id : "";
      markeerGelezen(r.berichten);
    }).catch((e) => setFout(e.message));
    api("ritten").then((r) => !weg && setRitten(Object.fromEntries(r.ritten.map((x) => [x.id, x])))).catch(() => {});
    const t = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await api(`chat${laatste.current ? `?na=${encodeURIComponent(laatste.current)}` : ""}`);
        if (r.berichten.length && !weg) {
          laatste.current = r.berichten[r.berichten.length - 1].id;
          setBerichten((oud) => {
            const ids = new Set((oud || []).map((b) => b.id));
            return [...(oud || []), ...r.berichten.filter((b) => !ids.has(b.id))];
          });
          markeerGelezen(r.berichten);
        }
      } catch {}
    }, 4000);
    return () => { weg = true; clearInterval(t); };
  }, []);

  useLayoutEffect(() => {
    if (onderaan.current) window.scrollTo({ top: document.body.scrollHeight });
  }, [berichten]);

  useEffect(() => {
    const opScroll = () => { onderaan.current = window.innerHeight + window.scrollY >= document.body.scrollHeight - 140; };
    window.addEventListener("scroll", opScroll, { passive: true });
    return () => window.removeEventListener("scroll", opScroll);
  }, []);

  async function kiesFoto(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { setFoto(await verkleinFoto(f)); } catch (err) { setFout(err.message); }
  }

  async function verstuur(e) {
    e?.preventDefault();
    if (bezig || (!tekst.trim() && !foto)) return;
    setBezig(true); setFout("");
    try {
      const r = await api("chat", { methode: "POST", body: { tekst, foto: foto?.dataUrl, fotoVorm: foto?.vorm, ritId } });
      setBerichten((oud) => [...(oud || []), r.bericht]);
      laatste.current = r.bericht.id;
      opslag("tsw-gelezen", r.bericht.id);
      setTekst(""); setFoto(null); setRitId(null);
      onderaan.current = true;
      if (invoer.current) invoer.current.style.height = "";
      if (window.location.search) history.replaceState(null, "", "/peloton");
    } catch (err) { setFout(err.message); }
    setBezig(false);
  }

  async function verwijderFoto(b) {
    setMenu(null); setGroot(null);
    try {
      const r = await api(`chat/${b.id}/foto`, { methode: "DELETE" });
      setBerichten((oud) => (r.weg ? oud.filter((x) => x.id !== b.id) : oud.map((x) => (x.id === b.id ? r.bericht : x))));
    } catch (err) { setFout(err.message); }
  }

  async function verwijder(b) {
    setMenu(null);
    try {
      await api(`chat/${b.id}`, { methode: "DELETE" });
      setBerichten((oud) => oud.filter((x) => x.id !== b.id));
    } catch (err) { setFout(err.message); }
  }

  function groei(e) {
    setTekst(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(140, e.target.scrollHeight) + "px";
  }

  let vorigeDag = "";
  let vorigeLid = "";
  return (
    <div className="pagina peloton">
      <header className="peloton-kop">
        <h1>Peloton</h1>
        <p className="klein">Berichten en foto's van de hele groep.</p>
      </header>

      <div className="berichten" ref={lijst}>
        {!berichten && !fout && <div className="laden"><svg className="wiel" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" strokeDasharray="3 3" /></svg></div>}
        {berichten && !berichten.length && (
          <div className="leeg">
            <h3>Nog stil in het peloton</h3>
            <p className="klein">Zet de eerste aanval in. Stuur een bericht of een foto van je laatste rit.</p>
          </div>
        )}
        {berichten?.map((b) => {
          const dag = dagLabel(b.tijd);
          const nieuweDag = dag !== vorigeDag;
          const eigen = b.lidId === lid.id;
          const vervolg = !nieuweDag && vorigeLid === b.lidId;
          vorigeDag = dag; vorigeLid = b.lidId;
          const rit = b.ritId && ritten[b.ritId];
          return (
            <div key={b.id}>
              {nieuweDag && <div className="dagscheiding"><span>{dag}</span></div>}
              <div className={`bericht ${eigen ? "eigen" : ""} ${vervolg ? "vervolg" : ""}`}>
                {!eigen && <div className="afzender">{!vervolg && <Rugnummer nummer={b.rugnummer} schaal={0.7} />}</div>}
                <div className="bubbel-wrap">
                  {!eigen && !vervolg && <div className="naam">{b.naam}</div>}
                  <div className="bubbel" onClick={() => (eigen || lid.rol === "admin") && setMenu(menu === b.id ? null : b.id)}>
                    {rit && <button className="ritlabel" onClick={(e) => { e.stopPropagation(); ga(`/rit/${rit.id}`); }}><Icoon naam="vlag" className="i14" />{rit.titel}</button>}
                    {b.fotoId && (
                      <button className="bubbelfoto" style={{ aspectRatio: b.fotoVorm || 4 / 3 }} onClick={(e) => { e.stopPropagation(); setGroot(b); }} aria-label="Foto vergroten">
                        <img src={`/api/foto/${b.fotoId}`} alt={`Foto van ${b.naam}`} loading="lazy" />
                      </button>
                    )}
                    {b.fotoWeg && <div className="foto-weg"><Icoon naam="prullenbak" className="i14" />{b.fotoWeg === "zelf" ? "Foto verwijderd" : "Foto verwijderd door de organisatie"}</div>}
                    {b.tekst && <div className="bubbeltekst">{b.tekst}</div>}
                    <span className="tijd tab">{hhmm(new Date(b.tijd))}</span>
                  </div>
                  {menu === b.id && (
                    <div className="bubbelmenu">
                      {b.fotoId && b.tekst && <button className="knop klein gevaar" onClick={() => verwijderFoto(b)}><Icoon naam="prullenbak" />Alleen foto</button>}
                      <button className="knop klein gevaar" onClick={() => verwijder(b)}><Icoon naam="prullenbak" />{b.fotoId && b.tekst ? "Hele bericht" : "Verwijder"}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form className="opsteller" onSubmit={verstuur}>
        {fout && <div className="melding fout"><Icoon naam="let" />{fout}</div>}
        {(foto || ritId) && (
          <div className="bijlagen">
            {foto && (
              <div className="voorbeeldfoto">
                <img src={foto.dataUrl} alt="Gekozen foto" />
                <button type="button" onClick={() => setFoto(null)} aria-label="Foto weghalen"><Icoon naam="kruis" /></button>
              </div>
            )}
            {ritId && ritten[ritId] && (
              <span className="ritlabel los"><Icoon naam="vlag" className="i14" />{ritten[ritId].titel}<button type="button" onClick={() => setRitId(null)} aria-label="Rit loskoppelen"><Icoon naam="kruis" className="i14" /></button></span>
            )}
          </div>
        )}
        <div className="opsteller-rij">
          <button type="button" className="icoonknop" onClick={() => bestand.current?.click()} aria-label="Foto toevoegen"><Icoon naam="camera" /></button>
          <input ref={bestand} type="file" accept="image/*" hidden onChange={kiesFoto} />
          <textarea ref={invoer} className="invoer" rows={1} placeholder="Bericht aan het peloton" value={tekst} onChange={groei}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); verstuur(); } }} />
          <button className="verstuurknop" disabled={bezig || (!tekst.trim() && !foto)} aria-label="Versturen"><Icoon naam="verstuur" /></button>
        </div>
      </form>

      {groot && (
        <div className="lichtbak" onClick={() => setGroot(null)} role="dialog" aria-label="Foto">
          <img src={`/api/foto/${groot.fotoId}`} alt={`Foto van ${groot.naam}`} />
          <button className="icoonknop sluit" aria-label="Sluiten"><Icoon naam="kruis" /></button>
          {(groot.lidId === lid.id || lid.rol === "admin") && (
            <button className="knop klein gevaar lichtbak-weg" onClick={(e) => { e.stopPropagation(); zeker ? verwijderFoto(groot) : setZeker(true); }}><Icoon naam="prullenbak" />{zeker ? "Zeker weten? Tik nog een keer" : groot.lidId === lid.id ? "Foto verwijderen" : `Foto van ${groot.naam.split(" ")[0]} verwijderen`}</button>
          )}
        </div>
      )}
    </div>
  );
}

export { tijdAgo };
