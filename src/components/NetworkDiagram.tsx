import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from 'react';
import {
  Monitor,
  Router,
  Server,
  Globe2,
  Wifi,
  Network,
  LockKeyhole,
  Minus,
  Plus,
  Scan,
  Focus,
} from 'lucide-react';
import type { Protocol, TracePacket } from '../data/protocols';
import { usePlaybackProgress, type PlaybackClock } from '../simulation/playback';
import {
  constrainCamera,
  friendlyPacketLabel,
  packetPath,
  pathOf,
  pointOnRoute,
  routeDevices,
  routeProgress,
  traveledPath,
  type Point,
} from '../simulation/journey';

const icons = {
  client: Monitor,
  router: Router,
  server: Server,
  dns: Globe2,
  wifi: Wifi,
  switch: Network,
};
const nodeColor: Record<string, string> = {
  client: 'var(--mint)',
  router: 'var(--blue)',
  server: 'var(--violet)',
  dns: 'var(--amber)',
  wifi: 'var(--blue)',
  switch: 'var(--blue)',
};
export function packetColor(protocol: string) {
  if (/DNS|DHCP|ARP|IP|ICMP|Ethernet|802/.test(protocol)) return 'var(--amber)';
  if (/TLS|HTTPS|SSH|EAPOL/.test(protocol)) return 'var(--violet)';
  if (/TCP|UDP|QUIC/.test(protocol)) return 'var(--blue)';
  return 'var(--mint)';
}
export function NetworkDiagram({
  protocol,
  packet,
  clock,
  reducedMotion,
  compact = false,
}: {
  protocol: Protocol;
  packet?: TracePacket;
  clock: PlaybackClock;
  reducedMotion: boolean;
  compact?: boolean;
}) {
  const progress = usePlaybackProgress(clock);
  const id = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ point: Point; center: Point; zoom: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [follow, setFollow] = useState(false);
  const [center, setCenter] = useState<Point>({ x: 390, y: 190 });
  const [dragging, setDragging] = useState(false);
  const width = compact ? 420 : 780,
    height = compact ? (protocol.devices.length > 4 ? 390 : 330) : 380;
  const nodes = useMemo(
    () => protocol.devices.map((n) => (compact ? { ...n, x: 45 + ((n.x - 85) / 625) * 330 } : n)),
    [protocol, compact],
  );
  const connections = useMemo(() => {
    const pairs = new Map<string, [string, string]>();
    protocol.steps
      .flatMap((s) => s.packets)
      .forEach((p) => {
        const route = routeDevices(nodes, p.from, p.to);
        route.slice(1).forEach((n, i) => {
          const a = route[i].id,
            b = n.id;
          pairs.set([a, b].sort().join(':'), [a, b]);
        });
      });
    return [...pairs.values()].map(([a, b]) =>
      packetPath([nodes.find((n) => n.id === a)!, nodes.find((n) => n.id === b)!]),
    );
  }, [nodes, protocol]);
  const route = useMemo(
    () => (packet ? packetPath(routeDevices(nodes, packet.from, packet.to)) : []),
    [nodes, packet],
  );
  const fraction = packet ? routeProgress(packet, progress) : 0;
  const visibleFraction = reducedMotion ? (progress >= 0.8 ? fraction : 0) : fraction;
  const point = pointOnRoute(route, visibleFraction);
  const arrived = progress >= 0.8;
  const dropped = !!packet?.lost && arrived;
  const activeColor = packet?.lost
    ? 'var(--rose)'
    : packet
      ? packetColor(packet.protocol)
      : 'var(--mint)';
  const activeZoom = follow && packet ? 1.7 : zoom;
  const camera = constrainCamera(
    follow && packet ? (reducedMotion ? { x: width / 2, y: height / 2 } : point) : center,
    activeZoom,
    width,
    height,
  );
  const transform = `translate(${(width / 2 - camera.x * activeZoom).toFixed(2)}px, ${(height / 2 - camera.y * activeZoom).toFixed(2)}px) scale(${activeZoom})`;

  function fit() {
    setFollow(false);
    setZoom(1);
    setCenter({ x: width / 2, y: height / 2 });
  }
  function zoomTo(value: number) {
    setFollow(false);
    setCenter(camera);
    setZoom(Math.max(1, Math.min(2.5, Number(value.toFixed(2)))));
  }
  function coordinate(e: PointerEvent<SVGSVGElement>): Point {
    const matrix = svgRef.current?.getScreenCTM();
    const p = new DOMPoint(e.clientX, e.clientY);
    return matrix ? p.matrixTransform(matrix.inverse()) : p;
  }
  function pointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0 || activeZoom === 1) return;
    viewportRef.current?.focus({ preventScroll: true });
    drag.current = { point: coordinate(e), center: camera, zoom: activeZoom };
    setCenter(camera);
    setZoom(activeZoom);
    setFollow(false);
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const p = coordinate(e),
      start = drag.current;
    setCenter(
      constrainCamera(
        {
          x: start.center.x - (p.x - start.point.x) / start.zoom,
          y: start.center.y - (p.y - start.point.y) / start.zoom,
        },
        start.zoom,
        width,
        height,
      ),
    );
  }
  function pointerEnd(e: PointerEvent<SVGSVGElement>) {
    drag.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function keyboard(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const moves: Record<string, Point> = {
      ArrowLeft: { x: -45, y: 0 },
      ArrowRight: { x: 45, y: 0 },
      ArrowUp: { x: 0, y: -45 },
      ArrowDown: { x: 0, y: 45 },
    };
    if (moves[e.key]) {
      e.preventDefault();
      e.stopPropagation();
      setFollow(false);
      setZoom(activeZoom);
      setCenter(
        constrainCamera(
          { x: camera.x + moves[e.key].x / activeZoom, y: camera.y + moves[e.key].y / activeZoom },
          activeZoom,
          width,
          height,
        ),
      );
    } else if (['+', '=', '-', '0', 'Home'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === '0' || e.key === 'Home') fit();
      else zoomTo(activeZoom + (e.key === '-' ? -0.25 : 0.25));
    }
  }
  return (
    <div
      className={`network-viewport ${dragging ? 'dragging' : ''}`}
      ref={viewportRef}
      role="region"
      tabIndex={0}
      aria-label="Network canvas. Use plus or minus to zoom, arrow keys to pan, and zero to fit."
      onKeyDown={keyboard}
    >
      <div className="diagram-tools" aria-label="Diagram zoom controls">
        <button
          className={`follow-packet ${follow ? 'active' : ''}`}
          aria-pressed={follow}
          onClick={() => {
            setFollow(!follow);
            if (follow) {
              setZoom(activeZoom);
              setCenter(camera);
            }
          }}
          title="Zoom in and follow the current packet"
        >
          <Focus size={13} />
          <span>Follow packet</span>
        </button>
        <div className="zoom-controls">
          <button
            aria-label="Zoom out"
            disabled={activeZoom <= 1}
            onClick={() => zoomTo(activeZoom - 0.25)}
          >
            <Minus size={14} />
          </button>
          <output aria-label="Zoom level" aria-live="off">
            {Math.round(activeZoom * 100)}%
          </output>
          <button
            aria-label="Zoom in"
            disabled={activeZoom >= 2.5}
            onClick={() => zoomTo(activeZoom + 0.25)}
          >
            <Plus size={14} />
          </button>
          <button aria-label="Fit entire network" title="Fit entire network (0)" onClick={fit}>
            <Scan size={14} />
          </button>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="network-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${protocol.name} network diagram${packet ? `: ${friendlyPacketLabel(packet)} from ${packet.from} to ${packet.to}` : ''}`}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onLostPointerCapture={() => {
          drag.current = null;
          setDragging(false);
        }}
        style={{
          touchAction: activeZoom > 1 ? 'none' : 'pan-y',
          cursor: activeZoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        <defs>
          <pattern id={`${id}-grid`} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".8" fill="var(--dot)" />
          </pattern>
          <marker
            id={`${id}-arrow`}
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0 0L7 3.5L0 7Z" fill={activeColor} />
          </marker>
        </defs>
        <rect width={width} height={height} fill={`url(#${id}-grid)`} />
        <g
          className={`camera-world ${dragging ? 'no-transition' : ''}`}
          style={{
            transform,
            transitionDuration: reducedMotion ? '0ms' : follow ? '180ms' : '280ms',
          }}
          data-zoom={activeZoom}
        >
          {nodes.some((n) => n.id === 'router') && (
            <>
              <rect
                x={compact ? 17 : 41}
                y="136"
                width={compact ? 235 : 405}
                height="166"
                rx="24"
                className="lan-boundary"
              />
              <text x={compact ? 29 : 58} y="287" className="zone-label">
                YOUR LOCAL NETWORK
              </text>
              <text x={compact ? 302 : 561} y="287" className="zone-label">
                THE INTERNET
              </text>
            </>
          )}
          {connections.map((r, i) => (
            <path key={i} d={pathOf(r)} className="connection" />
          ))}
          {!!packet && route.length > 1 && (
            <>
              <path
                d={pathOf(route)}
                fill="none"
                stroke={activeColor}
                strokeWidth="2"
                opacity=".3"
                markerEnd={`url(#${id}-arrow)`}
                strokeDasharray={packet.lost ? '5 5' : undefined}
              />
              <path
                d={traveledPath(route, visibleFraction)}
                className="packet-trail"
                fill="none"
                stroke={activeColor}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          )}
          {nodes.map((n) => {
            const Icon = icons[n.kind],
              sending = packet?.from === n.id,
              receiving = packet?.to === n.id;
            const highlighted = sending || (receiving && !packet?.lost);
            // The DNS route enters from below; keep its labels beside that link.
            const sideLabel = n.id === 'dns' && nodes.some((node) => node.id === 'router');
            return (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <title>
                  {n.label} · {n.address}
                </title>
                {highlighted && (
                  <rect
                    x="-38"
                    y="-38"
                    width="76"
                    height="76"
                    rx="20"
                    fill={nodeColor[n.kind]}
                    opacity={receiving && arrived ? 0.16 : 0.06}
                  />
                )}
                <rect
                  x="-30"
                  y="-30"
                  width="60"
                  height="60"
                  rx="15"
                  className="device-box"
                  stroke={highlighted ? nodeColor[n.kind] : 'var(--border-strong)'}
                />
                <Icon
                  x="-13"
                  y="-13"
                  width="26"
                  height="26"
                  color={nodeColor[n.kind]}
                  strokeWidth={1.5}
                />
                <circle
                  cx="22"
                  cy="-23"
                  r="4"
                  fill={nodeColor[n.kind]}
                  stroke="var(--surface)"
                  strokeWidth="2"
                />
                <text
                  textAnchor={sideLabel ? (compact ? 'end' : 'start') : 'middle'}
                  x={sideLabel ? (compact ? -45 : 45) : 0}
                  y={sideLabel ? -2 : 51}
                  className="device-label"
                >
                  {n.label}
                </text>
                <text
                  textAnchor={sideLabel ? (compact ? 'end' : 'start') : 'middle'}
                  x={sideLabel ? (compact ? -45 : 45) : 0}
                  y={sideLabel ? 15 : 68}
                  className="device-address"
                >
                  {n.address}
                </text>
              </g>
            );
          })}
          {!!packet && route.length > 1 && (
            <g
              className={`moving-packet ${dropped ? 'is-dropped' : ''}`}
              transform={`translate(${point.x.toFixed(3)} ${point.y.toFixed(3)})`}
              data-progress={progress.toFixed(5)}
              data-route-progress={fraction.toFixed(5)}
              data-packet-index={packet.index}
              data-status={
                dropped
                  ? 'dropped'
                  : arrived
                    ? 'arrived'
                    : progress < 0.12
                      ? 'preparing'
                      : 'traveling'
              }
              aria-label={
                dropped ? 'Packet dropped' : arrived ? 'Packet arrived' : 'Current packet'
              }
            >
              <circle r={dropped ? 17 : 16} fill={activeColor} opacity=".12" />
              <circle r="10" fill="var(--surface)" stroke={activeColor} strokeWidth="2" />
              {dropped ? (
                <path
                  d="M-4 -4L4 4M4 -4L-4 4"
                  stroke={activeColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : arrived ? (
                <path
                  d="m-4 0 3 3 5-6"
                  fill="none"
                  stroke={activeColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="m-3 -4 5 4-5 4"
                  transform={`rotate(${point.angle})`}
                  fill="none"
                  stroke={activeColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          )}
        </g>
      </svg>
      <div className="diagram-hint">
        <span>
          {follow && packet
            ? 'Following this packet'
            : activeZoom > 1
              ? 'Drag to pan · 0 to fit'
              : 'Zoom in, or follow a packet as it travels'}
        </span>
        {packet?.encrypted && (
          <span className="protected-tag">
            <LockKeyhole size={11} /> Protected data
          </span>
        )}
      </div>
    </div>
  );
}
export function SequenceDiagram({
  protocol,
  packets,
  active,
  onInspect,
}: {
  protocol: Protocol;
  packets: TracePacket[];
  active: number;
  onInspect: (p: TracePacket) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nodes = protocol.devices.filter((n) =>
    protocol.steps.some((step) => step.packets.some((p) => p.from === n.id || p.to === n.id)),
  );
  useEffect(() => {
    const container = scrollRef.current,
      row = container?.querySelector(`[data-sequence-packet="${active}"]`);
    if (!container || !row || active < 0) return;
    const box = row.getBoundingClientRect(),
      bounds = container.getBoundingClientRect();
    if (box.bottom > bounds.bottom) container.scrollTop += box.bottom - bounds.bottom + 20;
    else if (box.top < bounds.top) container.scrollTop -= bounds.top - box.top + 20;
  }, [active]);
  const height = Math.max(300, packets.length * 44 + 88);
  const pos = (id: string) =>
    78 + nodes.findIndex((n) => n.id === id) * (624 / Math.max(1, nodes.length - 1));
  return (
    <div className="sequence-scroll" ref={scrollRef}>
      <svg
        viewBox={`0 0 780 ${height}`}
        className="sequence-svg"
        role="img"
        aria-label={`${protocol.name} sequence diagram`}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto-start-reverse"
          >
            <path d="M0 0L8 4L0 8Z" fill="context-stroke" />
          </marker>
        </defs>
        {nodes.map((n) => (
          <g key={n.id}>
            <text x={pos(n.id)} y="26" textAnchor="middle" className="device-label">
              {n.label}
            </text>
            <line
              x1={pos(n.id)}
              x2={pos(n.id)}
              y1="44"
              y2={height - 15}
              stroke="var(--border-strong)"
              strokeDasharray="4 5"
            />
          </g>
        ))}
        {packets.map((p, i) => (
          <g
            key={p.index}
            className="sequence-packet"
            data-sequence-packet={p.index}
            role="button"
            tabIndex={0}
            aria-label={`Inspect packet ${p.index + 1}: ${p.label}`}
            onClick={() => onInspect(p)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onInspect(p);
              }
            }}
          >
            <rect
              x="30"
              y={54 + i * 44}
              width="720"
              height="40"
              rx="5"
              fill={p.index === active ? 'var(--accent-soft)' : 'transparent'}
            />
            <line
              x1={pos(p.from)}
              x2={pos(p.to)}
              y1={82 + i * 44}
              y2={82 + i * 44}
              stroke={p.lost ? 'var(--rose)' : packetColor(p.protocol)}
              strokeWidth="1.5"
              markerEnd="url(#arrowhead)"
              strokeDasharray={p.lost ? '5 3' : undefined}
            />
            <text
              x={(pos(p.from) + pos(p.to)) / 2}
              y={74 + i * 44}
              textAnchor="middle"
              fill={packetColor(p.protocol)}
              className="packet-caption"
            >
              {friendlyPacketLabel(p).length > 44
                ? friendlyPacketLabel(p).slice(0, 43) + '…'
                : friendlyPacketLabel(p)}
              {p.lost ? ' ×' : ''}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
