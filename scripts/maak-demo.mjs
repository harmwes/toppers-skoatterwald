// Bouwt public/demo.json: voorbeeldritten (echte routes rond Heerenveen), voorbeeldrenners en berichten.
import fs from "node:fs";
import { bouwRoute } from "../src/lib/gpx.js";

const routes = JSON.parse(fs.readFileSync(process.argv[2] || new URL("./demo-routes.json", import.meta.url), "utf8"));
const gpx = (naam, pts) => `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Toppers Skoatterwald" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${naam}</name></metadata>
  <trk><name>${naam}</name><trkseg>
${pts.map((p) => `    <trkpt lat="${p[0]}" lon="${p[1]}"><ele>${p[2]}</ele></trkpt>`).join("\n")}
  </trkseg></trk>
</gpx>
`;
const rit = (sleutel, titel, type, dagenVanaf, starttijd, omschrijving, aanmeldingen, bestand) => {
  // Hoogtemodel geeft pieken bij bruggen en viaducten: glad strijken met een lopende mediaan.
  const ruw = routes[sleutel];
  const pts = ruw.map((p, i) => {
    const w = ruw.slice(Math.max(0, i - 3), i + 4).map((q) => q[2]).sort((a, b) => a - b);
    return [p[0], p[1], Math.round(w[Math.floor(w.length / 2)] * 10) / 10];
  });
  const route = bouwRoute(pts.map((p) => [p[0], p[1], p[2]]), titel);
  return { titel, type, dagenVanaf, starttijd, startplek: "Parkeerplaats Skoatterwâld, Heerenveen", omschrijving, tempo: null, route, gpx: { naam: bestand, tekst: gpx(titel, pts) }, aanmeldingen };
};

const data = {
  leden: [
    { sleutel: "sjoerd", naam: "Sjoerd de Vries", fietsen: ["race", "gravel"] },
    { sleutel: "anneke", naam: "Anneke Hoekstra", fietsen: ["race"] },
    { sleutel: "wietse", naam: "Wietse Bakker", fietsen: ["gravel", "atb"] },
    { sleutel: "marrit", naam: "Marrit Visser", fietsen: ["race", "atb"] },
    { sleutel: "jelle", naam: "Jelle Postma", fietsen: ["atb"] },
    { sleutel: "hylke", naam: "Hylke Dijkstra", fietsen: ["race", "gravel", "atb"] },
  ],
  ritten: [
    rit("race", "Gaasterland Klassieker", "race", 3, "08:30",
      "Via Joure en Sloten naar het Rode Klif. Daarna de bulten van Oudemirdum: kort, maar venijnig. Koffie in Balk.\nNeem een windjack mee, op de dijk bij Laaksum waait het altijd.",
      [{ sleutel: "admin", status: "ja" }, { sleutel: "sjoerd", status: "ja" }, { sleutel: "anneke", status: "ja", thuis: "11:30", notitie: "Om 12 uur verjaardag" }, { sleutel: "marrit", status: "misschien" }, { sleutel: "hylke", status: "ja", thuis: "13:00" }, { sleutel: "jelle", status: "nee" }],
      "gaasterland-klassieker.gpx"),
    rit("atb", "Stoempen in het Tjongerbos", "atb", 5, "10:00",
      "Rustig rondje over de paden van Oranjewoud en langs de Tjonger. Geschikt voor iedereen, na regen wordt het modderig.",
      [{ sleutel: "wietse", status: "ja" }, { sleutel: "jelle", status: "ja", notitie: "Ik neem mijn zoon mee" }, { sleutel: "marrit", status: "ja", thuis: "11:30" }],
      "tjongerbos.gpx"),
    rit("gravel", "Drents-Friese Wold", "gravel", 10, "09:00",
      "Over Oldeberkoop en Appelscha het Wold in. Veel onverhard, bandjes van minimaal 38 mm. Lunch bij de Bosberg.",
      [{ sleutel: "admin", status: "ja" }, { sleutel: "wietse", status: "ja" }, { sleutel: "sjoerd", status: "misschien", notitie: "Hangt af van mijn knie" }, { sleutel: "hylke", status: "ja" }],
      "drents-friese-wold.gpx"),
    rit("atb", "Avondje Oranjewoud", "atb", -4, "18:30", "Afgelopen week gereden.",
      [{ sleutel: "admin", status: "ja" }, { sleutel: "jelle", status: "ja" }, { sleutel: "wietse", status: "ja" }],
      "oranjewoud.gpx"),
  ],
  chat: [
    { sleutel: "sjoerd", tekst: "Mannen en vrouwen, zondag Gaasterland! Wie gaat er mee?" },
    { sleutel: "anneke", tekst: "Ik ga mee, maar moet om half 12 thuis zijn. Ik haak af bij Sloten." },
    { sleutel: "hylke", tekst: "Heb net de verwachting gezien: wind uit het zuidwesten. Op de terugweg lekker in de rug" },
    { sleutel: "wietse", tekst: "Gravel in het Wold staat ook op de kalender. Wie heeft er nog brede banden over?" },
    { sleutel: "jelle", tekst: "Ik! 40 mm, ligt in de schuur." },
  ],
};
fs.writeFileSync(new URL("../public/demo.json", import.meta.url), JSON.stringify(data));
console.log("demo.json:", data.ritten.map((r) => `${r.titel} ${(r.route.afstand / 1000).toFixed(1)} km ${r.route.stijging} hm`).join(" | "));
