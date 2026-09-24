// Kleine wrapper rond fetch naar /api.
export class ApiFout extends Error {
  constructor(melding, status) { super(melding); this.status = status; }
}

export async function api(pad, { methode = "GET", body } = {}) {
  let r;
  try {
    r = await fetch(`/api/${pad}`, {
      method: methode,
      credentials: "same-origin",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiFout("Geen verbinding. Controleer je internet.", 0);
  }
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) {
    if (r.status === 401 && pad !== "login") window.dispatchEvent(new CustomEvent("tsw:uitgelogd"));
    if (r.status === 423) window.dispatchEvent(new CustomEvent("tsw:adminslot"));
    throw new ApiFout(data.fout || "Er ging iets mis.", r.status);
  }
  return data;
}

export function verkleinFoto(bestand, max = 1600, kwaliteit = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(bestand);
    const img = new Image();
    img.onload = () => {
      const schaal = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * schaal), h = Math.round(img.height * schaal);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: c.toDataURL("image/jpeg", kwaliteit), vorm: w / h });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Deze foto kan ik niet openen.")); };
    img.src = url;
  });
}

export function opslag(sleutel, waarde) {
  try {
    if (waarde === undefined) return localStorage.getItem(sleutel);
    if (waarde === null) localStorage.removeItem(sleutel); else localStorage.setItem(sleutel, waarde);
  } catch { return null; }
}
