# Toppers Skoatterwâld

De app van fietsgroep Toppers Skoatterwâld, voor race, gravel en ATB. Een idee van Harm.

## Wat kan de app?

- **Ritten:** de organisatie plant een rit met een GPX-bestand, een type (race, gravel of ATB), een datum, een starttijd en een startplek.
- **Kaart en profiel:** de route staat op de kaart in het overzicht en op de ritpagina, met een hoogteprofiel in Tour-stijl. Leden kunnen de GPX downloaden.
- **Aanmelden:** leden geven aan of ze meerijden (ja, misschien of nee) en hoe laat ze uiterlijk thuis moeten zijn. De app rekent uit tot welke kilometer ze kunnen meerijden.
- **Weer en wind:** de verwachting voor het startpunt en de starttijd, met windrichting en windkracht in Beaufort. Met windlijnen op de kaart (tegenwind, zijwind, wind mee) en een waarschuwing voor waaiers.
- **Peloton:** een groepschat met berichten en foto's.
- **Profiel:** leden wijzigen hier zelf hun naam, e-mailadres en wachtwoord.
- **Admin:** beveiligd met een aparte code (standaard 7000, te wijzigen op de adminpagina). Hier voeg je fietsers toe of verwijder je ze, en plan je ritten.

## Eerste keer inloggen

- E-mail: `admin@toppers.nl`
- Wachtwoord: `admin`
- Admincode: `7000`

Wijzig het wachtwoord en de code direct na de eerste keer inloggen. De app herinnert je daaraan.

## Techniek

- React 18 en Vite, zonder UI-framework, met eigen CSS
- Netlify Functions (`netlify/functions/api.mjs`) en Netlify Blobs voor de opslag
- Leaflet met kaarttegels van OpenStreetMap (donker gefilterd)
- Weer van Open-Meteo, zonder API-sleutel
- Lettertypen (Barlow) worden door de site zelf geleverd, niet via Google
- Installeerbaar als PWA (manifest en service worker)

Wachtwoorden en de admincode worden opgeslagen met scrypt. Sessies zijn ondertekende HttpOnly-cookies. De adminsessie verloopt na twee uur en vervalt zodra de code wordt gewijzigd.

## Lokaal draaien

```bash
npm install
npm run local      # bouwt de app en start op http://localhost:8888 met opslag in .local-store
```

`scripts/maak-demo.mjs` bouwt `public/demo.json`: voorbeeldritten rond Heerenveen. Die laad je via Admin, dan Instellingen, dan "Laad voorbeelden". Met één knop haal je ze ook weer weg.
