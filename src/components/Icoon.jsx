// Eigen iconenset, lijnstijl 1.9px.
const P = {
  ritten: <><circle cx="6" cy="17" r="3.6" /><circle cx="18" cy="17" r="3.6" /><path d="M6 17l4-8h6l2 8M10 9l-1.5-3H6.5M14 9l-2.4 8H6M16 9V6.5h2" /></>,
  chat: <><path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17.5h-9l-5 3.5v-3.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z" /><path d="M7.5 10.5h9M7.5 13.5h5.5" /></>,
  profiel: <><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M4 8h16" /><circle cx="7" cy="6" r=".6" fill="currentColor" /><circle cx="17" cy="6" r=".6" fill="currentColor" /><path d="M9 16.5v-5l3-1v6M13.5 11.5h2.5l-2.5 5h2.8" /></>,
  admin: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.6" /></>,
  open: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7" /><circle cx="12" cy="15.5" r="1.6" /></>,
  terug: <path d="M15 5l-7 7 7 7" />,
  verder: <path d="M9 5l7 7-7 7" />,
  download: <><path d="M12 4v11M7 10.5l5 5 5-5" /><path d="M5 19.5h14" /></>,
  upload: <><path d="M12 16V5M7 9.5l5-5 5 5" /><path d="M5 19.5h14" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  kruis: <path d="M6 6l12 12M18 6L6 18" />,
  vink: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  klok: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  huis: <><path d="M4 11l8-6.5 8 6.5" /><path d="M6 9.5V19.5h12V9.5" /><path d="M10 19.5v-5h4v5" /></>,
  pin: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  camera: <><path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.3" r="3.4" /></>,
  verstuur: <><path d="M4 12l16-7.5L13.5 20l-2.3-6.2L4 12z" /><path d="M11.2 13.8L20 4.5" /></>,
  prullenbak: <><path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7" /></>,
  bewerk: <><path d="M14.5 5.5l4 4L9 19H5v-4z" /><path d="M12.5 7.5l4 4" /></>,
  uit: <><path d="M14 4.5h4.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H14" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  wind: <><path d="M3 8.5h10a2.5 2.5 0 1 0-2.5-2.5" /><path d="M3 12.5h15a2.5 2.5 0 1 1-2.5 2.5" /><path d="M3 16.5h7" /></>,
  berg: <><path d="M2.5 19l6-10 4 6 2.5-3.5 6.5 7.5z" /></>,
  afstand: <><path d="M4 18c4 0 3-12 8-12s4 12 8 12" /><circle cx="4" cy="18" r="1.4" /><circle cx="20" cy="18" r="1.4" /></>,
  sleutel: <><circle cx="8" cy="14" r="3.5" /><path d="M10.5 11.5L19 3M15.5 6.5l2.5 2.5M13.5 8.5l2 2" /></>,
  mail: <><rect x="3.5" y="6" width="17" height="12" rx="1.5" /><path d="M4 7l8 6 8-6" /></>,
  let: <><path d="M12 4l9 16H3z" /><path d="M12 10v4.5M12 17.2v.3" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.7v.3" /></>,
  kopie: <><rect x="8" y="8" width="11.5" height="11.5" rx="2" /><path d="M5 15.5V5.5a1 1 0 0 1 1-1h10" /></>,
  delen: <><circle cx="17.5" cy="6" r="2.5" /><circle cx="6.5" cy="12" r="2.5" /><circle cx="17.5" cy="18" r="2.5" /><path d="M8.7 10.8l6.6-3.6M8.7 13.2l6.6 3.6" /></>,
  vlag: <><path d="M5 21V4" /><path d="M5 4.5h12l-2.5 4 2.5 4H5" /></>,
  kalender: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  thermometer: <><path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z" /><path d="M12 11v6" /></>,
  druppel: <path d="M12 3.5s6 6.6 6 10.5a6 6 0 0 1-12 0c0-3.9 6-10.5 6-10.5z" />,
  groep: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5" /><circle cx="17" cy="9.5" r="2.4" /><path d="M15.5 14.2c2.8-.4 5 1.6 5 4.8" /></>,
  boek: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15.5H5.5A1.5 1.5 0 0 0 4 21z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15.5h5.5A1.5 1.5 0 0 1 20 21z" /><path d="M11 19.5h2" /></>,
  volscherm: <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>,
  kleinscherm: <><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></>,
  installeer: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M12 7.5v7M9 12l3 3 3-3" /><path d="M10.5 18.8h3" /></>,
  deelios: <><path d="M12 3.5v11M8 7.5l4-4 4 4" /><path d="M7 11H5.5v9.5h13V11H17" /></>,
  plusvak: <><rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="M12 8.5v7M8.5 12h7" /></>,
  menu3: <><circle cx="12" cy="5.5" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="18.5" r="1.3" fill="currentColor" /></>,
  handzwaai: <><path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 10V4.8a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5c0 4-2.5 7-6.5 7-2.4 0-4-1.2-5.2-3.2L3.6 14a1.5 1.5 0 0 1 2.4-1.8L8 14.5" /></>,
  bel: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  oog: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  zon: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></>,
};

