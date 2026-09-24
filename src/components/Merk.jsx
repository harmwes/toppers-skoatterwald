// Logo, rugnummer en andere merkstukjes.

export function Pompeblad({ className, stijl }) {
  // Het Friese pompeblêd: hartvormig waterleliebad.
  return (
    <svg viewBox="0 0 24 24" className={className} style={stijl} aria-hidden="true">
      <path fill="currentColor" d="M12 21.5c-.6-1.6-2.6-3.3-4.9-5.1C4.6 14.5 2.5 12.6 2.5 9.4 2.5 6.6 4.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.9 1.2-1.8 2.8-2.9 4.8-2.9 2.6 0 4.7 2.1 4.7 4.9 0 3.2-2.1 5.1-4.6 7-2.3 1.8-4.3 3.5-4.9 5.1z"  />
    </svg>
  );
}

export function Logo({ groot = false, className = "" }) {
  return (
    <div className={`logo ${groot ? "groot" : ""} ${className}`} aria-label="Toppers Skoatterwâld">
      <div className="logo-woord">
        <span>TOPPERS</span>
        <Pompeblad className="logo-blad" />
      </div>
      <div className="logo-onder">
        <i className="logo-streep" />
        <span>SKOATTERWÂLD</span>
      </div>
    </div>
  );
}

export function Rugnummer({ nummer, schaal = 1, demo, className = "" }) {
  return (
    <span className={`rugnummer ${demo ? "demo" : ""} ${className}`} style={{ "--b": schaal }} aria-label={`rugnummer ${nummer}`}>
      <i /><i /><i /><i />
      <b className="tab">{nummer}</b>
    </span>
  );
}
