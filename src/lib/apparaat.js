// Wat kan dit apparaat: installeren, volledig scherm, iPhone of Android?
import { useEffect, useState } from "react";

let installPrompt = null;
const luisteraars = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    luisteraars.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => { installPrompt = null; luisteraars.forEach((f) => f()); });
}

export function isIOS() {
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent || "");
}

export function isGeinstalleerd() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.matchMedia?.("(display-mode: fullscreen)").matches || navigator.standalone === true;
}

export function useInstalleren() {
  const [, tik] = useState(0);
  useEffect(() => {
    const f = () => tik((x) => x + 1);
    luisteraars.add(f);
    return () => luisteraars.delete(f);
  }, []);
  return {
    kan: !!installPrompt,
    async installeer() {
      if (!installPrompt) return false;
      installPrompt.prompt();
      const keuze = await installPrompt.userChoice.catch(() => null);
      installPrompt = null;
      luisteraars.forEach((f) => f());
      return keuze?.outcome === "accepted";
    },
  };
}

export function kanVolledigScherm() {
  const el = document.documentElement;
  return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !!(el.requestFullscreen || el.webkitRequestFullscreen) && !isGeinstalleerd();
}

export function useVolledigScherm() {
  const [aan, setAan] = useState(!!(document.fullscreenElement || document.webkitFullscreenElement));
  useEffect(() => {
    const f = () => setAan(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", f);
    document.addEventListener("webkitfullscreenchange", f);
    return () => { document.removeEventListener("fullscreenchange", f); document.removeEventListener("webkitfullscreenchange", f); };
  }, []);
  return {
    aan,
    wissel() {
      const el = document.documentElement;
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: "hide" })?.catch?.(() => {});
    },
  };
}
