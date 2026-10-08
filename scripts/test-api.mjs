// Uitgebreide test van de API: rechten, invoercontrole en de hele meedoen-stroom.
process.env.LOCAL_STORE_DIR = "/tmp/ts-test";
process.env.MAIL_NAAR_MAP = "/tmp/ts-test-mail";
import { rmSync, readdirSync, readFileSync } from "node:fs";
rmSync("/tmp/ts-test", { recursive: true, force: true });
rmSync("/tmp/ts-test-mail", { recursive: true, force: true });
const mails = () => { try { return readdirSync("/tmp/ts-test-mail").sort().map((f) => JSON.parse(readFileSync(`/tmp/ts-test-mail/${f}`, "utf8"))); } catch { return []; } };
const { default: api } = await import("../netlify/functions/api.mjs");
let goed = 0, fout = 0;
function sessie() {
  let jar = "";
  return async (m, p, b, hdr = {}) => {
    const r = await api(new Request("http://x/api/" + p, { method: m, headers: { cookie: jar, "content-type": "application/json", ...hdr }, body: b && m !== "GET" ? JSON.stringify(b) : undefined }));
    for (const c of r.headers.getSetCookie()) { const kv = c.split(";")[0]; const [k, v] = kv.split("="); jar = jar.split("; ").filter((x) => x && !x.startsWith(k + "=")).concat(v ? [kv] : []).join("; "); }
    let j = null; const t = await r.text(); try { j = JSON.parse(t); } catch {}
    return { s: r.status, j, t, h: r.headers };
  };
}
const check = (naam, voorwaarde, extra = "") => { if (voorwaarde) goed++; else { fout++; console.log("MISLUKT:", naam, extra); } };

const anon = sessie(), admin = sessie(), harm = sessie(), harm2 = sessie();
// Zonder inloggen
for (const p of ["ritten", "chat", "leden", "ik", "admin/leden", "admin/aanvragen"]) check(`anoniem ${p} = 401`, (await anon("GET", p)).s === 401);
check("verkeerd wachtwoord", (await anon("POST", "login", { email: "admin@toppers.nl", wachtwoord: "x" })).s === 401);
check("admin login", (await admin("POST", "login", { email: "admin@toppers.nl", wachtwoord: "admin" })).s === 200);
check("admin zonder code = 423", (await admin("GET", "admin/leden")).s === 423);
check("verkeerde code", (await admin("POST", "admin/ontgrendel", { code: "1234" })).s === 403);
check("goede code", (await admin("POST", "admin/ontgrendel", { code: "7000" })).s === 200);

// Meedoen
check("aanvraag zonder naam", (await anon("POST", "aanvraag", { email: "a@b.nl" })).s === 400);
check("aanvraag fout e-mail", (await anon("POST", "aanvraag", { naam: "X", email: "geen-mail" })).s === 400);
check("aanvraag honingpot", (await anon("POST", "aanvraag", { naam: "Bot", email: "bot@spam.nl", website: "http://spam" })).s === 200);
check("aanvraag fout mobiel", (await anon("POST", "aanvraag", { naam: "X", email: "x@y.nl", mobiel: "12ab" })).s === 400);
check("aanvraag Harm", (await anon("POST", "aanvraag", { naam: "Harm de Jong", email: " Harm@Voorbeeld.nl ", mobiel: "06-12 34 56 78", fietsen: ["race", "hack"], bericht: "Hoi" })).s === 200);
check("dubbele aanvraag", (await anon("POST", "aanvraag", { naam: "Harm de Jong", email: "harm@voorbeeld.nl" })).s === 200);
check("aanvraag van bestaand lid maakt niets", (await anon("POST", "aanvraag", { naam: "Admin", email: "admin@toppers.nl" })).s === 200);
let a = (await admin("GET", "admin/aanvragen")).j.aanvragen;
check("precies 1 aanvraag (geen bot, geen dubbel, geen lid)", a.length === 1, JSON.stringify(a.map((x) => x.email)));
check("fietsen gefilterd", JSON.stringify(a[0].fietsen) === '["race"]');
check("ik toont aantal aanvragen", (await admin("GET", "ik")).j.aanvragen === 1);
check("accepteren zonder wachtwoord = 400", (await admin("POST", `admin/aanvragen/${a[0].id}/accepteer`, {})).s === 400);
check("accepteren met te kort wachtwoord = 400", (await admin("POST", `admin/aanvragen/${a[0].id}/accepteer`, { wachtwoord: "kort" })).s === 400);
const voorMail = mails().length;
const acc = await admin("POST", `admin/aanvragen/${a[0].id}/accepteer`, { wachtwoord: "Waaier-Bidon-47" });
acc.j.code = "Waaier-Bidon-47";
check("accepteren met gekozen wachtwoord", acc.s === 200 && acc.j.mail?.verstuurd === true && acc.j.mail.van === "harmwesseling@yahoo.com", acc.t);
const welkom = mails().slice(voorMail);
check("welkomstmail naar nieuwe fietser met wachtwoord", welkom.length === 1 && welkom[0].aan === "harm@voorbeeld.nl" && welkom[0].van === "harmwesseling@yahoo.com" && welkom[0].tekst.includes("Wachtwoord: Waaier-Bidon-47") && welkom[0].onderwerp.startsWith("Welkom"), JSON.stringify(welkom));
check("mobiel meegenomen en genormaliseerd", acc.j.lid.mobiel === "+31612345678", acc.t);
check("aanvraag weg na accepteren", (await admin("GET", "admin/aanvragen")).j.aanvragen.length === 0);
check("Harm logt in met code", (await harm("POST", "login", { email: "HARM@voorbeeld.nl", wachtwoord: acc.j.code })).s === 200);
check("Harm heeft rugnummer 2", (await harm("GET", "ik")).j.lid.rugnummer === 2);

