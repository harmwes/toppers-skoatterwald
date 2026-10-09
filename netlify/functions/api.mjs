// Toppers Skoatterwald: alle API-routes onder /api/.
import { db } from "../lib/store.mjs";
import { gunzipSync, gzipSync } from "node:zlib";
import {
  config as leesConfig, bewaarConfig, hashGeheim, klopt, nieuwId, huidigLid, maakSessie, wisCookie,
  maakAdminSessie, adminOntgrendeld, remPoging, SESSIE_COOKIE, ADMIN_COOKIE,
} from "../lib/auth.mjs";
import { stuurMail, mailserverAan, AFZENDER } from "../lib/mailer.mjs";
import { welkomTekst, welkomOnderwerp, APP_URL } from "../../src/lib/mail.js";

const TYPES = ["race", "gravel", "atb"];
const STATUS = ["ja", "nee", "misschien"];
const MAX_GPX = 30 * 1024 * 1024; // uitgepakt

// GPX komt als tekst, of ingepakt (gzip, base64) voor grote bestanden.
function gpxTekst(g) {
  if (!g) return null;
  if (typeof g.gz === "string") {
    try { return gunzipSync(Buffer.from(g.gz, "base64"), { maxOutputLength: MAX_GPX }).toString("utf8"); } catch { return null; }
  }
  return typeof g.tekst === "string" ? g.tekst : null;
}
const MAX_FOTO = 4 * 1024 * 1024;

function json(data, status = 200, headers = {}) {
  const h = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  for (const [k, v] of Object.entries(headers)) {
    if (Array.isArray(v)) v.forEach((x) => h.append(k, x)); else h.set(k, v);
  }
  return new Response(JSON.stringify(data), { status, headers: h });
}
const fout = (melding, status = 400) => json({ fout: melding }, status);

const emailOk = (e) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const tijdOk = (t) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const datumOk = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const tekst = (s, max = 500) => (typeof s === "string" ? s.trim().slice(0, max) : "");

function publiek(lid) {
  return { id: lid.id, naam: lid.naam, rugnummer: lid.rugnummer, rol: lid.rol, fietsen: lid.fietsen || [], demo: !!lid.demo };
}
function eigen(lid) {
  return { ...publiek(lid), email: lid.email, mobiel: lid.mobiel || "", wachtwoordStandaard: !!lid.wachtwoordStandaard };
}
// Mobiel nummer, alleen zichtbaar voor jezelf en de admin. Opgeslagen als +31612345678.
// Geeft "" voor leeg, null voor ongeldig.
function mobielNummer(v) {
  if (v == null || String(v).trim() === "") return "";
  let t = String(v).trim().replace(/[\s().-]/g, "");
  if (t.startsWith("00")) t = "+" + t.slice(2);
  else if (t.startsWith("0")) t = "+31" + t.slice(1);
  else if (!t.startsWith("+")) t = "+" + t;
  return /^\+[1-9]\d{7,14}$/.test(t) ? t : null;
}

// Wachtwoord dat de admin voor een fietser kiest. Geeft het wachtwoord, of null als het niet deugt.
const MIN_WACHTWOORD = 8;
function gekozenWachtwoord(b) {
  const w = typeof b?.wachtwoord === "string" ? b.wachtwoord.trim() : "";
  return w.length >= MIN_WACHTWOORD && w.length <= 100 ? w : null;
}
const wachtwoordFout = () => fout(`Kies een wachtwoord van minstens ${MIN_WACHTWOORD} tekens.`);

// Welkomstmail (of mail met een nieuw wachtwoord) via de mailserver.
async function stuurWelkom(doel, wachtwoord, { nieuwWachtwoord = false, afzender = "" } = {}) {
  const gegevens = { naam: doel.naam, email: doel.email, wachtwoord, nieuwWachtwoord, afzender: afzender !== "Admin" ? afzender : "" };
  return stuurMail({ aan: doel.email, onderwerp: welkomOnderwerp(gegevens), tekst: welkomTekst(gegevens) });
}

