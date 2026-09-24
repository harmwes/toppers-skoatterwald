import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { windKleur } from "../lib/weer.js";

const TEGELS = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const BRON = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const TYPEKLEUR = { race: "#ff4d3d", gravel: "#e8b15a", atb: "#5ccf8a" };

export default function RouteKaart({ route, type = "race", wind, toonWind = false, afhaak, markeer, interactief = true, className = "", kmMarkers = false, onKlaar }) {
  const el = useRef(null);
  const kaart = useRef(null);
  const lagen = useRef(null);
  const stip = useRef(null);
  const grens = useRef(null);
  const aangeraakt = useRef(false);

  useEffect(() => {
    if (!el.current || kaart.current) return;
    const k = L.map(el.current, {
      zoomControl: interactief,
      attributionControl: true,
      dragging: interactief,
      scrollWheelZoom: false,
      touchZoom: interactief,
      doubleClickZoom: interactief,
      boxZoom: false,
      keyboard: interactief,
      tap: false,
      zoomSnap: 0.25,
    });
    // OpenStreetMap-kaart, met een filter donker gemaakt zodat hij in de koersstijl past.
    L.tileLayer(TEGELS, { attribution: BRON, maxZoom: 19, className: "donkere-tegels" }).addTo(k);
    k.attributionControl.setPrefix(false);
    lagen.current = L.layerGroup().addTo(k);
    kaart.current = k;
    k.on("dragstart zoomstart", (e) => { if (e.hard !== true && k._loaded && grens.current && !k._fitting) aangeraakt.current = true; });
    const ro = new ResizeObserver(() => {
      k.invalidateSize();
      if (grens.current && !aangeraakt.current) { k._fitting = true; k.fitBounds(grens.current, { padding: interactief ? [28, 28] : [16, 16], animate: false }); k._fitting = false; }
    });
    ro.observe(el.current);
    onKlaar?.(k);
    return () => { ro.disconnect(); k.remove(); kaart.current = null; };
  }, [interactief]);

  useEffect(() => {
    const k = kaart.current;
    if (!k || !route?.punten?.length) return;
    const g = lagen.current;
    g.clearLayers();
    const ll = route.punten.map((p) => [p[0], p[1]]);
    L.polyline(ll, { color: "#000", weight: interactief ? 9 : 7, opacity: 0.55, lineCap: "round", lineJoin: "round" }).addTo(g);
    if (toonWind && wind?.stukken?.length) {
      for (const s of wind.stukken) {
        L.polyline([s.van, s.naar], { color: windKleur(s.component), weight: interactief ? 5 : 4, opacity: 1, lineCap: "round" }).addTo(g);
      }
    } else {
      L.polyline(ll, { color: TYPEKLEUR[type] || "#fff", weight: interactief ? 5 : 4, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(g);
    }
    if (kmMarkers) {
      let volgende = 10000;
      for (const p of route.punten) {
        if (p[3] >= volgende) {
          L.marker([p[0], p[1]], { icon: L.divIcon({ className: "", html: `<span class="kmlabel">${volgende / 1000}</span>`, iconSize: [26, 18], iconAnchor: [13, 9] }), interactive: false, keyboard: false }).addTo(g);
          volgende += 10000;
        }
      }
    }
    const eerste = ll[0], laatste = ll[ll.length - 1];
    const pin = (cls, html = "") => L.divIcon({ className: "", html: `<div class="kaartpin ${cls}">${html}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    if (!route.rondrit) L.marker(laatste, { icon: pin("finish"), interactive: false, keyboard: false }).addTo(g);
    L.marker(eerste, { icon: pin(route.rondrit ? "finish" : "start", route.rondrit ? "" : "S"), interactive: false, keyboard: false }).addTo(g);
    if (afhaak) {
      L.marker([afhaak[0], afhaak[1]], { icon: L.divIcon({ className: "", html: `<div class="kaartpin afhaak"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"><path d="M4 11l8-6.5 8 6.5M6 9.5V19.5h12V9.5"/></svg></div>`, iconSize: [26, 26], iconAnchor: [13, 13] }), keyboard: false, interactive: false }).addTo(g);
    }
    grens.current = L.latLngBounds(ll);
    k._fitting = true;
    k.fitBounds(grens.current, { padding: interactief ? [28, 28] : [16, 16], animate: false });
    k._fitting = false;
  }, [route, type, wind, toonWind, afhaak, kmMarkers, interactief]);

  useEffect(() => {
    const k = kaart.current;
    if (!k) return;
    if (!markeer) { stip.current?.remove(); stip.current = null; return; }
    if (!stip.current) stip.current = L.circleMarker(markeer, { radius: 8, color: "#0c0d0f", weight: 3, fillColor: "#f3f0e7", fillOpacity: 1 }).addTo(k);
    else stip.current.setLatLng(markeer);
  }, [markeer]);

  return <div ref={el} className={`routekaart ${className}`} />;
}
