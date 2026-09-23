import { useState } from 'react';
import { Plus, Minus, LocateFixed, Layers, ArrowUpRight } from 'lucide-react';
import type { WorkspaceData } from '../shared/types';
export default function CatchmentMap({
  data,
  selected,
  onSelect,
  large = false,
}: {
  data: WorkspaceData;
  selected?: string;
  onSelect: (id: string) => void;
  large?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [showHabitats, setShowHabitats] = useState(true);
  if (!data.user.isDemo)
    return <SiteCoordinates data={data} selected={selected} onSelect={onSelect} />;
  const sites = data.sites;
  const points = [
    [225, 89],
    [379, 151],
    [291, 245],
    [476, 287],
    [179, 330],
    [529, 399],
  ];
  return (
    <div className={`catchment-map demo-map ${large ? 'large-map' : ''}`}>
      <svg
        role="img"
        aria-label="Illustrative catchment map. Select a numbered monitoring site using the buttons below."
        viewBox="0 0 720 300"
        className="map-svg"
      >
        <defs>
          <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M36 0H0V36" fill="none" stroke="#bdc9b7" strokeWidth=".4" />
          </pattern>
          <pattern id="park" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.4" fill="#a6b49c" opacity=".5" />
          </pattern>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity=".1" />
          </filter>
        </defs>
        <rect width="720" height="300" fill="#e8ecdf" />
        <g
          style={{
            transform: `translate(${360 - 360 * zoom}px,${150 - 150 * zoom}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: 'transform .4s',
          }}
        >
          <g transform="scale(1 .64)">
            <path
              d="M-20 64L70 4 192 28 185 87 263 112 183 211 50 240-20 166zM413-20L738 0 740 116 663 143 576 67 456 92zM323 350L449 329 560 371 598 445 315 456z"
              fill={showHabitats ? '#d7e0c9' : '#e3e6dc'}
            />
            {showHabitats && (
              <path
                d="M-20 64L70 4 192 28 185 87 263 112 183 211 50 240-20 166zM413-20L738 0 740 116 663 143 576 67 456 92zM323 350L449 329 560 371 598 445 315 456z"
                fill="url(#park)"
              />
            )}
            <rect width="720" height="445" fill="url(#grid)" opacity=".5" />
            <g fill="#dde1d6" stroke="#d1d7cb" strokeWidth="1">
              <path d="M21 291l62-28 27 51-60 29zM103 244l30-49 44 29-32 44zM92 350l55-30 23 42-48 25zM276 57l41-22 24 47-35 21zM324 108l26-17 14 25-21 13zM418 174l64-20 11 32-63 21zM456 227l68-30 24 42-70 22zM570 168l82-12 7 37-76 17zM596 239l73-24 10 41-64 19zM623 317l58-27 30 39-61 31zM342 297l43-26 19 30-42 28zM13 377l57-18 8 37-42 19zM496 80l29-35 43 33-21 31z" />
            </g>
            <g stroke="#f7f8f0" strokeWidth="10" fill="none">
              <path d="M-20 292L79 261 147 210 209 177 333 109 431 104 527 133 740 119" />
              <path d="M42-20L92 73 141 153 209 177 246 272 295 311 338 446" />
              <path d="M366-20L369 56 431 104 442 213 483 298 540 348 739 380" />
              <path d="M-20 413L159 361 246 272 354 260 442 213 584 238 740 199" />
            </g>
            <g stroke="#ccd3c7" strokeWidth="1" fill="none">
              <path d="M-20 292L79 261 147 210 209 177 333 109 431 104 527 133 740 119" />
              <path d="M42-20L92 73 141 153 209 177 246 272 295 311 338 446" />
              <path d="M366-20L369 56 431 104 442 213 483 298 540 348 739 380" />
            </g>
            <path
              d="M245-20C270 56 181 76 238 132S369 128 380 171 262 201 295 253 494 236 478 302 489 372 548 461"
              stroke="#aacdd0"
              strokeWidth="22"
              fill="none"
            />
            <path
              d="M245-20C270 56 181 76 238 132S369 128 380 171 262 201 295 253 494 236 478 302 489 372 548 461"
              stroke="#c4dfe0"
              strokeWidth="15"
              fill="none"
            />
            <path
              d="M-20 353C89 372 99 290 180 327S270 282 295 253"
              stroke="#b0d1d0"
              strokeWidth="10"
              fill="none"
            />
            <g fontFamily="Arial,sans-serif" fill="#849180" fontSize="9" letterSpacing="2">
              <text x="70" y="111">
                UPPER CATCHMENT
              </text>
              <text x="476" y="49">
                WOODLAND
              </text>
              <text x="532" y="316">
                VALE DAS FLORES
              </text>
            </g>
            <text
              x="311"
              y="198"
              fontSize="10"
              fill="#719696"
              transform="rotate(-21 311 198)"
              letterSpacing="2"
            >
              STREAM CORRIDOR
            </text>
          </g>
          {sites.slice(0, 6).map((s, i) => {
            const p = [points[i][0], points[i][1] * 0.64];
            const obs = data.observations.filter(
              (o) => o.siteId === s.id && o.status !== 'resolved',
            );
            const a = data.assessments
              .filter((a) => obs.some((o) => o.id === a.observationId))
              .sort((a, b) => b.score - a.score)[0];
            const color =
              a?.priority === 'urgent'
                ? '#a9473b'
                : a?.priority === 'high'
                  ? '#bf7442'
                  : a?.priority === 'medium'
                    ? '#b79a48'
                    : '#547860';
            return (
              <g key={s.id}>
                <circle
                  cx={p[0]}
                  cy={p[1]}
                  r={selected === s.id ? 26 : 19}
                  fill={color}
                  opacity=".12"
                />
                <circle cx={p[0]} cy={p[1]} r="12" fill={color} stroke="#fff" strokeWidth="3" />
                <text
                  x={p[0]}
                  y={p[1] + 3.5}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {i + 1}
                </text>
                <rect
                  x={p[0] + 19}
                  y={p[1] - 14}
                  width={Math.min(154, s.name.length * 5.4 + 18)}
                  height="28"
                  rx="5"
                  fill="#fafbf6"
                  opacity=".96"
                  filter="url(#shadow)"
                />
                <text x={p[0] + 27} y={p[1] + 3.5} fill="#445744" fontSize="11">
                  {s.name.slice(0, 24)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-label">
        <span className="live-dot" />
        Coimbra catchment <span className="map-label-count">{sites.length} sites</span>
      </div>
      <div className="map-tools">
        <button aria-label="Zoom in" onClick={() => setZoom(Math.min(1.6, zoom + 0.2))}>
          <Plus size={16} />
        </button>
        <button aria-label="Zoom out" onClick={() => setZoom(Math.max(1, zoom - 0.2))}>
          <Minus size={16} />
        </button>
        <button aria-label="Reset map zoom" onClick={() => setZoom(1)}>
          <LocateFixed size={16} />
        </button>
      </div>
      <button
        className={`map-layers ${showHabitats ? 'active' : ''}`}
        aria-pressed={showHabitats}
        onClick={() => setShowHabitats(!showHabitats)}
      >
        <Layers size={14} /> Habitat layer
      </button>
      <div className="map-bottom">
        <span>Illustrative site locations · Not for navigation</span>
        <span className="north">N ↑</span>
      </div>
      <div className="map-site-buttons" aria-label="Monitoring sites">
        {sites.slice(0, 6).map((s, i) => (
          <button
            aria-pressed={selected === s.id}
            aria-label={`Select ${s.name}`}
            className={selected === s.id ? 'active' : ''}
            key={s.id}
            onClick={() => onSelect(s.id)}
          >
            {i + 1}
            <span>{s.name}</span>
            <ArrowUpRight size={12} />
          </button>
        ))}
      </div>
    </div>
  );
}

function SiteCoordinates({
  data,
  selected,
  onSelect,
}: {
  data: WorkspaceData;
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const sites = data.sites;
  const lats = sites.map((s) => s.lat),
    lngs = sites.map((s) => s.lng);
  const minLat = Math.min(...lats),
    maxLat = Math.max(...lats),
    minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs);
  const meanLat = sites.length ? (minLat + maxLat) / 2 : 0;
  const correction = Math.max(0.1, Math.cos((meanLat * Math.PI) / 180));
  const latSpan = Math.max(0.001, maxLat - minLat),
    lngSpan = Math.max(0.001, (maxLng - minLng) * correction);
  const scale = Math.min(570 / lngSpan, 205 / latSpan);
  const position = (s: (typeof sites)[number]) => [
    360 + (s.lng - (minLng + maxLng) / 2) * correction * scale,
    150 - (s.lat - (minLat + maxLat) / 2) * scale,
  ];
  return (
    <div className="catchment-map real-sites">
      <svg
        viewBox="0 0 720 300"
        className="map-svg"
        role="img"
        aria-label="Your monitoring site coordinates plotted relative to each other, with north at the top. This is not a navigation map."
      >
        <defs>
          <pattern id="coordinate-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#bdc9b7" strokeWidth=".6" />
          </pattern>
        </defs>
        <rect width="720" height="300" fill="#ecf0e5" />
        <rect width="720" height="300" fill="url(#coordinate-grid)" />
        {sites.map((s, i) => {
          const [x, y] = position(s);
          return (
            <g key={s.id}>
              <circle cx={x} cy={y} r={selected === s.id ? 21 : 15} fill="#bacd9f" opacity=".45" />
              <circle
                cx={x}
                cy={y}
                r="11"
                fill={selected === s.id ? '#214b3c' : '#7e9a64'}
                stroke="#fff"
                strokeWidth="2"
              />
              <text x={x} y={y + 3} textAnchor="middle" fontSize="8" fill="#fff">
                {i + 1}
              </text>
              <text x={Math.min(x + 18, 570)} y={y + 4} fill="#607c4d" fontSize="10">
                {s.name.slice(0, 22)}
              </text>
            </g>
          );
        })}
        {!sites.length && (
          <text x="360" y="155" textAnchor="middle" fill="#6f865b" fontSize="14">
            Add your first site to see its location here.
          </text>
        )}
      </svg>
      <div className="map-label">
        <span className="live-dot" />
        Your monitoring sites<span className="map-label-count">{sites.length} sites</span>
      </div>
      <div className="coordinate-caption">
        <span>Site coordinates · No basemap · Not for navigation</span>
        <span>N ↑</span>
      </div>
      <div className="map-site-buttons">
        {sites.map((s, i) => (
          <button
            key={s.id}
            className={selected === s.id ? 'active' : ''}
            onClick={() => onSelect(s.id)}
            aria-pressed={selected === s.id}
            aria-label={`Select ${s.name}`}
          >
            {i + 1}
            <span>{s.name}</span>
            <ArrowUpRight size={12} />
          </button>
        ))}
      </div>
    </div>
  );
}
