// Mail versturen via de mailserver van Yahoo (SMTP), met harmwesseling@yahoo.com als afzender.
// Het app-wachtwoord van Yahoo staat alleen in Netlify, als omgevingsvariabele YAHOO_APP_WACHTWOORD.
// Lokaal testen: zet MAIL_NAAR_MAP, dan komt elke mail als JSON-bestand in die map in plaats van verstuurd.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import nodemailer from "nodemailer";

export const AFZENDER = process.env.MAIL_AFZENDER || "harmwesseling@yahoo.com";
const AFZENDER_NAAM = "Toppers Skoatterwâld";

export function mailserverAan() {
  return !!(process.env.YAHOO_APP_WACHTWOORD || process.env.MAIL_NAAR_MAP);
}

// Geeft { verstuurd: true } of { verstuurd: false, reden }. Gooit nooit een fout.
export async function stuurMail({ aan, onderwerp, tekst }) {
  if (process.env.MAIL_NAAR_MAP) {
    mkdirSync(process.env.MAIL_NAAR_MAP, { recursive: true });
    const bestand = join(process.env.MAIL_NAAR_MAP, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
    writeFileSync(bestand, JSON.stringify({ van: AFZENDER, aan, onderwerp, tekst }, null, 2));
    return { verstuurd: true };
  }
  if (!process.env.YAHOO_APP_WACHTWOORD) return { verstuurd: false, reden: "geen-mailserver" };
  try {
    const transport = nodemailer.createTransport({
      host: "smtp.mail.yahoo.com", port: 465, secure: true,
      auth: { user: AFZENDER, pass: process.env.YAHOO_APP_WACHTWOORD },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
    });
    await transport.sendMail({ from: { name: AFZENDER_NAAM, address: AFZENDER }, to: aan, subject: onderwerp, text: tekst });
    return { verstuurd: true };
  } catch (e) {
    // Alleen de soort fout teruggeven, nooit inloggegevens.
    const reden = e?.responseCode === 535 || e?.code === "EAUTH" ? "inloggen-mislukt" : "versturen-mislukt";
    console.error("Mail niet verstuurd:", reden, e?.code || "", e?.responseCode || "");
    return { verstuurd: false, reden };
  }
}
