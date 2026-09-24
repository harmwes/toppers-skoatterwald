// Snelle rooktest van de API, zonder browser.
process.env.LOCAL_STORE_DIR = "/tmp/ts";
const { default: api } = await import("../netlify/functions/api.mjs");
let jar = "";
async function call(m, p, b) {
  const r = await api(new Request("http://x/api/" + p, { method: m, headers: { cookie: jar, "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }));
  for (const c of r.headers.getSetCookie()) {
    const kv = c.split(";")[0]; const [k, v] = kv.split("=");
    jar = jar.split("; ").filter((x) => x && !x.startsWith(k + "=")).concat(v ? [kv] : []).join("; ");
  }
  const t = await r.text(); console.log(m, p, r.status, t.slice(0, 160)); return t;
}
await call("GET", "ik");
await call("POST", "login", { email: "admin@toppers.nl", wachtwoord: "fout" });
await call("POST", "login", { email: "ADMIN@toppers.nl", wachtwoord: "admin" });
await call("GET", "ik");
await call("GET", "admin/leden");
await call("POST", "admin/ontgrendel", { code: "1234" });
await call("POST", "admin/ontgrendel", { code: "7000" });
await call("POST", "admin/leden", { naam: "Harm", email: "harm@x.nl", wachtwoord: "fiets123" });
const gpx = '<gpx><trk><trkseg><trkpt lat="52.9" lon="5.9"/></trkseg></trk></gpx>';
const r = JSON.parse(await call("POST", "admin/ritten", { titel: "Test", type: "race", datum: "2026-09-27", starttijd: "09:00", gpx: { naam: "t.gpx", tekst: gpx }, route: { afstand: 1000, stijging: 5, punten: [[52.9, 5.9, 1, 0], [52.91, 5.91, 2, 1000]] } }));
await call("PUT", `ritten/${r.rit.id}/aanmelding`, { status: "ja", thuis: "12:30" });
await call("GET", "ritten");
await call("GET", `ritten/${r.rit.id}/gpx`);
await call("POST", "chat", { tekst: "Hoi" });
await call("GET", "chat");
await call("PUT", "admin/code", { code: "1111" });
await call("GET", "admin/leden");
await call("PUT", "ik/wachtwoord", { huidig: "admin", nieuw: "nieuwwachtwoord" });
await call("GET", "ik");
await call("POST", "admin/ontgrendel", { code: "7000" });
await call("POST", "admin/ontgrendel", { code: "1111" });
