// Vercel: alle /api/*-verzoeken komen hier binnen (zie vercel.json) en gaan naar dezelfde API als op Netlify.
import api from "../netlify/functions/api.mjs";

// De herschrijfregel geeft het oorspronkelijke pad mee als ?__pad=. Zet dat terug, zodat de API het juiste pad ziet.
function herstel(req) {
  const url = new URL(req.url);
  if (!url.searchParams.has("__pad")) return req;
  const pad = url.searchParams.get("__pad");
  url.searchParams.delete("__pad");
  if (url.pathname === "/api" || url.pathname === "/api/") url.pathname = "/api/" + pad;
  const heeftBody = !["GET", "HEAD"].includes(req.method);
  return new Request(url, { method: req.method, headers: req.headers, body: heeftBody ? req.body : undefined, duplex: "half" });
}

const behandel = (req) => api(herstel(req));
export const GET = behandel;
export const POST = behandel;
export const PUT = behandel;
export const PATCH = behandel;
export const DELETE = behandel;