// Rechten van een gewoon lid
for (const [m, p] of [["GET", "admin/leden"], ["GET", "admin/aanvragen"], ["POST", "admin/ontgrendel"], ["POST", "admin/ritten"], ["DELETE", "admin/leden/admin"]]) check(`lid ${m} ${p} = 403`, (await harm(m, p, {})).s === 403);
check("lid ziet geen e-mailadressen", !JSON.stringify((await harm("GET", "leden")).j).includes("@"));
check("lid ziet geen mobiele nummers", !JSON.stringify((await harm("GET", "leden")).j).includes("612345678"));
check("eigen mobiel zichtbaar", (await harm("GET", "ik")).j.lid.mobiel === "+31612345678");
check("eigen mobiel wijzigen", (await harm("PUT", "ik", { mobiel: "+49 151 1234 5678" })).j.lid.mobiel === "+4915112345678");
check("ongeldig mobiel geweigerd", (await harm("PUT", "ik", { mobiel: "123" })).s === 400);
check("mobiel leegmaken", (await harm("PUT", "ik", { mobiel: "" })).j.lid.mobiel === "");
check("admin zet mobiel", (await admin("PUT", `admin/leden/${acc.j.lid.id}`, { mobiel: "0612345678" })).s === 200 && (await admin("GET", "admin/leden")).j.leden.find((l) => l.id === acc.j.lid.id).mobiel === "+31612345678");

// Nieuwe code
check("nieuw wachtwoord te kort = 400", (await admin("POST", `admin/leden/${acc.j.lid.id}/nieuwwachtwoord`, { wachtwoord: "123" })).s === 400);
const nc = await admin("POST", `admin/leden/${acc.j.lid.id}/nieuwwachtwoord`, { wachtwoord: "Kopwerk-Dijk-12" });
nc.j.code = "Kopwerk-Dijk-12";
const ncMail = mails().at(-1);
check("nieuw wachtwoord gemaild", nc.s === 200 && nc.j.mail?.verstuurd && ncMail.aan === "harm@voorbeeld.nl" && ncMail.tekst.includes("Kopwerk-Dijk-12") && ncMail.onderwerp.includes("nieuwe wachtwoord"), nc.t);
check("oude sessie ongeldig na nieuwe code", (await harm("GET", "ik")).s === 401);
check("oude code werkt niet", (await harm2("POST", "login", { email: "harm@voorbeeld.nl", wachtwoord: acc.j.code })).s === 401);
check("nieuwe code werkt", (await harm2("POST", "login", { email: "harm@voorbeeld.nl", wachtwoord: nc.j.code })).s === 200);

// Wachtwoord en e-mail wijzigen
check("wachtwoord: fout huidig", (await harm2("PUT", "ik/wachtwoord", { huidig: "x", nieuw: "fietsen123" })).s === 403);
check("wachtwoord: te kort", (await harm2("PUT", "ik/wachtwoord", { huidig: nc.j.code, nieuw: "abc" })).s === 400);
check("wachtwoord wijzigen", (await harm2("PUT", "ik/wachtwoord", { huidig: nc.j.code, nieuw: "fietsen123" })).s === 200);
check("sessie blijft geldig na eigen wijziging", (await harm2("GET", "ik")).s === 200);
check("e-mail wijzigen zonder wachtwoord", (await harm2("PUT", "ik", { email: "nieuw@voorbeeld.nl" })).s === 403);
check("e-mail naar bestaand adres", (await harm2("PUT", "ik", { email: "admin@toppers.nl", huidigWachtwoord: "fietsen123" })).s === 400);
check("e-mail wijzigen", (await harm2("PUT", "ik", { email: "harm@fiets.nl", huidigWachtwoord: "fietsen123" })).s === 200);