// Mail naar de organisatie bij een nieuwe aanvraag. Via de mailserver als die is ingesteld,
// anders via FormSubmit (een nieuw adres moet daar één keer bevestigd worden via de eerste mail).
async function meldAanvraag(cfg, a, test = false) {
  if (!cfg.meldingsEmail) return { verstuurd: false, reden: "geen adres" };
  if (mailserverAan()) {
    const tekstregels = test
      ? "Dit is een test vanuit de app. Meldingen komen op dit adres binnen."
      : `${a.naam} wil meedoen met Toppers Skoatterwâld.\n\nE-mailadres: ${a.email}\nFietst: ${(a.fietsen || []).join(", ") || "-"}\nBericht: ${a.bericht || "-"}\n\nOpen de app, ga naar Admin, Aanvragen, en kies accepteren of afwijzen:\n${APP_URL}/admin?tab=aanvragen`;
    return stuurMail({ aan: cfg.meldingsEmail, onderwerp: test ? "Toppers Skoatterwâld: testmelding" : `Toppers Skoatterwâld: ${a.naam} wil meedoen`, tekst: tekstregels });
  }
  try {
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(cfg.meldingsEmail)}`, {
      method: "POST", signal: AbortSignal.timeout(7000),
      headers: { "content-type": "application/json", accept: "application/json", referer: `${APP_URL}/`, origin: APP_URL },
      body: JSON.stringify({
        _subject: test ? "Toppers Skoatterwâld: testmelding" : `Toppers Skoatterwâld: ${a.naam} wil meedoen`,
        _template: "table", _captcha: "false",
        Naam: a.naam, "E-mailadres": a.email, Fietst: (a.fietsen || []).join(", ") || "-", Bericht: a.bericht || "-",
        Actie: test ? "Dit is een test vanuit de app. Meldingen komen op dit adres binnen." : `Open de app, ga naar Admin, Aanvragen, en kies accepteren of afwijzen: ${APP_URL}/admin?tab=aanvragen`,
      }),
    });
    const j = await r.json().catch(() => ({}));
    return { verstuurd: r.ok, antwoord: j.message || r.status };
  } catch (e) { return { verstuurd: false, reden: String(e) }; }
}

async function alleAanvragen() {
  const store = db();
  const { blobs } = await store.list({ prefix: "aanvragen/" });
  const rijen = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  return rijen.filter(Boolean).sort((a, b) => a.tijd.localeCompare(b.tijd));
}

async function alleLeden() {
  const store = db();
  const { blobs } = await store.list({ prefix: "leden/" });
  const leden = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  return leden.filter(Boolean).sort((a, b) => (a.rugnummer || 999) - (b.rugnummer || 999));
}

async function vindOpEmail(email) {
  const e = email.trim().toLowerCase();
  return (await alleLeden()).find((l) => l.email.toLowerCase() === e) || null;
}

async function aanmeldingen() {
  const store = db();
  const { blobs } = await store.list({ prefix: "aanmelding/" });
  const rijen = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  const perRit = {};
  rijen.filter(Boolean).forEach((r) => { (perRit[r.ritId] ||= []).push(r); });
  return perRit;
}

function verkleinPunten(punten, max) {
  if (!Array.isArray(punten) || punten.length <= max) return punten || [];
  const stap = (punten.length - 1) / (max - 1);
  const uit = [];
  for (let i = 0; i < max; i++) uit.push(punten[Math.round(i * stap)]);
  return uit;
}

function ritVoorLijst(rit, aanm, leden) {
  const ledenMap = Object.fromEntries(leden.map((l) => [l.id, l]));
  const lijst = (aanm || []).filter((a) => ledenMap[a.lidId]).map((a) => ({
    lidId: a.lidId, status: a.status, thuis: a.thuis || null, notitie: a.notitie || "",
    naam: ledenMap[a.lidId].naam, rugnummer: ledenMap[a.lidId].rugnummer, bijgewerkt: a.bijgewerkt,
  }));
  return { ...rit, route: rit.route ? { ...rit.route, punten: verkleinPunten(rit.route.punten, 140) } : null, aanmeldingen: lijst };
}

function schoonRoute(route) {
  if (!route || !Array.isArray(route.punten) || route.punten.length < 2) return null;
  const punten = verkleinPunten(route.punten, 900).map((p) => [
    Math.round(Number(p[0]) * 1e5) / 1e5, Math.round(Number(p[1]) * 1e5) / 1e5,
    p[2] == null ? null : Math.round(Number(p[2]) * 10) / 10, Math.round(Number(p[3]) || 0),
  ]).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  return {
    afstand: Math.round(Number(route.afstand) || 0),
    stijging: Math.round(Number(route.stijging) || 0),
    daling: Math.round(Number(route.daling) || 0),
    hoogsteHoogte: route.hoogsteHoogte == null ? null : Math.round(route.hoogsteHoogte),
    laagsteHoogte: route.laagsteHoogte == null ? null : Math.round(route.laagsteHoogte),
    rondrit: !!route.rondrit,
    naam: tekst(route.naam, 120),
    punten,
  };
}

function ritVelden(b, bestaand = {}) {
  const rit = { ...bestaand };
  if (b.titel !== undefined) rit.titel = tekst(b.titel, 80);
  if (b.type !== undefined) rit.type = b.type;
  if (b.datum !== undefined) rit.datum = b.datum;
  if (b.starttijd !== undefined) rit.starttijd = b.starttijd;
  if (b.startplek !== undefined) rit.startplek = tekst(b.startplek, 120);
  if (b.omschrijving !== undefined) rit.omschrijving = tekst(b.omschrijving, 1500);
  if (b.tempo !== undefined) rit.tempo = Number(b.tempo) > 0 ? Math.min(45, Math.max(8, Math.round(Number(b.tempo)))) : null;
  if (!rit.titel) return { fout: "Geef de rit een naam." };
  if (!TYPES.includes(rit.type)) return { fout: "Kies race, gravel of ATB." };
  if (!datumOk(rit.datum)) return { fout: "Kies een geldige datum." };
  if (!tijdOk(rit.starttijd)) return { fout: "Kies een geldige starttijd." };
  return { rit };
}

async function leesBody(req) {
  try { return await req.json(); } catch { return {}; }
}

// Alle voorbeeldinhoud weghalen. Alles tegelijk, en een fout bij één onderdeel houdt de rest niet tegen.
async function wisVoorbeelden(store) {
  const lees = async (prefix) => {
    const { blobs } = await store.list({ prefix });
    const rijen = await Promise.allSettled(blobs.map((b) => store.get(b.key, { type: "json" })));
    return blobs.map((b, i) => ({ key: b.key, data: rijen[i].status === "fulfilled" ? rijen[i].value : null }));
  };
  const [leden, ritten, chat, aanm] = await Promise.all([lees("leden/"), lees("ritten/"), lees("chat/"), store.list({ prefix: "aanmelding/" })]);
  const demoLeden = new Set(leden.filter((x) => x.data?.demo).map((x) => x.data.id));
  const demoRitten = new Set(ritten.filter((x) => x.data?.demo).map((x) => x.data.id));
  const weg = [
    ...[...demoRitten].flatMap((id) => [`ritten/${id}`, `gpx/${id}`]),
    ...aanm.blobs.map((b) => b.key).filter((k) => { const [, r, l] = k.split("/"); return demoRitten.has(r) || demoLeden.has(l); }),
    ...chat.filter((x) => x.data && (x.data.demo || demoLeden.has(x.data.lidId))).map((x) => x.key),
    ...[...demoLeden].map((id) => `leden/${id}`),
  ];
  const uit = await Promise.allSettled(weg.map((k) => store.delete(k)));
  const mislukt = uit.filter((u) => u.status === "rejected").length;
  if (mislukt) console.error("wisVoorbeelden: niet alles verwijderd", mislukt);
  return { ritten: demoRitten.size, leden: demoLeden.size, berichten: chat.filter((x) => x.data && (x.data.demo || demoLeden.has(x.data.lidId))).length, mislukt };
}

export default async (req) => {
  const url = new URL(req.url);
  const pad = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const deel = pad.split("/");
  const m = req.method;
  const store = db();

  try {
    await leesConfig();

    // ---------- Inloggen ----------
    if (pad === "login" && m === "POST") {
      const b = await leesBody(req);
      const email = tekst(b.email, 200).toLowerCase();
      const rem = await remPoging("login:" + email);
      if (rem.geblokkeerd) return fout("Te vaak geprobeerd. Wacht een kwartier en probeer het opnieuw.", 429);
      const lid = email ? await vindOpEmail(email) : null;
      if (!lid || lid.demo || !(await klopt(b.wachtwoord || "", lid.wachtwoord.salt, lid.wachtwoord.hash))) {
        await rem.fout();
        return fout("E-mailadres of wachtwoord klopt niet.", 401);
      }
      await rem.goed();
      return json({ lid: eigen(lid) }, 200, { "set-cookie": [await maakSessie(lid), wisCookie(ADMIN_COOKIE)] });
    }

    // ---------- Meedoen: aanvraag zonder account ----------
    if (pad === "aanvraag" && m === "POST") {
      const b = await leesBody(req);
      if (b.website) return json({ ok: true }); // honingpot tegen spam
      const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "onbekend";
      const rem = await remPoging("aanvraag:" + ip);
      if (rem.geblokkeerd) return fout("Te veel aanvragen vanaf dit adres. Probeer het later opnieuw.", 429);
      await rem.fout();
      const naam = tekst(b.naam, 60);
      if (!naam) return fout("Vul je naam in.");
      if (!emailOk(b.email)) return fout("Vul een geldig e-mailadres in.");
      const email = b.email.trim().toLowerCase();
      const mobiel = mobielNummer(b.mobiel);
      if (mobiel === null) return fout("Dit mobiele nummer klopt niet. Laat het leeg of vul bijvoorbeeld 06 12345678 in.");
      const open = await alleAanvragen();
      if (open.length >= 100) return fout("Er staan al veel aanvragen open. Probeer het later opnieuw.", 429);
      const bestaand = open.find((a) => a.email === email);
      const lid = await vindOpEmail(email);
      if (!lid) {
        const id = bestaand?.id || nieuwId(10);
        const aanvraag = {
          id, naam, email, mobiel: mobiel || bestaand?.mobiel || "", bericht: tekst(b.bericht, 400) || bestaand?.bericht || "",
          fietsen: Array.isArray(b.fietsen) && b.fietsen.length ? b.fietsen.filter((f) => TYPES.includes(f)) : bestaand?.fietsen || [],
          tijd: bestaand?.tijd || new Date().toISOString(),
        };
        await store.setJSON(`aanvragen/${id}`, aanvraag);
        if (!bestaand) await meldAanvraag(await leesConfig(), aanvraag);
      }
      // Altijd hetzelfde antwoord, zodat niemand kan uitzoeken wie er al lid is.
      return json({ ok: true });
    }

    if (pad === "logout" && m === "POST") {
      return json({ ok: true }, 200, { "set-cookie": [wisCookie(SESSIE_COOKIE), wisCookie(ADMIN_COOKIE)] });
    }

    // Vanaf hier: ingelogd.
    const lid = await huidigLid(req);
    if (!lid) return fout("Niet ingelogd.", 401);

    // ---------- Eigen profiel ----------
    if (pad === "ik" && m === "GET") {
      const cfg = await leesConfig();
      const aanvragen = lid.rol === "admin" ? (await alleAanvragen()).length : undefined;
      return json({ lid: eigen(lid), adminOpen: await adminOntgrendeld(req, lid), codeStandaard: lid.rol === "admin" ? !!cfg.codeStandaard : undefined, aanvragen, meldingsEmail: lid.rol === "admin" ? cfg.meldingsEmail || "" : undefined, mailserver: lid.rol === "admin" ? mailserverAan() : undefined });
    }

    if (pad === "ik" && m === "PUT") {
      const b = await leesBody(req);
      const nieuw = { ...lid };
      if (b.naam !== undefined) {
        const naam = tekst(b.naam, 60);
        if (!naam) return fout("Vul je naam in.");
        nieuw.naam = naam;
      }
      if (Array.isArray(b.fietsen)) nieuw.fietsen = b.fietsen.filter((f) => TYPES.includes(f));
      if (b.mobiel !== undefined) {
        const mob = mobielNummer(b.mobiel);
        if (mob === null) return fout("Dit mobiele nummer klopt niet. Vul bijvoorbeeld 06 12345678 in.");
        nieuw.mobiel = mob;
      }
      if (b.email !== undefined && b.email.trim().toLowerCase() !== lid.email.toLowerCase()) {
        if (!emailOk(b.email)) return fout("Dit is geen geldig e-mailadres.");
        if (!(await klopt(b.huidigWachtwoord || "", lid.wachtwoord.salt, lid.wachtwoord.hash))) return fout("Je huidige wachtwoord klopt niet.", 403);
        const ander = await vindOpEmail(b.email);
        if (ander && ander.id !== lid.id) return fout("Dit e-mailadres is al in gebruik.");
        nieuw.email = b.email.trim().toLowerCase();
      }
      await store.setJSON(`leden/${lid.id}`, nieuw);
      return json({ lid: eigen(nieuw) });
    }

    if (pad === "ik/wachtwoord" && m === "PUT") {
      const b = await leesBody(req);
      if (!(await klopt(b.huidig || "", lid.wachtwoord.salt, lid.wachtwoord.hash))) return fout("Je huidige wachtwoord klopt niet.", 403);
      if (typeof b.nieuw !== "string" || b.nieuw.length < 6) return fout("Kies een wachtwoord van minstens 6 tekens.");
      const nieuw = { ...lid, wachtwoord: await hashGeheim(b.nieuw), wachtwoordStandaard: false };
      await store.setJSON(`leden/${lid.id}`, nieuw);
      return json({ ok: true, lid: eigen(nieuw) }, 200, { "set-cookie": [await maakSessie(nieuw)] });
    }

    // ---------- Leden (publiek binnen de groep) ----------
    if (pad === "leden" && m === "GET") {
      return json({ leden: (await alleLeden()).map(publiek) });
    }

    // ---------- Ritten ----------
    if (pad === "ritten" && m === "GET") {
      const [{ blobs }, aanm, leden] = await Promise.all([store.list({ prefix: "ritten/" }), aanmeldingen(), alleLeden()]);
      const ritten = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean);
      ritten.sort((a, b) => (a.datum + a.starttijd).localeCompare(b.datum + b.starttijd));
      return json({ ritten: ritten.map((r) => ritVoorLijst(r, aanm[r.id], leden)) });
    }

    if (deel[0] === "ritten" && deel[1] && deel.length === 2 && m === "GET") {
      const rit = await store.get(`ritten/${deel[1]}`, { type: "json" });
      if (!rit) return fout("Deze rit bestaat niet (meer).", 404);
      const [aanm, leden] = await Promise.all([aanmeldingen(), alleLeden()]);
      const r = ritVoorLijst(rit, aanm[rit.id], leden);
      r.route = rit.route; // volledige route voor de detailkaart
      return json({ rit: r });
    }

    if (deel[0] === "ritten" && deel[2] === "gpx" && m === "GET") {
      const rit = await store.get(`ritten/${deel[1]}`, { type: "json" });
      const gpx = rit && (await store.get(`gpx/${deel[1]}`));
      if (!gpx) return fout("Geen GPX gevonden.", 404);
      const naam = (rit.gpxNaam || `${rit.titel}.gpx`).replace(/[^\w.\- ]+/g, "_");
      const kop = {
        "content-type": "application/gpx+xml; charset=utf-8",
        "content-disposition": `attachment; filename="${naam.endsWith(".gpx") ? naam : naam + ".gpx"}"`,
        "cache-control": "private, max-age=300",
      };
      // Grote bestanden ingepakt versturen: de browser pakt ze vanzelf uit.
      if (gpx.length > 1500000 && /gzip/.test(req.headers.get("accept-encoding") || "")) {
        return new Response(gzipSync(Buffer.from(gpx, "utf8")), { headers: { ...kop, "content-encoding": "gzip", vary: "accept-encoding" } });
      }
      return new Response(gpx, { headers: kop });
    }

    if (deel[0] === "ritten" && deel[2] === "aanmelding" && m === "PUT") {
      const rit = await store.get(`ritten/${deel[1]}`, { type: "json" });
      if (!rit) return fout("Deze rit bestaat niet (meer).", 404);
      const b = await leesBody(req);
      if (b.status === null) {
        await store.delete(`aanmelding/${rit.id}/${lid.id}`);
        return json({ ok: true });
      }
      if (!STATUS.includes(b.status)) return fout("Kies ja, nee of misschien.");
      if (b.thuis && !tijdOk(b.thuis)) return fout("Kies een geldige tijd.");
      const rij = { ritId: rit.id, lidId: lid.id, status: b.status, thuis: b.status === "nee" ? null : b.thuis || null, notitie: tekst(b.notitie, 140), bijgewerkt: new Date().toISOString() };
      await store.setJSON(`aanmelding/${rit.id}/${lid.id}`, rij);
      return json({ ok: true, aanmelding: rij });
    }

    // ---------- Chat ----------
    if (pad === "chat" && m === "GET") {
      const na = url.searchParams.get("na") || "";
      const { blobs } = await store.list({ prefix: "chat/" });
      const volg = (k) => parseFloat(k.replace(/^chat\//, "").split("-")[0]) || 0;
      let sleutels = blobs.map((b) => b.key).sort((x, y) => volg(x) - volg(y) || (x < y ? -1 : 1));
      if (na) { const grens = volg(`chat/${na}`); sleutels = sleutels.filter((k) => volg(k) > grens || (volg(k) === grens && k > `chat/${na}`)); }
      sleutels = sleutels.slice(-80);
      const berichten = (await Promise.all(sleutels.map((k) => store.get(k, { type: "json" })))).filter(Boolean);
      return json({ berichten });
    }

    if (pad === "chat" && m === "POST") {
      const b = await leesBody(req);
      const t = tekst(b.tekst, 2000);
      let fotoId = null, fotoVorm = null;
      if (b.foto) {
        const mt = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(b.foto);
        if (!mt) return fout("Deze foto kan ik niet lezen.");
        const buf = Buffer.from(mt[3], "base64");
        if (buf.length > MAX_FOTO) return fout("De foto is te groot.");
        fotoId = nieuwId(14);
        fotoVorm = Number(b.fotoVorm) > 0 ? Math.round(Number(b.fotoVorm) * 1000) / 1000 : null;
        await store.set(`foto/${fotoId}`, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), { metadata: { type: mt[1] } });
      }
      if (!t && !fotoId) return fout("Leeg bericht.");
      const nu = new Date();
      const id = `${nu.getTime().toString().padStart(14, "0")}-${nieuwId(6)}`;
      const bericht = { id, lidId: lid.id, naam: lid.naam, rugnummer: lid.rugnummer, tekst: t, fotoId, fotoVorm, ritId: tekst(b.ritId, 20) || null, tijd: nu.toISOString() };
      await store.setJSON(`chat/${id}`, bericht);
      return json({ bericht });
    }

    if (deel[0] === "chat" && deel[1] && deel[2] === "foto" && m === "DELETE") {
      const bericht = await store.get(`chat/${deel[1]}`, { type: "json" });
      if (!bericht) return json({ ok: true });
      if (bericht.lidId !== lid.id && lid.rol !== "admin") return fout("Je kunt alleen je eigen foto's verwijderen.", 403);
      if (bericht.fotoId) await store.delete(`foto/${bericht.fotoId}`);
      if (!bericht.tekst) { await store.delete(`chat/${bericht.id}`); return json({ ok: true, weg: true }); }
      const nieuw = { ...bericht, fotoId: null, fotoVorm: null, fotoWeg: lid.id === bericht.lidId ? "zelf" : "organisatie" };
      await store.setJSON(`chat/${bericht.id}`, nieuw);
      return json({ ok: true, bericht: nieuw });
    }

    if (deel[0] === "chat" && deel[1] && !deel[2] && m === "DELETE") {
      const bericht = await store.get(`chat/${deel[1]}`, { type: "json" });
      if (!bericht) return json({ ok: true });
      if (bericht.lidId !== lid.id && lid.rol !== "admin") return fout("Je kunt alleen je eigen berichten verwijderen.", 403);
      if (bericht.fotoId) await store.delete(`foto/${bericht.fotoId}`);
      await store.delete(`chat/${deel[1]}`);
      return json({ ok: true });
    }

    if (deel[0] === "foto" && deel[1] && m === "GET") {
      const r = await store.getWithMetadata(`foto/${deel[1]}`, { type: "arrayBuffer" });
      if (!r) return fout("Foto niet gevonden.", 404);
      return new Response(r.data, { headers: { "content-type": r.metadata?.type || "image/jpeg", "cache-control": "private, max-age=31536000, immutable" } });
    }

    // ---------- Admin ----------
    if (deel[0] === "admin") {
      if (lid.rol !== "admin") return fout("Alleen voor de organisatie.", 403);

      if (pad === "admin/ontgrendel" && m === "POST") {
        const b = await leesBody(req);
        const rem = await remPoging("code:" + lid.id);
        if (rem.geblokkeerd) return fout("Te vaak een verkeerde code. Wacht een kwartier.", 429);
        const cfg = await leesConfig();
        if (!(await klopt(String(b.code || ""), cfg.adminCode.salt, cfg.adminCode.hash))) {
          await rem.fout();
          return fout("Verkeerde code.", 403);
        }
        await rem.goed();
        return json({ ok: true, codeStandaard: !!cfg.codeStandaard }, 200, { "set-cookie": [await maakAdminSessie(lid)] });
      }

      if (pad === "admin/vergrendel" && m === "POST") {
        return json({ ok: true }, 200, { "set-cookie": [wisCookie(ADMIN_COOKIE)] });
      }

      if (!(await adminOntgrendeld(req, lid))) return fout("Voer eerst de admincode in.", 423);

      if (pad === "admin/code" && m === "PUT") {
        const b = await leesBody(req);
        const code = String(b.code || "");
        if (!/^\d{4,8}$/.test(code)) return fout("De code moet uit 4 tot 8 cijfers bestaan.");
        const cfg = await leesConfig();
        cfg.adminCode = await hashGeheim(code);
        cfg.codeVersie = (cfg.codeVersie || 1) + 1;
        cfg.codeStandaard = code === "7000";
        await bewaarConfig(cfg);
        return json({ ok: true }, 200, { "set-cookie": [await maakAdminSessie(lid)] });
      }

      if (pad === "admin/meldingen" && m === "PUT") {
        const b = await leesBody(req);
        const adres = tekst(b.email, 200).toLowerCase();
        if (adres && !emailOk(adres)) return fout("Dit is geen geldig e-mailadres.");
        const cfg = await leesConfig();
        cfg.meldingsEmail = adres;
        await bewaarConfig(cfg);
        const test = adres ? await meldAanvraag(cfg, { naam: "Testmelding", email: adres, bericht: "" }, true) : null;
        return json({ ok: true, meldingsEmail: adres, test });
      }

      if (pad === "admin/fotos" && m === "GET") {
        const { blobs } = await store.list({ prefix: "chat/" });
        const rijen = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter((b) => b && b.fotoId);
        rijen.sort((x, y) => (x.id < y.id ? 1 : -1));
        return json({ fotos: rijen.map((b) => ({ id: b.id, fotoId: b.fotoId, fotoVorm: b.fotoVorm, naam: b.naam, tekst: b.tekst, tijd: b.tijd })) });
      }

      if (pad === "admin/aanvragen" && m === "GET") {
        return json({ aanvragen: await alleAanvragen() });
      }

      if (deel[1] === "aanvragen" && deel[2] && deel[3] === "accepteer" && m === "POST") {
        const wachtwoord = gekozenWachtwoord(await leesBody(req));
        if (!wachtwoord) return wachtwoordFout();
        const a = await store.get(`aanvragen/${deel[2]}`, { type: "json" });
        if (!a) return fout("Deze aanvraag bestaat niet meer.", 404);
        if (await vindOpEmail(a.email)) {
          await store.delete(`aanvragen/${a.id}`);
          return fout("Er is al een account met dit e-mailadres. Geef die persoon een nieuw wachtwoord via Fietsers.");
        }
        const leden = await alleLeden();
        const nieuw = {
          id: nieuwId(10), naam: a.naam, email: a.email, mobiel: a.mobiel || "", rol: "lid",
          rugnummer: Math.max(0, ...leden.map((l) => l.rugnummer || 0)) + 1,
          fietsen: a.fietsen || [], wachtwoord: await hashGeheim(wachtwoord), wachtwoordStandaard: true,
          aangemaakt: new Date().toISOString(), viaAanvraag: true,
        };
        await store.setJSON(`leden/${nieuw.id}`, nieuw);
        await store.delete(`aanvragen/${a.id}`);
        const mail = await stuurWelkom(nieuw, wachtwoord, { afzender: lid.naam });
        return json({ lid: { ...publiek(nieuw), email: nieuw.email, mobiel: nieuw.mobiel }, mail: { ...mail, van: AFZENDER } });
      }

      if (deel[1] === "aanvragen" && deel[2] && m === "DELETE") {
        await store.delete(`aanvragen/${deel[2]}`);
        return json({ ok: true });
      }

      if (deel[1] === "leden" && deel[2] && deel[3] === "nieuwwachtwoord" && m === "POST") {
        const wachtwoord = gekozenWachtwoord(await leesBody(req));
        if (!wachtwoord) return wachtwoordFout();
        const doel = await store.get(`leden/${deel[2]}`, { type: "json" });
        if (!doel) return fout("Lid niet gevonden.", 404);
        if (doel.demo) return fout("Voorbeeldrenners kunnen niet inloggen.");
        doel.wachtwoord = await hashGeheim(wachtwoord);
        doel.wachtwoordStandaard = true;
        await store.setJSON(`leden/${doel.id}`, doel);
        const mail = await stuurWelkom(doel, wachtwoord, { nieuwWachtwoord: true, afzender: lid.naam });
        return json({ lid: { ...publiek(doel), email: doel.email, mobiel: doel.mobiel || "" }, mail: { ...mail, van: AFZENDER } });
      }

      if (pad === "admin/leden" && m === "GET") {
        return json({ leden: (await alleLeden()).map((l) => ({ ...publiek(l), email: l.email, mobiel: l.mobiel || "", wachtwoordStandaard: !!l.wachtwoordStandaard, aangemaakt: l.aangemaakt })) });
      }

      if (pad === "admin/leden" && m === "POST") {
        const b = await leesBody(req);
        const naam = tekst(b.naam, 60);
        if (!naam) return fout("Vul een naam in.");
        if (!emailOk(b.email)) return fout("Vul een geldig e-mailadres in.");
        if (await vindOpEmail(b.email)) return fout("Dit e-mailadres is al in gebruik.");
        const mobiel = mobielNummer(b.mobiel);
        if (mobiel === null) return fout("Dit mobiele nummer klopt niet. Laat het leeg of vul bijvoorbeeld 06 12345678 in.");
        const wachtwoord = gekozenWachtwoord(b);
        if (!wachtwoord) return wachtwoordFout();
        const leden = await alleLeden();
        const nieuw = {
          id: nieuwId(10), naam, email: b.email.trim().toLowerCase(), mobiel, rol: b.rol === "admin" ? "admin" : "lid",
          rugnummer: Number(b.rugnummer) || Math.max(0, ...leden.map((l) => l.rugnummer || 0)) + 1,
          fietsen: Array.isArray(b.fietsen) ? b.fietsen.filter((f) => TYPES.includes(f)) : [],
          wachtwoord: await hashGeheim(wachtwoord), wachtwoordStandaard: true, aangemaakt: new Date().toISOString(),
        };
        await store.setJSON(`leden/${nieuw.id}`, nieuw);
        const mail = await stuurWelkom(nieuw, wachtwoord, { afzender: lid.naam });
        return json({ lid: { ...publiek(nieuw), email: nieuw.email, mobiel: nieuw.mobiel }, mail: { ...mail, van: AFZENDER } });
      }

      if (deel[1] === "leden" && deel[2] && m === "PUT") {
        const doel = await store.get(`leden/${deel[2]}`, { type: "json" });
        if (!doel) return fout("Lid niet gevonden.", 404);
        const b = await leesBody(req);
        if (b.naam !== undefined) { const n = tekst(b.naam, 60); if (!n) return fout("Vul een naam in."); doel.naam = n; }
        if (b.email !== undefined) {
          if (!emailOk(b.email)) return fout("Vul een geldig e-mailadres in.");
          const ander = await vindOpEmail(b.email);
          if (ander && ander.id !== doel.id) return fout("Dit e-mailadres is al in gebruik.");
          doel.email = b.email.trim().toLowerCase();
        }
        if (b.mobiel !== undefined) {
          const mob = mobielNummer(b.mobiel);
          if (mob === null) return fout("Dit mobiele nummer klopt niet. Vul bijvoorbeeld 06 12345678 in.");
          doel.mobiel = mob;
        }
        if (b.rugnummer !== undefined) doel.rugnummer = Math.max(1, Math.min(999, Number(b.rugnummer) || doel.rugnummer));
        if (b.rol !== undefined) {
          if (doel.id === lid.id && b.rol !== "admin") return fout("Je kunt jezelf geen admin-rechten afnemen.");
          doel.rol = b.rol === "admin" ? "admin" : "lid";
        }
        if (b.wachtwoord) {
          if (b.wachtwoord.length < 6) return fout("Kies een wachtwoord van minstens 6 tekens.");
          doel.wachtwoord = await hashGeheim(b.wachtwoord);
          doel.wachtwoordStandaard = true;
          delete doel.demo;
        }
        await store.setJSON(`leden/${doel.id}`, doel);
        return json({ lid: publiek(doel) });
      }

      if (deel[1] === "leden" && deel[2] && m === "DELETE") {
        if (deel[2] === lid.id) return fout("Je kunt jezelf niet verwijderen.");
        await store.delete(`leden/${deel[2]}`);
        const { blobs } = await store.list({ prefix: "aanmelding/" });
        await Promise.all(blobs.filter((b) => b.key.endsWith(`/${deel[2]}`)).map((b) => store.delete(b.key)));
        return json({ ok: true });
      }

      if (pad === "admin/ritten" && m === "POST") {
        const b = await leesBody(req);
        const { rit, fout: f } = ritVelden(b);
        if (f) return fout(f);
        const gTekst = gpxTekst(b.gpx);
        if (!gTekst) return fout("Voeg een GPX-bestand toe.");
        if (gTekst.length > MAX_GPX) return fout("Het GPX-bestand is te groot.");
        if (!/<gpx[\s>]/i.test(gTekst.slice(0, 5000))) return fout("Dit lijkt geen GPX-bestand.");
        const route = schoonRoute(b.route);
        if (!route) return fout("In dit GPX-bestand staat geen bruikbare route.");
        const id = nieuwId(8);
        const nieuw = { ...rit, id, route, gpxNaam: tekst(b.gpx.naam, 120) || `${rit.titel}.gpx`, gemaaktDoor: lid.naam, aangemaakt: new Date().toISOString() };
        await store.set(`gpx/${id}`, gTekst);
        await store.setJSON(`ritten/${id}`, nieuw);
        return json({ rit: nieuw });
      }

      if (deel[1] === "ritten" && deel[2] && m === "PUT") {
        const bestaand = await store.get(`ritten/${deel[2]}`, { type: "json" });
        if (!bestaand) return fout("Rit niet gevonden.", 404);
        const b = await leesBody(req);
        const { rit, fout: f } = ritVelden(b, bestaand);
        if (f) return fout(f);
        const gNieuw = gpxTekst(b.gpx);
        if (gNieuw) {
          if (gNieuw.length > MAX_GPX) return fout("Het GPX-bestand is te groot.");
          if (!/<gpx[\s>]/i.test(gNieuw.slice(0, 5000))) return fout("Dit lijkt geen GPX-bestand.");
          const route = schoonRoute(b.route);
          if (!route) return fout("In dit GPX-bestand staat geen bruikbare route.");
          rit.route = route;
          rit.gpxNaam = tekst(b.gpx.naam, 120) || `${rit.titel}.gpx`;
          await store.set(`gpx/${rit.id}`, gNieuw);
        }
        rit.bijgewerkt = new Date().toISOString();
        await store.setJSON(`ritten/${rit.id}`, rit);
        return json({ rit });
      }

      if (deel[1] === "ritten" && deel[2] && m === "DELETE") {
        await store.delete(`ritten/${deel[2]}`);
        await store.delete(`gpx/${deel[2]}`);
        const { blobs } = await store.list({ prefix: `aanmelding/${deel[2]}/` });
        await Promise.all(blobs.map((b) => store.delete(b.key)));
        return json({ ok: true });
      }

      if (pad === "admin/demo" && m === "DELETE") {
        return json({ ok: true, ...(await wisVoorbeelden(store)) });
      }

    }

    return fout("Onbekende route.", 404);
  } catch (e) {
    console.error(e);
    return fout("Er ging iets mis op de server. Probeer het zo nog eens.", 500);
  }
};

export const config = { path: "/api/*" };
