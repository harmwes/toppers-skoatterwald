// GPX inlezen en omrekenen naar een route: afstand, hoogtemeters en punten [lat, lon, hoogte, afstand].

const R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;

export function afstandM(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function koers(a, b) {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function rdp(pts, eps) {
  // Ramer-Douglas-Peucker op lat/lon (graden, benadering is prima voor vereenvoudigen)
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  const kx = Math.cos(rad(pts[0][0]));
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0, idx = -1;
    const ax = pts[s][1] * kx, ay = pts[s][0], bx = pts[e][1] * kx, by = pts[e][0];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy || 1e-12;
    for (let i = s + 1; i < e; i++) {
      const px = pts[i][1] * kx, py = pts[i][0];
      let t = ((px - ax) * dx + (py - ay) * dy) / len;
      t = Math.max(0, Math.min(1, t));
      const d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx > 0 && maxD > eps * eps) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export function leesGpx(tekst) {
  const doc = new DOMParser().parseFromString(tekst, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Dit bestand is geen geldige GPX.");
  const alle = (t) => [...doc.getElementsByTagNameNS("*", t)];
  let nodes = alle("trkpt");
  if (!nodes.length) nodes = alle("rtept");
  if (!nodes.length) nodes = alle("wpt");
  if (nodes.length < 2) throw new Error("In dit GPX-bestand staat geen route.");
  const naamEl = doc.querySelector("trk > name, rte > name, metadata > name");
  const ruw = [];
  for (const n of nodes) {
    const lat = parseFloat(n.getAttribute("lat"));
    const lon = parseFloat(n.getAttribute("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const eleEl = n.getElementsByTagNameNS("*", "ele")[0];
    const ele = eleEl ? parseFloat(eleEl.textContent) : null;
    ruw.push([lat, lon, Number.isFinite(ele) ? ele : null]);
  }
  return bouwRoute(ruw, naamEl?.textContent?.trim() || "");
}

// Maak een nette GPX van punten (voor bestanden die als TCX of KML binnenkomen).
export function maakGpx(naam, ruw) {
  const esc = (t) => String(t).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Toppers Skoatterwald" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(naam)}</name></metadata>
  <trk><name>${esc(naam)}</name><trkseg>
${ruw.map((p) => `    <trkpt lat="${p[0]}" lon="${p[1]}">${p[2] != null ? `<ele>${p[2]}</ele>` : ""}</trkpt>`).join("\n")}
  </trkseg></trk>
</gpx>
`;
}

// Leest een routebestand: GPX (Komoot, Strava, Garmin, RideWithGPS, Wahoo), TCX (Garmin) of KML (Google My Maps).
// Geeft altijd GPX-tekst terug, zodat iedereen een GPX kan downloaden.
export function leesRouteBestand(tekst, bestandsnaam = "") {
  const kop = tekst.slice(0, 4000);
  if (tekst.slice(8, 12) === ".FIT" || /\.fit$/i.test(bestandsnaam)) {
    throw new Error("Dit is een FIT-bestand (een opgenomen rit). Exporteer de route als GPX, bijvoorbeeld via Garmin Connect, Strava of Komoot.");
  }
  if (/<gpx[\s>]/i.test(kop)) {
    const route = leesGpx(tekst);
    return { route, gpxTekst: tekst, naam: bestandsnaam || `${route.naam || "route"}.gpx` };
  }
  const doc = new DOMParser().parseFromString(tekst, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Dit bestand kan ik niet lezen. Gebruik een GPX-bestand.");
  let ruw = [], naam = "";
  if (/<TrainingCenterDatabase/i.test(kop)) {
    for (const tp of doc.getElementsByTagName("Trackpoint")) {
      const lat = parseFloat(tp.getElementsByTagName("LatitudeDegrees")[0]?.textContent);
      const lon = parseFloat(tp.getElementsByTagName("LongitudeDegrees")[0]?.textContent);
      const ele = parseFloat(tp.getElementsByTagName("AltitudeMeters")[0]?.textContent);
      if (Number.isFinite(lat) && Number.isFinite(lon)) ruw.push([lat, lon, Number.isFinite(ele) ? ele : null]);
    }
    naam = doc.getElementsByTagName("Name")[0]?.textContent?.trim() || doc.getElementsByTagName("Id")[0]?.textContent?.trim() || "";
  } else if (/<kml[\s>]/i.test(kop)) {
    for (const c of doc.getElementsByTagName("coordinates")) {
      for (const t of c.textContent.trim().split(/\s+/)) {
        const [lon, lat, ele] = t.split(",").map(Number);
        if (Number.isFinite(lat) && Number.isFinite(lon)) ruw.push([lat, lon, Number.isFinite(ele) && ele !== 0 ? ele : null]);
      }
    }
    naam = doc.getElementsByTagName("name")[0]?.textContent?.trim() || "";
  } else {
    throw new Error("Dit is geen GPX-bestand. Exporteer de route als GPX uit Komoot, Strava, Garmin of RideWithGPS.");
  }
  if (ruw.length < 2) throw new Error("In dit bestand staat geen route.");
  const basis = (bestandsnaam || naam || "route").replace(/\.(tcx|kml)$/i, "");
  const route = bouwRoute(ruw, naam);
  return { route, gpxTekst: maakGpx(naam || basis, ruw), naam: `${basis}.gpx` };
}

export function bouwRoute(ruw, naam = "") {
  // cumulatieve afstand
  let d = 0;
  const pts = [];
  for (let i = 0; i < ruw.length; i++) {
    if (i > 0) {
      const stap = afstandM(ruw[i - 1], ruw[i]);
      if (stap < 0.5) continue;
      d += stap;
    }
    pts.push([ruw[i][0], ruw[i][1], ruw[i][2], d]);
  }
  // hoogtemeters met een drempel tegen ruis
  let stijging = 0, daling = 0, ref = null, hoog = -Infinity, laag = Infinity;
  for (const p of pts) {
    if (p[2] == null) continue;
    hoog = Math.max(hoog, p[2]); laag = Math.min(laag, p[2]);
    if (ref == null) { ref = p[2]; continue; }
    const diff = p[2] - ref;
    if (diff >= 3) { stijging += diff; ref = p[2]; }
    else if (diff <= -3) { daling -= diff; ref = p[2]; }
  }
  let vereenvoudigd = pts;
  let eps = 0.00002;
  while (vereenvoudigd.length > 900) { vereenvoudigd = rdp(pts, eps); eps *= 1.6; }
  const start = pts[0], eind = pts[pts.length - 1];
  return {
    naam,
    afstand: Math.round(d),
    stijging: Math.round(stijging),
    daling: Math.round(daling),
    hoogsteHoogte: Number.isFinite(hoog) ? hoog : null,
    laagsteHoogte: Number.isFinite(laag) ? laag : null,
    rondrit: afstandM(start, eind) < 1500,
    punten: vereenvoudigd.map((p) => [p[0], p[1], p[2], Math.round(p[3])]),
  };
}

export const km = (m, dec = 1) => (m / 1000).toLocaleString("nl-NL", { maximumFractionDigits: dec, minimumFractionDigits: dec > 0 && m < 10000 ? 1 : 0 });