// Ritten en aanmelden
const gpx = '<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg><trkpt lat="52.9" lon="5.9"/><trkpt lat="52.95" lon="5.95"/></trkseg></trk></gpx>';
const route = { afstand: 6000, stijging: 0, punten: [[52.9, 5.9, null, 0], [52.95, 5.95, null, 6000]] };
check("rit: ongeldig type", (await admin("POST", "admin/ritten", { titel: "X", type: "fiets", datum: "2026-10-01", starttijd: "09:00", gpx: { tekst: gpx }, route })).s === 400);
check("rit: ongeldige datum", (await admin("POST", "admin/ritten", { titel: "X", type: "race", datum: "morgen", starttijd: "09:00", gpx: { tekst: gpx }, route })).s === 400);
check("rit: geen gpx", (await admin("POST", "admin/ritten", { titel: "X", type: "race", datum: "2026-10-01", starttijd: "09:00" })).s === 400);
check("rit: geen echte gpx", (await admin("POST", "admin/ritten", { titel: "X", type: "race", datum: "2026-10-01", starttijd: "09:00", gpx: { tekst: "<html>" }, route })).s === 400);
const rit = await admin("POST", "admin/ritten", { titel: "Test", type: "race", datum: "2026-10-01", starttijd: "09:00", tempo: "", gpx: { naam: "t.gpx", tekst: gpx }, route });
check("rit plannen", rit.s === 200 && rit.j.rit.tempo === null, rit.t.slice(0, 200));
const rid = rit.j.rit.id;
check("aanmelden: ongeldige status", (await harm2("PUT", `ritten/${rid}/aanmelding`, { status: "jawel" })).s === 400);
check("aanmelden: ongeldige tijd", (await harm2("PUT", `ritten/${rid}/aanmelding`, { status: "ja", thuis: "25:00" })).s === 400);
check("aanmelden", (await harm2("PUT", `ritten/${rid}/aanmelding`, { status: "ja", thuis: "11:00", notitie: "x".repeat(500) })).s === 200);
const r1 = (await harm2("GET", `ritten/${rid}`)).j.rit;
check("notitie ingekort", r1.aanmeldingen[0].notitie.length === 140);
check("gpx downloaden", (await harm2("GET", `ritten/${rid}/gpx`)).t === gpx);
check("onbekende rit 404", (await harm2("GET", "ritten/bestaatniet")).s === 404);

// Chat
check("leeg bericht", (await harm2("POST", "chat", { tekst: "  " })).s === 400);
check("kapotte foto", (await harm2("POST", "chat", { foto: "data:text/html;base64,PGh0bWw+" })).s === 400);
const foto = "data:image/jpeg;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64");
const m1 = await harm2("POST", "chat", { tekst: "Hoi", foto, fotoVorm: 1.5 });
check("bericht met foto", m1.s === 200 && m1.j.bericht.fotoId);
check("foto ophalen", (await admin("GET", `foto/${m1.j.bericht.fotoId}`)).h.get("content-type") === "image/jpeg");
const m2 = await admin("POST", "chat", { tekst: "Van de admin" });
check("lid mag andermans bericht niet wissen", (await harm2("DELETE", `chat/${m2.j.bericht.id}`)).s === 403);
// Foto's verwijderen
const m3 = await harm2("POST", "chat", { tekst: "Kijk!", foto });
const m4 = await harm2("POST", "chat", { foto });
const lijstF = (await admin("GET", "admin/fotos")).j.fotos;
check("admin ziet fotolijst", lijstF.length >= 3 && lijstF[0].id === m4.j.bericht.id, JSON.stringify(lijstF.map((f) => f.id)));
check("lid ziet fotolijst niet", (await harm2("GET", "admin/fotos")).s === 403);
const m5 = await admin("POST", "chat", { tekst: "Van de organisatie", foto });
check("lid mag andermans foto niet wissen", (await harm2("DELETE", `chat/${m5.j.bericht.id}/foto`)).s === 403);
check("lid mag eigen foto wissen", (await harm2("DELETE", `chat/${m1.j.bericht.id}/foto`)).j.bericht?.fotoWeg === "zelf");
const wegF = await admin("DELETE", `chat/${m3.j.bericht.id}/foto`);
check("admin wist alleen de foto", wegF.s === 200 && wegF.j.bericht.fotoId === null && wegF.j.bericht.tekst === "Kijk!" && wegF.j.bericht.fotoWeg === "organisatie", wegF.t);
check("foto echt weg", (await admin("GET", `foto/${m3.j.bericht.fotoId}`)).s === 404);
const wegF2 = await admin("DELETE", `chat/${m4.j.bericht.id}/foto`);
check("bericht met alleen foto verdwijnt helemaal", wegF2.j.weg === true && !(await harm2("GET", "chat")).j.berichten.some((b) => b.id === m4.j.bericht.id));
check("admin mag elk bericht wissen", (await admin("DELETE", `chat/${m1.j.bericht.id}`)).s === 200);
check("chat na", (await harm2("GET", `chat?na=${m1.j.bericht.id}`)).j.berichten.length === 3);

