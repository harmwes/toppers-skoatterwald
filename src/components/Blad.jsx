// Onderblad (bottom sheet) dat van onderen inschuift. Op de computer een venster in het midden.
import { useEffect } from "react";
import Icoon from "./Icoon.jsx";

export default function Blad({ open, onSluit, titel, children, label }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onSluit();
    window.addEventListener("keydown", k);
    const oud = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = oud; };
  }, [open, onSluit]);
  if (!open) return null;
  return (
    <div className="blad-achter" onClick={onSluit}>
      <div className="blad" role="dialog" aria-modal="true" aria-label={titel} onClick={(e) => e.stopPropagation()}>
        <div className="blad-greep" />
        <div className="blad-kop">
          <div>
            {label && <div className="label">{label}</div>}
            <h2>{titel}</h2>
          </div>
          <button className="icoonknop" onClick={onSluit} aria-label="Sluiten"><Icoon naam="kruis" /></button>
        </div>
        <div className="blad-inhoud">{children}</div>
      </div>
    </div>
  );
}