export default function Icoon({ naam, className, stijl }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={stijl} aria-hidden="true">
      {P[naam]}
    </svg>
  );
}

export function TypeIcoon({ type, className }) {
  const vorm = {
    race: <><circle cx="6" cy="16" r="3.8" /><circle cx="18" cy="16" r="3.8" /><path d="M6 16l3.5-7h7L18 16M9.5 9L8.3 6.5M16.5 9l-.8-3h2.4M12.5 16l3-7" /></>,
    gravel: <><circle cx="6" cy="16" r="4" strokeDasharray="2 1.6" /><circle cx="18" cy="16" r="4" strokeDasharray="2 1.6" /><path d="M6 16l3.5-7h7L18 16M9.5 9L8.3 6.5M16.5 9l-.8-3h2.4M12.5 16l3-7" /></>,
    atb: <><circle cx="6" cy="16" r="4.2" strokeWidth="2.6" /><circle cx="18" cy="16" r="4.2" strokeWidth="2.6" /><path d="M6 16l4-7h5.5L18 16M10 9L8.7 6.5M15.5 9l-.4-2.5h2.6M12.5 16l3-7" /></>,
  }[type];
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{vorm}</svg>;
}

export function WeerIcoon({ icoon, className }) {
  const zon = <g><circle cx="12" cy="12" r="4.2" fill="#f5c542" stroke="none" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" stroke="#f5c542" /></g>;
  const wolk = (x = 0, y = 0, kleur = "#c9ccd1") => <path transform={`translate(${x} ${y})`} d="M7 18.5h10a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6-1.2A3.9 3.9 0 0 0 7 18.5z" fill={kleur} stroke="none" />;
  const vormen = {
    zon,
    halfzon: <g><g transform="translate(-3 -3) scale(.85)">{zon}</g>{wolk(2, 2)}</g>,
    wolk: wolk(0, 0),
    mist: <g stroke="#c9ccd1"><path d="M4 9h16M6 13h12M4 17h16" /></g>,
    motregen: <g>{wolk(0, -3)}<path d="M9 18.5l-.6 1.5M13 18.5l-.6 1.5M17 18.5l-.6 1.5" stroke="#38b6ff" /></g>,
    regen: <g>{wolk(0, -3, "#9aa0a8")}<path d="M8.5 18l-1.2 3M12.5 18l-1.2 3M16.5 18l-1.2 3" stroke="#38b6ff" /></g>,
    sneeuw: <g>{wolk(0, -3)}<path d="M9 19.5h.01M13 20.5h.01M17 19.5h.01" stroke="#fff" strokeWidth="2.6" /></g>,
    onweer: <g>{wolk(0, -3, "#7d838c")}<path d="M12.5 15.5l-2 3.5h3l-2 3.5" stroke="#f5c542" /></g>,
  };
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{vormen[icoon] || vormen.wolk}</svg>;
}