// Admin-beveiliging
check("admin kan zichzelf niet wissen", (await admin("DELETE", "admin/leden/admin")).s === 400);
check("admin kan eigen rechten niet afnemen", (await admin("PUT", "admin/leden/admin", { rol: "lid" })).s === 400);
check("code te kort", (await admin("PUT", "admin/code", { code: "12" })).s === 400);
check("meldingsadres ongeldig", (await admin("PUT", "admin/meldingen", { email: "x" })).s === 400);
check("meldingsadres uit", (await admin("PUT", "admin/meldingen", { email: "" })).j.meldingsEmail === "");
const melder = await admin("PUT", "admin/meldingen", { email: "orga@voorbeeld.nl" });
check("testmelding via mailserver", melder.j.test?.verstuurd === true && mails().at(-1).aan === "orga@voorbeeld.nl" && mails().at(-1).onderwerp.includes("testmelding"), melder.t);
await anon("POST", "aanvraag", { naam: "Sanne Melding", email: "sanne@voorbeeld.nl", fietsen: ["gravel"] });
check("nieuwe aanvraag gemeld via mailserver", mails().at(-1).aan === "orga@voorbeeld.nl" && mails().at(-1).onderwerp.includes("Sanne Melding wil meedoen") && mails().at(-1).tekst.includes("gravel"));
await admin("PUT", "admin/meldingen", { email: "" });
check("fietser toevoegen zonder wachtwoord = 400", (await admin("POST", "admin/leden", { naam: "Piet Zonder", email: "piet@voorbeeld.nl" })).s === 400);
const piet = await admin("POST", "admin/leden", { naam: "Piet Met", email: "piet@voorbeeld.nl", wachtwoord: "Tandem-Wind-33" });
check("fietser toevoegen met wachtwoord en welkomstmail", piet.s === 200 && piet.j.mail?.verstuurd && mails().at(-1).aan === "piet@voorbeeld.nl" && mails().at(-1).tekst.includes("Tandem-Wind-33") && !("code" in piet.j), piet.t);
check("ik meldt mailserver aan voor admin", (await admin("GET", "ik")).j.mailserver === true);
const admin2 = sessie();
await admin2("POST", "login", { email: "admin@toppers.nl", wachtwoord: "admin" }); await admin2("POST", "admin/ontgrendel", { code: "7000" });
check("code wijzigen", (await admin("PUT", "admin/code", { code: "4321" })).s === 200);
check("andere adminsessie weer op slot", (await admin2("GET", "admin/leden")).s === 423);
check("eigen sessie blijft open", (await admin("GET", "admin/leden")).s === 200);
check("rit verwijderen", (await admin("DELETE", `admin/ritten/${rid}`)).s === 200);
check("rit weg", (await harm2("GET", `ritten/${rid}`)).s === 404);
check("lid verwijderen", (await admin("DELETE", `admin/leden/${acc.j.lid.id}`)).s === 200);
check("verwijderd lid is uitgelogd", (await harm2("GET", "ik")).s === 401);
// Raden remmen
const raad = sessie(); let laatste;
for (let i = 0; i < 9; i++) laatste = await raad("POST", "login", { email: "admin@toppers.nl", wachtwoord: "fout" + i });
check("na 8 pogingen geblokkeerd", laatste.s === 429);
check("uitloggen", (await admin("POST", "logout")).s === 200 && (await admin("GET", "ik")).s === 401);
console.log(`\n${goed} geslaagd, ${fout} mislukt`);
