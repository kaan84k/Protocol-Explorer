import { Monitor, Router, Server, Globe2, Wifi, Network, LockKeyhole } from 'lucide-react';
import type { Device, Protocol, TracePacket } from '../data/protocols';
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
function routePoints(devices: Device[], from: string, to: string): Device[] {
  const a = devices.find((n) => n.id === from),
    b = devices.find((n) => n.id === to);
  if (!a || !b) return [];
  const router = devices.find((n) => n.id === 'router');
  if (router && from !== 'router' && to !== 'router' && (from === 'client' || to === 'client'))
    return [a, router, b];
  return [a, b];
}
function pathOf(nodes: Device[]) {
  return nodes.map((n, i) => `${i ? 'L' : 'M'} ${n.x} ${n.y}`).join(' ');
}
export function NetworkDiagram({
  protocol,
  packet,
  playing,
  speed,
  reducedMotion,
  compact = false,
}: {
  protocol: Protocol;
  packet?: TracePacket;
  playing: boolean;
  speed: number;
  reducedMotion: boolean;
  compact?: boolean;
}) {
  const nodes = protocol.devices.map((n) =>
    compact ? { ...n, x: 45 + ((n.x - 85) / 625) * 330 } : n,
  );
  const pairs = new Map<string, [string, string]>();
  protocol.steps
    .flatMap((s) => s.packets)
    .forEach((p) => {
      const route = routePoints(nodes, p.from, p.to);
      route.slice(1).forEach((n, i) => {
        const a = route[i].id,
          b = n.id,
          key = [a, b].sort().join(':');
        pairs.set(key, [a, b]);
      });
    });
  const route = packet ? routePoints(nodes, packet.from, packet.to) : [];
  const activeColor = packet
    ? packet.lost
      ? 'var(--rose)'
      : packetColor(packet.protocol)
    : 'var(--mint)';
  const midpoint = route.length
    ? {
        x: (route[0].x + route[route.length - 1].x) / 2,
        y: (route[0].y + route[route.length - 1].y) / 2,
      }
    : undefined;
  return (
    <svg
      className="network-svg"
      viewBox={compact ? `0 0 420 ${nodes.length > 4 ? 390 : 330}` : '0 0 780 380'}
      role="img"
      aria-label={`${protocol.name} network diagram${packet ? `: ${packet.label} from ${packet.from} to ${packet.to}` : ''}`}
    >
      <defs>
        <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".8" fill="var(--dot)" />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <rect width={compact ? 420 : 780} height="390" fill="url(#grid)" />
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
      {[...pairs.values()].map(([a, b]) => {
        const from = nodes.find((n) => n.id === a)!,
          to = nodes.find((n) => n.id === b)!;
        return <path key={`${a}-${b}`} d={pathOf([from, to])} className="connection" />;
      })}
      {route.length > 0 && (
        <g key={`${protocol.id}-${packet!.index}`}>
          <path
            d={pathOf(route)}
            fill="none"
            stroke={activeColor}
            strokeWidth="2"
            opacity=".45"
            strokeDasharray={packet?.lost ? '5 5' : undefined}
          />
          {!reducedMotion && playing && (
            <circle r="6" fill={activeColor}>
              <animateMotion
                dur={`${2.2 / speed}s`}
                path={pathOf(route)}
                repeatCount="indefinite"
              />
            </circle>
          )}
          {midpoint && (
            <g
              transform={`translate(${midpoint.x},${midpoint.y - (route.length > 2 && route[0].y === route[route.length - 1].y ? 54 : 19)})`}
            >
              <rect
                x="-99"
                y="-14"
                width="198"
                height="26"
                rx="7"
                fill="var(--surface)"
                stroke={activeColor}
                strokeOpacity=".4"
              />
              <text textAnchor="middle" y="3" fill={activeColor} className="packet-caption">
                {packet!.label.length > 25 ? packet!.label.slice(0, 24) + '…' : packet!.label}
              </text>
            </g>
          )}
        </g>
      )}
      {nodes.map((n) => {
        const Icon = icons[n.kind];
        const active = packet && (packet.from === n.id || packet.to === n.id);
        return (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <title>
              {n.label} · {n.address}
            </title>
            {active && (
              <rect
                x="-38"
                y="-38"
                width="76"
                height="76"
                rx="20"
                fill={nodeColor[n.kind]}
                opacity=".06"
              />
            )}
            <rect
              x="-30"
              y="-30"
              width="60"
              height="60"
              rx="15"
              className="device-box"
              stroke={active ? nodeColor[n.kind] : 'var(--border-strong)'}
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
            <text textAnchor="middle" y="51" className="device-label">
              {n.label}
            </text>
            <text textAnchor="middle" y="68" className="device-address">
              {n.address}
            </text>
          </g>
        );
      })}
      {packet?.encrypted && (
        <g transform={`translate(${compact ? 252 : 605},17)`}>
          <LockKeyhole width="12" height="12" color="var(--violet)" />
          <text x="19" y="10" className="zone-label" fill="var(--violet)">
            PROTECTED DATA
          </text>
        </g>
      )}
    </svg>
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
  const nodes = protocol.devices.filter((n) =>
    packets.some((p) => p.from === n.id || p.to === n.id),
  );
  const height = Math.max(300, packets.length * 44 + 88);
  const pos = (id: string) =>
    78 + nodes.findIndex((n) => n.id === id) * (624 / Math.max(1, nodes.length - 1));
  return (
    <div className="sequence-scroll">
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
              {p.label.length > 32 ? p.label.slice(0, 31) + '…' : p.label}
              {p.lost ? ' ×' : ''}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
