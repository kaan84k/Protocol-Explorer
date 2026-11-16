import { ChevronLeft, ChevronRight, Copy, LockKeyhole, Package, Check } from 'lucide-react';
import { useState } from 'react';
import type { Protocol, TracePacket } from '../data/protocols';
import Modal from './Modal';
import { packetColor } from './NetworkDiagram';
export default function PacketInspector({
  protocol,
  packet,
  trace,
  onClose,
  onSelect,
  advanced,
}: {
  protocol: Protocol;
  packet: TracePacket;
  trace: TracePacket[];
  onClose: () => void;
  onSelect: (p: TracePacket) => void;
  advanced: boolean;
}) {
  const [copied, setCopied] = useState(false),
    [copyFailed, setCopyFailed] = useState(false);
  const from = protocol.devices.find((n) => n.id === packet.from)!,
    to = protocol.devices.find((n) => n.id === packet.to)!;
  const content = packet.payload ?? packet.summary;
  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  }
  return (
    <Modal title="Packet inspector" onClose={onClose} wide>
      <div className="inspector-body">
        <div className="inspector-title">
          <span className="packet-symbol" style={{ color: packetColor(packet.protocol) }}>
            <Package size={26} />
          </span>
          <div>
            <div className="eyebrow">
              PACKET {String(packet.index + 1).padStart(2, '0')} · STEP {packet.step + 1}
            </div>
            <h3>{packet.label}</h3>
          </div>
          <span className="protocol-badge" style={{ color: packetColor(packet.protocol) }}>
            {packet.protocol}
          </span>
        </div>
        <p>{packet.summary}</p>
        {packet.lost && (
          <div className="lost-notice">This packet is dropped in the simulated network.</div>
        )}
        <div className="packet-route">
          <div>
            <span>SOURCE</span>
            <strong>{from.label}</strong>
            <code>{from.address}</code>
          </div>
          <ChevronRight size={22} />
          <div>
            <span>DESTINATION</span>
            <strong>{to.label}</strong>
            <code>{to.address}</code>
          </div>
        </div>
        <dl className="inspector-facts">
          <div>
            <dt>Illustrative time</dt>
            <dd>{packet.time.toFixed(3)} s</dd>
          </div>
          <div>
            <dt>Illustrative size</dt>
            <dd>{packet.bytes} bytes</dd>
          </div>
          <div>
            <dt>Service / target port</dt>
            <dd>{packet.port ?? 'Not applicable'}</dd>
          </div>
          <div>
            <dt>TCP flags</dt>
            <dd>{packet.flags ?? 'Not applicable'}</dd>
          </div>
        </dl>
        {packet.encrypted && (
          <div className="encrypted-note">
            <LockKeyhole size={16} /> Protected traffic. Any readable application content below
            represents an endpoint’s decrypted view.
          </div>
        )}
        <div className="payload-head">
          <span>{advanced ? 'ILLUSTRATIVE DECODED CONTENT' : 'MESSAGE DETAILS'}</span>
          <button className="text-button" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="payload">{content}</pre>
        {copyFailed && (
          <p role="status" className="small">
            Clipboard unavailable. You can select and copy the text above.
          </p>
        )}
        <p className="small muted">
          Educational simulation. Times, sizes, and payloads are simplified examples, not a live
          packet capture.
        </p>
      </div>
      <div className="modal-footer">
        <span className="mono small">
          {packet.index + 1} / {trace.length} packets
        </span>
        <div className="inline">
          <button
            className="button secondary"
            disabled={packet.index === 0}
            onClick={() => onSelect(trace[packet.index - 1])}
          >
            <ChevronLeft size={15} /> Previous
          </button>
          <button
            className="button secondary"
            disabled={packet.index === trace.length - 1}
            onClick={() => onSelect(trace[packet.index + 1])}
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
