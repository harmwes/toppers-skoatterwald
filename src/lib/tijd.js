// Datums, tijden, tempo en de "thuis-om"-berekening.
import { afstandM } from "./gpx.js";

export const TYPES = {
  race: { naam: "Race", lang: "Racefiets", tempo: 28, kleur: "var(--race)" },
  gravel: { naam: "Gravel", lang: "Gravel", tempo: 22, kleur: "var(--gravel)" },
  atb: { naam: "ATB", lang: "Mountainbike", tempo: 16, kleur: "var(--atb)" },
};

const DAGEN = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

// Een rit ligt altijd in Nederlandse tijd. We rekenen met een Date in lokale tijd van de telefoon;
// voor een groep in Friesland is dat dezelfde tijdzone.
export function startMoment(rit) {
  const [j, m, d] = rit.datum.split("-").map(Number);
  const [u, mi] = rit.starttijd.split(":").map(Number);
  return new Date(j, m - 1, d, u, mi);
}

export function tempoVan(rit) {
  return rit.tempo || TYPES[rit.type]?.tempo || 25;
}

export function rijduurMin(rit) {
  const afstand = rit.route?.afstand || 0;
  const klim = rit.route?.stijging || 0;
  // Naismith-achtige toeslag: 1 minuut per 10 hoogtemeter, plus een korte stop per 60 km.
  const basis = (afstand / 1000 / tempoVan(rit)) * 60;
  return Math.round(basis + klim / 10 + Math.floor(afstand / 60000) * 15);
}

export function eindMoment(rit) {
  return new Date(startMoment(rit).getTime() + rijduurMin(rit) * 60000);
}

export const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function duurTekst(min) {
  const u = Math.floor(min / 60), m = min % 60;
  return u ? `${u}u${m ? String(m).padStart(2, "0") : ""}` : `${m} min`;
}

export function datumLang(datum) {
  const [j, m, d] = datum.split("-").map(Number);
  const dt = new Date(j, m - 1, d);
  return `${DAGEN[dt.getDay()]} ${d} ${MAANDEN[m - 1]}`;
}

export function datumKort(datum) {
  const [j, m, d] = datum.split("-").map(Number);
  const dt = new Date(j, m - 1, d);
  return { dag: DAGEN[dt.getDay()].slice(0, 2), nr: d, maand: MAANDEN[m - 1].slice(0, 3) };
}

export function relatief(datum) {
  const [j, m, d] = datum.split("-").map(Number);
  const vandaag = new Date(); vandaag.setHours(0, 0, 0, 0);
  const dagen = Math.round((new Date(j, m - 1, d) - vandaag) / 86400000);
  if (dagen === 0) return "vandaag";
  if (dagen === 1) return "morgen";
  if (dagen === -1) return "gisteren";
  if (dagen > 1 && dagen < 7) return `over ${dagen} dagen`;
  if (dagen >= 7 && dagen < 14) return "volgende week";
  if (dagen < 0) return `${-dagen} dagen geleden`;
  return `over ${Math.round(dagen / 7)} weken`;
}

export function aftellen(doel, nu = new Date()) {
  let s = Math.max(0, Math.floor((doel - nu) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const u = Math.floor(s / 3600); s -= u * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return { d, u, m, s, voorbij: doel <= nu };
}

export function tijdAgo(iso) {
  const t = new Date(iso);
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "net";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  const vandaag = new Date(); vandaag.setHours(0, 0, 0, 0);
  if (t >= vandaag) return hhmm(t);
  const gisteren = new Date(vandaag - 86400000);
  if (t >= gisteren) return `gisteren ${hhmm(t)}`;
  return `${t.getDate()} ${MAANDEN[t.getMonth()].slice(0, 3)} ${hhmm(t)}`;
}

// Hoe ver kan iemand meerijden als hij om 'thuis' thuis moet zijn?
// We nemen aan dat thuis dichtbij de start ligt. Vanaf elk punt rekenen we terug
// met de hemelsbrede afstand naar de start maal 1,3 (wegen zijn niet recht).
export function thuisAnalyse(rit, thuis) {
  if (!thuis || !rit.route?.punten?.length) return null;
  const start = startMoment(rit);
  const [u, m] = thuis.split(":").map(Number);
  const moet = new Date(start); moet.setHours(u, m, 0, 0);
  if (moet <= start) moet.setDate(moet.getDate() + 1);
  const eind = eindMoment(rit);
  const marge = 10 * 60000;
  if (eind.getTime() + marge <= moet.getTime()) return { heleRit: true, eind };
  const tempo = tempoVan(rit) * 1000 / 3600000; // meter per ms
  const beschikbaar = (moet - start - marge) * tempo; // meters die je in totaal kunt fietsen
  const p = rit.route.punten;
  const s = [p[0][0], p[0][1]];
  let beste = null;
  for (const pt of p) {
    const terug = afstandM([pt[0], pt[1]], s) * 1.3;
    if (pt[3] + terug <= beschikbaar) beste = { km: pt[3], terug, punt: pt };
  }
  if (!beste || beste.km < 1000) return { heleRit: false, nietHaalbaar: true, eind };
  return { heleRit: false, afhaakKm: beste.km, terugKm: beste.terug, punt: beste.punt, eind };
}
