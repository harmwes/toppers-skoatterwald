// Welkomstbericht met inloggegevens. De server mailt het via Yahoo; WhatsApp en eigen mail blijven als reserve.
export const APP_URL = "https://toppers-skoatterwald.netlify.app";
export const HANDLEIDING_URL = `${APP_URL}/handleiding.pdf`;

export function welkomTekst({ naam, email, wachtwoord, nieuwWachtwoord = false, afzender = "" }, kanaal = "mail") {
  const kop = kanaal === "whatsapp" ? "*Je inloggegevens*" : "JE INLOGGEGEVENS";
  const voornaam = (naam || "").split(" ")[0] || "fietser";
  const intro = nieuwWachtwoord
    ? `Je hebt een nieuw wachtwoord voor de app van Toppers Skoatterwâld. Je oude wachtwoord werkt niet meer.`
    : `Welkom bij Toppers Skoatterwâld! Je aanvraag om mee te doen is goedgekeurd. Vanaf nu rijd je mee in onze app.`;
  return `Hoi ${voornaam},

${intro}

In de app zie je alle geplande ritten, voor race, gravel en ATB. Per rit zie je de route op de kaart, het hoogteprofiel en het weer met de wind op de route. Je geeft aan of je meerijdt en hoe laat je thuis moet zijn, je downloadt de GPX voor je fietscomputer en je praat en deelt foto's in het peloton.

${kop}
App:        ${APP_URL}
E-mail:     ${email}
Wachtwoord: ${wachtwoord}

Log in met je e-mailadres en dit wachtwoord. Daarna kun je bij Profiel zelf een ander wachtwoord kiezen.

Tip: zet de app op het beginscherm van je telefoon. Op de startpagina staat hoe dat werkt.

Handleiding (PDF): ${HANDLEIDING_URL}

Tot op de fiets!
${afzender ? `${afzender}\n` : ""}Toppers Skoatterwâld`;
}

export function welkomOnderwerp(gegevens) {
  return gegevens.nieuwWachtwoord ? "Je nieuwe wachtwoord voor Toppers Skoatterwâld" : "Welkom bij Toppers Skoatterwâld: je inloggegevens";
}

export function welkomMailto(gegevens) {
  return `mailto:${encodeURIComponent(gegevens.email)}?subject=${encodeURIComponent(welkomOnderwerp(gegevens))}&body=${encodeURIComponent(welkomTekst(gegevens))}`;
}

export function openMail(gegevens) {
  window.location.href = welkomMailto(gegevens);
}

// +31612345678 → 06 12 34 56 78 (Nederlandse nummers), anders zoals opgeslagen.
export function toonMobiel(m) {
  if (!m) return "";
  const nl = /^\+316(\d{8})$/.exec(m);
  return nl ? `06 ${nl[1].replace(/(\d{2})(?=\d)/g, "$1 ")}` : m;
}

// WhatsApp met het bericht klaar. Met nummer direct naar dat gesprek, anders kies je zelf het gesprek.
export function welkomWhatsApp(gegevens) {
  const nummer = (gegevens.mobiel || "").replace(/\D/g, "");
  return `https://wa.me/${nummer}?text=${encodeURIComponent(welkomTekst(gegevens, "whatsapp"))}`;
}
