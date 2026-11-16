import { ArrowRight, Check, CircleDot, Package, Search, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import type { Protocol, TracePacket } from '../data/protocols';
import { usePlaybackProgress, type PlaybackClock } from '../simulation/playback';
import {
  friendlyPacketLabel,
  journeyPhase,
  packetExplanation,
  phaseDescription,
  phaseLabel,
  routeDevices,
} from '../simulation/journey';
import { packetColor } from './NetworkDiagram';

function useJourneyPhase(
  clock: PlaybackClock,
  protocol: Protocol,
  packet: TracePacket,
  compact: boolean,
) {
  return useSyncExternalStore(
    clock.subscribe,
    () => journeyPhase(protocol, packet, clock.getSnapshot(), compact),
    () => 'prepare' as const,
  );
}
export function JourneyReadout({
  protocol,
  packet,
  clock,
  compact,
  onSeek,
}: {
  protocol: Protocol;
  packet: TracePacket;
  clock: PlaybackClock;
  compact: boolean;
  onSeek: (progress: number) => void;
}) {
  const phase = useJourneyPhase(clock, protocol, packet, compact);
  const route = routeDevices(protocol.devices, packet.from, packet.to);
  const stage = phase === 'prepare' ? 0 : phase === 'delivered' || phase === 'dropped' ? 2 : 1;
  return (
    <div className={`journey-readout ${phase === 'dropped' ? 'loss' : ''}`}>
      <div className="journey-message">
        <span className="protocol-badge" style={{ color: packetColor(packet.protocol) }}>
          {packet.protocol}
        </span>
        <strong>{friendlyPacketLabel(packet)}</strong>
        <span className="message-number">#{String(packet.index + 1).padStart(2, '0')}</span>
      </div>
      <div className="journey-route" aria-label="Packet route">
        {route.map((node, i) => (
          <span key={node.id}>
            <span>{node.label}</span>
            {i < route.length - 1 && <ArrowRight size={11} />}
          </span>
        ))}
      </div>
      <div className="packet-stages" aria-label="Packet journey stages">
        {[
          { name: 'Prepare', at: 0 },
          { name: 'Travel', at: 0.45 },
          { name: packet.lost ? 'Drop' : 'Arrive', at: 0.9 },
        ].map((s, i) => (
          <button
            key={s.name}
            className={`${stage === i ? 'active' : ''} ${stage > i ? 'passed' : ''}`}
            onClick={() => onSeek(s.at)}
            aria-label={`Examine ${s.name.toLowerCase()} stage`}
            aria-pressed={stage === i}
          >
            <span>
              {stage > i ? <Check size={11} /> : i === 2 && packet.lost ? <X size={11} /> : i + 1}
            </span>
            {s.name}
            <i />
          </button>
        ))}
      </div>
      <div className="journey-now" aria-live="polite" aria-atomic="true">
        <span className="journey-phase">
          <CircleDot size={12} />
          {phaseLabel[phase]}
        </span>
        <p>{phaseDescription(protocol, packet, phase)}</p>
      </div>
      <PacketScrubber clock={clock} onSeek={onSeek} />
    </div>
  );
}
function PacketScrubber({
  clock,
  onSeek,
}: {
  clock: PlaybackClock;
  onSeek: (value: number) => void;
}) {
  const progress = usePlaybackProgress(clock);
  return (
    <label className="packet-scrubber">
      <span>Scrub to explore</span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        aria-label="Packet progress"
        aria-valuetext={`${Math.round(progress * 100)} percent through this packet`}
        value={Math.round(progress * 100)}
        onChange={(e) => onSeek(Number(e.target.value) / 100)}
      />
      <output aria-live="off">{Math.round(progress * 100)}%</output>
    </label>
  );
}
export function PacketNarration({
  packet,
  onInspect,
}: {
  packet: TracePacket;
  onInspect: (packet: TracePacket) => void;
}) {
  const context = packetExplanation(packet);
  return (
    <div className="packet-explanation">
      <div className="eyebrow">
        <Package size={13} /> INSIDE THIS PACKET
      </div>
      <h3>{friendlyPacketLabel(packet)}</h3>
      <p>{context.meaning}</p>
      <dl className="packet-quick-facts">
        <div>
          <dt>Message</dt>
          <dd>{packet.protocol}</dd>
        </div>
        <div>
          <dt>Illustrative size</dt>
          <dd>{packet.bytes} B</dd>
        </div>
        {packet.port && (
          <div>
            <dt>Service / target port</dt>
            <dd>{packet.port}</dd>
          </div>
        )}
        {packet.flags && (
          <div>
            <dt>TCP flags</dt>
            <dd>{packet.flags}</dd>
          </div>
        )}
      </dl>
      <details className="packet-context">
        <summary>What happens after this?</summary>
        <p>{context.after}</p>
      </details>
      <button className="text-button inspect-current" onClick={() => onInspect(packet)}>
        <Search size={13} />
        Open current packet details <ArrowRight size={13} />
      </button>
    </div>
  );
}
export function LessonPlaybackProgress({
  clock,
  index,
  total,
  done,
}: {
  clock: PlaybackClock;
  index: number;
  total: number;
  done: boolean;
}) {
  const progress = usePlaybackProgress(clock);
  return (
    <div
      className="playback-progress"
      role="progressbar"
      aria-label="Lesson progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(done ? 100 : Math.max(0, ((index + progress) / total) * 100))}
    >
      <i style={{ width: `${done ? 100 : Math.max(0, ((index + progress) / total) * 100)}%` }} />
    </div>
  );
}
