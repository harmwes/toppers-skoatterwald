// Weer en wind via Open-Meteo (gratis, geen sleutel nodig), plus de windanalyse langs de route.
import { koers } from "./gpx.js";
import { startMoment, tempoVan, rijduurMin } from "./tijd.js";

const cache = new Map();

export function dagenVooruit(datum) {
  const [j, m, d] = datum.split("-").map(Number);
  const vandaag = new Date(); vandaag.setHours(0, 0, 0, 0);
  return Math.round((new Date(j, m - 1, d) - vandaag) / 86400000);
}

export async function haalWeer(lat, lon, datum) {
  const vooruit = dagenVooruit(datum);
  if (vooruit > 15) {
    const [j, m, d] = datum.split("-").map(Number);
    const vanaf = new Date(j, m - 1, d - 15);
    return { beschikbaar: false, vanaf };
  }
  const sleutel = `${lat.toFixed(2)},${lon.toFixed(2)},${datum}`;
  const oud = cache.get(sleutel);
  if (oud && Date.now() - oud.t < 20 * 60000) return oud.data;
  const basis = vooruit < -60 ? "https://archive-api.open-meteo.com/v1/archive" : "https://api.open-meteo.com/v1/forecast";
  const q = new URLSearchParams({
    latitude: lat.toFixed(4), longitude: lon.toFixed(4),
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover",
    daily: "sunrise,sunset",
    timezone: "Europe/Amsterdam", wind_speed_unit: "kmh", start_date: datum, end_date: datum,
  });
  const r = await fetch(`${basis}?${q}`);
  if (!r.ok) throw new Error("Het weer is nu even niet op te halen.");
  const j = await r.json();
  const h = j.hourly;
  const uren = h.time.map((t, i) => ({
    uur: Number(t.slice(11, 13)),
    temp: h.temperature_2m[i],
    gevoel: h.apparent_temperature?.[i],
    kans: h.precipitation_probability?.[i] ?? null,
    neerslag: h.precipitation?.[i] ?? 0,
    code: h.weather_code?.[i] ?? 0,
    wind: h.wind_speed_10m[i],
    richting: h.wind_direction_10m[i],
    vlagen: h.wind_gusts_10m?.[i],
    bewolking: h.cloud_cover?.[i],
  }));
  const data = { beschikbaar: true, uren, zonOp: j.daily?.sunrise?.[0]?.slice(11, 16), zonOnder: j.daily?.sunset?.[0]?.slice(11, 16), vooruit };
  cache.set(sleutel, { t: Date.now(), data });
  return data;
}

export function beaufort(kmh) {
  const grenzen = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  let b = 0;
  while (b < grenzen.length && kmh >= grenzen[b]) b++;
  return b;
}

export const BFT_NAAM = ["stil", "zwak", "zwak", "matig", "matig", "vrij krachtig", "krachtig", "hard", "stormachtig", "storm", "zware storm", "zeer zware storm", "orkaan"];

const WINDSTREKEN = ["N", "NNO", "NO", "ONO", "O", "OZO", "ZO", "ZZO", "Z", "ZZW", "ZW", "WZW", "W", "WNW", "NW", "NNW"];
const WINDSTREKEN_LANG = { N: "noord", NNO: "noordnoordoost", NO: "noordoost", ONO: "oostnoordoost", O: "oost", OZO: "oostzuidoost", ZO: "zuidoost", ZZO: "zuidzuidoost", Z: "zuid", ZZW: "zuidzuidwest", ZW: "zuidwest", WZW: "westzuidwest", W: "west", WNW: "westnoordwest", NW: "noordwest", NNW: "noordnoordwest" };
export const windstreek = (g) => WINDSTREKEN[Math.round(((g % 360) + 360) % 360 / 22.5) % 16];
export const windstreekLang = (g) => WINDSTREKEN_LANG[windstreek(g)];

