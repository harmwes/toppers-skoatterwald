// Kant-en-klare mail met inloggegevens. De admin hoeft alleen nog op verzenden te drukken.
export const APP_URL = "https://toppers-skoatterwald.netlify.app";
export const HANDLEIDING_URL = `${APP_URL}/handleiding.pdf`;

export function welkomTekst({ naam, email, code, nieuweCode = false, afzender = "" }) {
  const voornaam = (naam || "").split(" ")[0] || "fietser";
  const intro = nieuweCode
    ? `Je hebt een nieuwe inlogcode voor de app van Toppers Skoatterwâld. Je oude code werkt niet meer.`
    : `Welkom bij Toppers Skoatterwâld! Je aanvraag om mee te doen is goedgekeurd. Vanaf nu rijd je mee in onze app.`;
  return `Hoi ${voornaam},

${intro}

In de app zie je alle geplande ritten, voor race, gravel en ATB. Per rit zie je de route op de kaart, het hoogteprofiel en het weer met de wind op de route. Je geeft aan of je meerijdt en hoe laat je thuis moet zijn, je downloadt de GPX voor je fietscomputer en je praat en deelt foto's in het peloton.

JE INLOGGEGEVENS
App:     ${APP_URL}
E-mail:  ${email}
Code:    ${code}

Log in met je e-mailadres en deze code. Daarna kun je bij Profiel een eigen wachtwoord kiezen.

Tip: zet de app op het beginscherm van je telefoon. Op de startpagina staat hoe dat werkt.

Handleiding (PDF): ${HANDLEIDING_URL}

Tot op de fiets!
${afzender ? `${afzender}\n` : ""}Toppers Skoatterwâld`;
}

export function welkomMailto(gegevens) {
  const onderwerp = gegevens.nieuweCode ? "Je nieuwe inlogcode voor Toppers Skoatterwâld" : "Welkom bij Toppers Skoatterwâld: je inloggegevens";
  return `mailto:${encodeURIComponent(gegevens.email)}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(welkomTekst(gegevens))}`;
}

export function openMail(gegevens) {
  window.location.href = welkomMailto(gegevens);
}
