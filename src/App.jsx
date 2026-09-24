import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, opslag } from "./lib/api.js";
import Icoon from "./components/Icoon.jsx";
import { Logo } from "./components/Merk.jsx";
import Login from "./pages/Login.jsx";
import Ritten from "./pages/Ritten.jsx";
import Rit from "./pages/Rit.jsx";
import Peloton from "./pages/Peloton.jsx";
import Profiel from "./pages/Profiel.jsx";
import Admin from "./pages/Admin.jsx";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

function huidigPad() { return window.location.pathname.replace(/\/+$/, "") || "/"; }

export default function App() {
  const [pad, setPad] = useState(huidigPad());
  const [sessie, setSessie] = useState({ laden: true });
  const [ongelezen, setOngelezen] = useState(0);

  const ga = useCallback((naar, { vervang = false } = {}) => {
    if (naar === huidigPad() + window.location.search) return;
    const wissel = () => {
      if (vervang) history.replaceState(null, "", naar); else history.pushState(null, "", naar);
      setPad(naar.split("?")[0]);
      window.scrollTo({ top: 0 });
    };
    if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(wissel);
    else wissel();
  }, []);

  useEffect(() => {
    const opPop = () => setPad(huidigPad());
    const uit = () => setSessie({ laden: false, lid: null });
    const slot = () => setSessie((s) => ({ ...s, adminOpen: false }));
    window.addEventListener("tsw:adminslot", slot);
    window.addEventListener("popstate", opPop);
    window.addEventListener("tsw:uitgelogd", uit);
    return () => { window.removeEventListener("popstate", opPop); window.removeEventListener("tsw:uitgelogd", uit); window.removeEventListener("tsw:adminslot", slot); };
  }, []);

  const herlaadIk = useCallback(async () => {
    try {
      const r = await api("ik");
      setSessie({ laden: false, lid: r.lid, adminOpen: r.adminOpen, codeStandaard: r.codeStandaard, aanvragen: r.aanvragen || 0, meldingsEmail: r.meldingsEmail || "" });
    } catch (e) {
      setSessie({ laden: false, lid: null, fout: e.status === 401 ? null : e.message });
    }
  }, []);
  useEffect(() => { herlaadIk(); }, [herlaadIk]);

  // Admins: elke minuut kijken of er nieuwe aanvragen om mee te doen zijn.
  useEffect(() => {
    if (sessie.lid?.rol !== "admin") return;
    const t = setInterval(async () => {
      if (document.hidden) return;
      try { const r = await api("ik"); setSessie((s) => ({ ...s, aanvragen: r.aanvragen || 0, adminOpen: r.adminOpen })); } catch {}
    }, 60000);
    return () => clearInterval(t);
  }, [sessie.lid?.rol]);

  // Ongelezen berichten tellen, ook als je niet in de chat zit.
  useEffect(() => {
    if (!sessie.lid) return;
    let weg = false;
    async function tel() {
      if (document.hidden || pad === "/peloton") return;
      try {
        const laatst = opslag("tsw-gelezen") || "";
        const r = await api(`chat${laatst ? `?na=${encodeURIComponent(laatst)}` : ""}`);
        if (!weg) setOngelezen(laatst ? r.berichten.filter((b) => b.lidId !== sessie.lid.id).length : 0);
        if (!laatst && r.berichten.length) opslag("tsw-gelezen", r.berichten[r.berichten.length - 1].id);
      } catch {}
    }
    tel();
    const t = setInterval(tel, 30000);
    return () => { weg = true; clearInterval(t); };
  }, [sessie.lid?.id, pad]);

  if (sessie.laden) {
    return <div className="opstart"><Logo groot /></div>;
  }
  if (!sessie.lid) {
    return <Login fout={sessie.fout} onIngelogd={(lid) => { setSessie({ laden: false, lid }); ga("/", { vervang: true }); herlaadIk(); }} />;
  }

  const lid = sessie.lid;
  const deel = pad.split("/").filter(Boolean);
  let pagina;
  let tab = "ritten";
  if (deel[0] === "rit" && deel[1]) pagina = <Rit id={deel[1]} />;
  else if (deel[0] === "peloton") { pagina = <Peloton onGelezen={() => setOngelezen(0)} />; tab = "peloton"; }
  else if (deel[0] === "profiel") { pagina = <Profiel />; tab = "profiel"; }
  else if (deel[0] === "admin" && lid.rol === "admin") { pagina = <Admin deel={deel.slice(1)} />; tab = "admin"; }
  else pagina = <Ritten />;

  const tabs = [
    { id: "ritten", naar: "/", label: "Ritten", icoon: "ritten" },
    { id: "peloton", naar: "/peloton", label: "Peloton", icoon: "chat", badge: ongelezen },
    { id: "profiel", naar: "/profiel", label: "Profiel", icoon: "profiel" },
  ];
  if (lid.rol === "admin") tabs.push({ id: "admin", naar: "/admin", label: "Admin", icoon: sessie.adminOpen ? "open" : "admin", badge: sessie.aanvragen });

  return (
    <AppContext.Provider value={{ lid, sessie, setSessie, herlaadIk, ga, pad }}>
      <div className="schil">
        <a className="zijlogo" href="/" onClick={(e) => { e.preventDefault(); ga("/"); }}><Logo /></a>
        <main key={pad}>{pagina}</main>
        <nav className="tabbalk" aria-label="Hoofdmenu">
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? "actief" : ""} onClick={() => ga(t.naar)} aria-current={tab === t.id ? "page" : undefined}>
              <Icoon naam={t.icoon} />
              <span>{t.label}</span>
              {t.badge > 0 && <em className="badge">{t.badge > 9 ? "9+" : t.badge}</em>}
            </button>
          ))}
        </nav>
      </div>
    </AppContext.Provider>
  );
}