export function weerOmschrijving(code) {
  if (code === 0) return { tekst: "Zonnig", icoon: "zon" };
  if (code <= 2) return { tekst: "Half bewolkt", icoon: "halfzon" };
  if (code === 3) return { tekst: "Bewolkt", icoon: "wolk" };
  if (code <= 48) return { tekst: "Mist", icoon: "mist" };
  if (code <= 57) return { tekst: "Motregen", icoon: "motregen" };
  if (code <= 67) return { tekst: "Regen", icoon: "regen" };
  if (code <= 77) return { tekst: "Sneeuw", icoon: "sneeuw" };
  if (code <= 82) return { tekst: "Buien", icoon: "regen" };
  if (code <= 86) return { tekst: "Sneeuwbuien", icoon: "sneeuw" };
  return { tekst: "Onweer", icoon: "onweer" };
}

export function urenVanRit(weer, rit) {
  if (!weer?.beschikbaar) return [];
  const start = startMoment(rit);
  const eindUur = Math.min(23, start.getHours() + Math.ceil(rijduurMin(rit) / 60));
  return weer.uren.filter((u) => u.uur >= start.getHours() && u.uur <= eindUur);
}

// Windanalyse per routestuk: de hoek tussen rijrichting en de richting waar de wind vandaan komt.
// Verschil < 50 graden: tegenwind; > 130: wind mee; daartussen: zijwind.
export function windLangsRoute(rit, weer) {
  const p = rit.route?.punten;
  if (!p || p.length < 2 || !weer?.beschikbaar) return null;
  const start = startMoment(rit);
  const tempo = (tempoVan(rit) * 1000) / 60; // meter per minuut
  const perUur = Object.fromEntries(weer.uren.map((u) => [u.uur, u]));
  const stukken = [];
  const totaal = { tegen: 0, zij: 0, mee: 0 };
  let waaier = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i];
    const lengte = b[3] - a[3];
    if (lengte <= 0) continue;
    const minuten = a[3] / tempo;
    const uur = Math.min(23, new Date(start.getTime() + minuten * 60000).getHours());
    const w = perUur[uur] || weer.uren[weer.uren.length - 1];
    const rijrichting = koers(a, b);
    const verschil = Math.abs(((w.richting - rijrichting + 540) % 360) - 180);
    const soort = verschil < 50 ? "tegen" : verschil > 130 ? "mee" : "zij";
    const component = Math.cos((verschil * Math.PI) / 180) * w.wind; // + = tegen, - = mee
    totaal[soort] += lengte;
    if (soort === "zij" && w.wind >= 29) waaier += lengte;
    stukken.push({ van: [a[0], a[1]], naar: [b[0], b[1]], soort, component, wind: w.wind, km: a[3] });
  }
  const som = totaal.tegen + totaal.zij + totaal.mee || 1;
  const pct = { tegen: Math.round((totaal.tegen / som) * 100), zij: Math.round((totaal.zij / som) * 100), mee: Math.round((totaal.mee / som) * 100) };
  // Waar zit de zwaarste tegenwind? Bepaal de helft met de meeste tegenwind.
  const helft = p[p.length - 1][3] / 2;
  const tegenEerste = stukken.filter((s) => s.km < helft && s.soort === "tegen").length;
  const tegenTweede = stukken.filter((s) => s.km >= helft && s.soort === "tegen").length;
  return {
    stukken, pct,
    waaierAlarm: waaier / som > 0.2,
    waaierKm: Math.round(waaier / 1000),
    advies: tegenEerste > tegenTweede * 1.3 ? "Eerst tegenwind, straks wind mee naar huis." : tegenTweede > tegenEerste * 1.3 ? "Let op: de tegenwind komt op de terugweg." : "Wind verdeeld over de rit.",
  };
}

export function windKleur(component) {
  // van wind mee (blauw) via zij (geel) naar tegen (rood)
  if (component > 12) return "#ff4d3d";
  if (component > 4) return "#ff8a3d";
  if (component > -4) return "#f5c542";
  if (component > -12) return "#7fd3f7";
  return "#38b6ff";
}
