import { useMemo, useRef, useState } from "react";

const B = 1000, H = 250, ONDER = 34, BOVEN = 30;

function kleurVoor(pct) {
  if (pct < -1) return "#343940";
  if (pct < 1.2) return "#4b525b";
  if (pct < 3) return "#5ccf8a";
  if (pct < 6) return "#f5c542";
  if (pct < 9) return "#ff8a3d";
  return "#ff4d3d";
}

export default function Etappeprofiel({ route, onScrub, compact = false }) {
  const svg = useRef(null);
  const [cursor, setCursor] = useState(null);
  const data = useMemo(() => {
    const p = (route?.punten || []).filter((x) => x[2] != null);
    if (p.length < 2) return null;
    const afstand = p[p.length - 1][3];
    const hoogtes = p.map((x) => x[2]);
    let min = Math.min(...hoogtes), max = Math.max(...hoogtes);
    const bereik = Math.max(40, (max - min) * 1.3);
    const yMin = Math.floor(min - bereik * 0.08);
    const yMax = yMin + bereik;
    const x = (d) => (d / afstand) * B;
    const y = (e) => H - ONDER - ((e - yMin) / (yMax - yMin)) * (H - ONDER - BOVEN);
    const hoogteOp = (d) => {
      let lo = 0, hi = p.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][3] < d) lo = m; else hi = m; }
      const a = p[lo], b = p[hi];
      const t = b[3] === a[3] ? 0 : (d - a[3]) / (b[3] - a[3]);
      return a[2] + (b[2] - a[2]) * t;
    };
    // blokken per stuk (1 km, of korter bij korte ritten)
    const stap = afstand > 60000 ? 1000 : afstand > 20000 ? 500 : 250;
    const blokken = [];
    for (let d = 0; d < afstand; d += stap) {
      const e = Math.min(afstand, d + stap);
      const pts = [[x(d), y(hoogteOp(d))]];
      for (const q of p) if (q[3] > d && q[3] < e) pts.push([x(q[3]), y(q[2])]);
      pts.push([x(e), y(hoogteOp(e))]);
      const pct = ((hoogteOp(e) - hoogteOp(d)) / (e - d)) * 100;
      const pad = `M${pts[0][0]},${H - ONDER} ` + pts.map((q) => `L${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ") + ` L${pts[pts.length - 1][0]},${H - ONDER} Z`;
      blokken.push({ pad, kleur: kleurVoor(pct) });
    }
    const lijn = p.map((q, i) => `${i ? "L" : "M"}${x(q[3]).toFixed(1)},${y(q[2]).toFixed(1)}`).join(" ");
    const kmStap = afstand > 120000 ? 20 : afstand > 50000 ? 10 : afstand > 20000 ? 5 : 2;
    const ticks = [];
    for (let k = kmStap; k * 1000 < afstand; k += kmStap) { const f = (k * 1000) / afstand; if (f > 0.13 && f < 0.84) ticks.push(k); }
    const hoogste = p.reduce((a, b) => (b[2] > a[2] ? b : a));
    const rasterStap = bereik > 400 ? 100 : bereik > 150 ? 50 : bereik > 60 ? 20 : 10;
    const raster = [];
    for (let v = Math.ceil(yMin / rasterStap) * rasterStap; v < yMax; v += rasterStap) raster.push(v);
    return { p, afstand, x, y, blokken, lijn, ticks, hoogste, raster, hoogteOp, vlak: max - min < 25 };
  }, [route]);

  if (!data) {
    return <div className="profiel-leeg klein">Deze GPX heeft geen hoogtegegevens, dus er is geen profiel.</div>;
  }

  function beweeg(e) {
    const r = svg.current.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const d = fx * data.afstand;
    let best = data.p[0];
    for (const q of data.p) { if (Math.abs(q[3] - d) < Math.abs(best[3] - d)) best = q; }
    const vooruit = Math.min(data.afstand, d + 300), achter = Math.max(0, d - 300);
    const pct = ((data.hoogteOp(vooruit) - data.hoogteOp(achter)) / (vooruit - achter || 1)) * 100;
    setCursor({ x: data.x(best[3]), y: data.y(best[2]), km: best[3] / 1000, h: best[2], pct, links: fx > 0.6 });
    onScrub?.([best[0], best[1]]);
  }
  function weg() { setCursor(null); onScrub?.(null); }

  return (
    <div className={`etappeprofiel ${compact ? "compact" : ""}`}>
      <svg ref={svg} viewBox={`0 0 ${B} ${H}`} preserveAspectRatio="none" onPointerMove={beweeg} onPointerDown={beweeg} onPointerLeave={weg} onPointerUp={(e) => e.pointerType !== "mouse" && setTimeout(weg, 1600)} role="img" aria-label={`Hoogteprofiel, hoogste punt ${Math.round(data.hoogste[2])} meter`}>
        <defs>
          <linearGradient id="profielglans" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".18" />
            <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {data.raster.map((v) => (
          <g key={v}>
            <line x1="0" x2={B} y1={data.y(v)} y2={data.y(v)} stroke="#ffffff" strokeOpacity=".06" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        {data.blokken.map((b, i) => <path key={i} d={b.pad} fill={b.kleur} stroke="#0c0d0f" strokeWidth="1" strokeOpacity=".35" vectorEffect="non-scaling-stroke" />)}
        <path d={data.blokken.map((b) => b.pad).join(" ")} fill="url(#profielglans)" />
        <path d={data.lijn} fill="none" stroke="#f3f0e7" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <line x1="0" x2={B} y1={H - ONDER} y2={H - ONDER} stroke="#f3f0e7" strokeOpacity=".5" vectorEffect="non-scaling-stroke" />
        {data.ticks.map((k) => (
          <line key={k} x1={data.x(k * 1000)} x2={data.x(k * 1000)} y1={H - ONDER} y2={H - ONDER + 7} stroke="#f3f0e7" strokeOpacity=".5" vectorEffect="non-scaling-stroke" />
        ))}
        {cursor && (
          <g>
            <line x1={cursor.x} x2={cursor.x} y1={BOVEN - 10} y2={H - ONDER} stroke="#f3f0e7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
          </g>
        )}
      </svg>
      {/* HTML-labels bovenop, zodat tekst niet vervormt */}
      <div className="profiel-labels">
        {data.ticks.map((k) => <span key={k} className="tick tab" style={{ left: `${(data.x(k * 1000) / B) * 100}%` }}>{k}</span>)}
        <span className="tick start">START</span>
        <span className="tick eind tab">{(data.afstand / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km</span>
        {data.raster.slice(-2).map((v) => <span key={v} className="hoogte tab" style={{ top: `${(data.y(v) / H) * 100}%` }}>{v} m</span>)}
        {!cursor && (
          <span className="top tab" style={{ left: `${(data.x(data.hoogste[3]) / B) * 100}%`, top: `${(data.y(data.hoogste[2]) / H) * 100}%` }}>
            ▲ {Math.round(data.hoogste[2])} m
          </span>
        )}
        {cursor && (
          <span className={`scrub tab ${cursor.links ? "links" : ""}`} style={{ left: `${(cursor.x / B) * 100}%`, top: `${(cursor.y / H) * 100}%` }}>
            <b>km {cursor.km.toLocaleString("nl-NL", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</b>
            <span>{Math.round(cursor.h)} m · {cursor.pct >= 0 ? "+" : ""}{cursor.pct.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%</span>
          </span>
        )}
      </div>
      {!compact && (
        <div className="profiel-legenda">
          <span><i style={{ background: "#4b525b" }} />vlak</span>
          <span><i style={{ background: "#5ccf8a" }} />1–3%</span>
          <span><i style={{ background: "#f5c542" }} />3–6%</span>
          <span><i style={{ background: "#ff8a3d" }} />6–9%</span>
          <span><i style={{ background: "#ff4d3d" }} />9%+</span>
          {data.vlak && <em>Fries vlak: hier is de wind je berg.</em>}
        </div>
      )}
    </div>
  );
}
