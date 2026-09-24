// Wachtwoorden, sessies en de admincode.
import crypto from "node:crypto";
import { promisify } from "node:util";
import { db, versleutelingAan, versleutelBestaande } from "./store.mjs";

const scrypt = promisify(crypto.scrypt);

export const SESSIE_COOKIE = "tsw_sessie";
export const ADMIN_COOKIE = "tsw_admin";
const SESSIE_DUUR = 60 * 60 * 24 * 60; // 60 dagen
const ADMIN_DUUR = 60 * 60 * 2; // 2 uur

export async function hashGeheim(geheim, salt = crypto.randomBytes(16).toString("hex")) {
  const key = await scrypt(String(geheim), salt, 64);
  return { salt, hash: key.toString("hex") };
}

export async function klopt(geheim, salt, hash) {
  if (!salt || !hash) return false;
  const key = await scrypt(String(geheim), salt, 64);
  const a = Buffer.from(hash, "hex");
  return a.length === key.length && crypto.timingSafeEqual(a, key);
}

export function nieuwId(lengte = 10) {
  return crypto.randomBytes(lengte).toString("base64url").slice(0, lengte);
}

let migratieGedaan = false;

// Config met geheime sleutel, admincode en de eerste admin.
export async function config() {
  const store = db();
  let cfg = await store.get("config", { type: "json" });
  if (!cfg) {
    const code = await hashGeheim("7000");
    cfg = {
      geheim: crypto.randomBytes(32).toString("hex"),
      adminCode: code,
      codeVersie: 1,
      codeStandaard: true,
      aangemaakt: new Date().toISOString(),
    };
    await store.setJSON("config", cfg);
    const pw = await hashGeheim("admin");
    const admin = {
      id: "admin",
      naam: "Admin",
      email: "admin@toppers.nl",
      rol: "admin",
      rugnummer: 1,
      fietsen: ["race", "gravel", "atb"],
      wachtwoord: pw,
      wachtwoordStandaard: true,
      aangemaakt: new Date().toISOString(),
    };
    if (!(await store.get("leden/admin"))) await store.setJSON("leden/admin", admin);
  }
  if (!cfg.versleuteld && versleutelingAan() && !migratieGedaan) {
    migratieGedaan = true;
    await versleutelBestaande();
    cfg.versleuteld = true;
    await store.setJSON("config", cfg);
  }
  return cfg;
}

export async function bewaarConfig(cfg) {
  await db().setJSON("config", cfg);
}

function teken(payload, geheim) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", geheim).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function lees(token, geheim) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const verwacht = crypto.createHmac("sha256", geheim).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(verwacht);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!p.exp || p.exp < Date.now() / 1000) return null;
    return p;
  } catch { return null; }
}

export function cookies(req) {
  const uit = {};
  (req.headers.get("cookie") || "").split(";").forEach((c) => {
    const i = c.indexOf("=");
    if (i > 0) uit[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return uit;
}

function cookieRegel(naam, waarde, maxAge) {
  return `${naam}=${encodeURIComponent(waarde)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function maakSessie(lid) {
  const cfg = await config();
  const token = teken({ uid: lid.id, pv: lid.wachtwoord.salt.slice(0, 8), exp: Math.floor(Date.now() / 1000) + SESSIE_DUUR }, cfg.geheim);
  return cookieRegel(SESSIE_COOKIE, token, SESSIE_DUUR);
}

export function wisCookie(naam) {
  return `${naam}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// Geeft het ingelogde lid terug, of null. Een wachtwoordwissel maakt oude sessies ongeldig.
export async function huidigLid(req) {
  const cfg = await config();
  const p = lees(cookies(req)[SESSIE_COOKIE], cfg.geheim);
  if (!p) return null;
  const lid = await db().get(`leden/${p.uid}`, { type: "json" });
  if (!lid || lid.wachtwoord.salt.slice(0, 8) !== p.pv) return null;
  return lid;
}

export async function maakAdminSessie(lid) {
  const cfg = await config();
  const token = teken({ uid: lid.id, cv: cfg.codeVersie, exp: Math.floor(Date.now() / 1000) + ADMIN_DUUR }, cfg.geheim);
  return cookieRegel(ADMIN_COOKIE, token, ADMIN_DUUR);
}

export async function adminOntgrendeld(req, lid) {
  if (!lid || lid.rol !== "admin") return false;
  const cfg = await config();
  const p = lees(cookies(req)[ADMIN_COOKIE], cfg.geheim);
  return !!p && p.uid === lid.id && p.cv === cfg.codeVersie;
}

// Eenvoudige rem op raden: max 8 pogingen per kwartier per sleutel.
export async function remPoging(sleutel) {
  const store = db();
  const k = `rem/${crypto.createHash("sha256").update(sleutel).digest("hex").slice(0, 24)}`;
  const nu = Date.now();
  const r = (await store.get(k, { type: "json" })) || { n: 0, sinds: nu };
  if (nu - r.sinds > 15 * 60 * 1000) { r.n = 0; r.sinds = nu; }
  return {
    geblokkeerd: r.n >= 8,
    async fout() { r.n += 1; await store.setJSON(k, r); },
    async goed() { if (r.n) await store.delete(k); },
  };
}
