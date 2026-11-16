import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackClock, PACKET_DURATION_MS } from './playback';
import { getTrace, protocolById } from '../data/protocols';
import {
  constrainCamera,
  friendlyPacketLabel,
  journeyPhase,
  packetExplanation,
  packetPath,
  pointOnRoute,
  routeDevices,
  routeProgress,
} from './journey';

let now = 0,
  id = 0,
  pending = new Map<number, FrameRequestCallback>();
function advance(ms: number) {
  now += ms;
  const callbacks = [...pending.values()];
  pending.clear();
  callbacks.forEach((cb) => cb(now));
}
beforeEach(() => {
  now = 0;
  id = 0;
  pending = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    pending.set(++id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => pending.delete(key));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('packet playback clock', () => {
  it('starts at the sender even after a long idle page lifetime', () => {
    now = 37000;
    const clock = new PlaybackClock();
    clock.start(1, PACKET_DURATION_MS, () => {});
    expect(clock.getSnapshot()).toBe(0);
    advance(480);
    expect(clock.getSnapshot()).toBeCloseTo(0.1);
    clock.pause();
  });
  it('freezes on pause and resumes from exactly the same position', () => {
    const clock = new PlaybackClock();
    clock.start(1, PACKET_DURATION_MS, () => {});
    advance(1920);
    clock.pause();
    advance(12000);
    expect(clock.getSnapshot()).toBeCloseTo(0.4);
    clock.start(1, PACKET_DURATION_MS, () => {});
    expect(clock.getSnapshot()).toBeCloseTo(0.4);
    advance(480);
    expect(clock.getSnapshot()).toBeCloseTo(0.5);
    clock.pause();
  });
  it('changes speed without resetting progress', () => {
    const clock = new PlaybackClock();
    clock.start(1, PACKET_DURATION_MS, () => {});
    advance(960);
    clock.start(2, PACKET_DURATION_MS, () => {});
    expect(clock.getSnapshot()).toBeCloseTo(0.2);
    advance(960);
    expect(clock.getSnapshot()).toBeCloseTo(0.6);
    clock.pause();
  });
  it('finishes once, holds at arrival, and does not loop', () => {
    const finish = vi.fn(),
      clock = new PlaybackClock();
    clock.start(1, PACKET_DURATION_MS, finish);
    advance(4800);
    advance(20000);
    expect(finish).toHaveBeenCalledTimes(1);
    expect(clock.getSnapshot()).toBe(1);
    expect(pending.size).toBe(0);
  });
  it('scrubs to a new position and plays only the remaining time', () => {
    const finish = vi.fn(),
      clock = new PlaybackClock();
    clock.seek(0.75);
    clock.start(1, PACKET_DURATION_MS, finish);
    advance(1200);
    expect(finish).toHaveBeenCalledTimes(1);
    expect(clock.getSnapshot()).toBe(1);
  });
});

describe('packet journey geometry and narration', () => {
  it('explains a WebSocket upgrade as a request and keeps it distinct from the response', () => {
    const trace = getTrace(protocolById('websocket'));
    const request = trace.find((packet) => packet.label === 'Upgrade: websocket')!;
    const response = trace.find((packet) => packet.label === '101 Switching Protocols')!;
    expect(packetExplanation(request).meaning).toContain('This HTTP request');
    expect(packetExplanation(response).meaning).toContain('HTTP status line');
  });
  it('explains TTL expiration without promising that the probe reaches the remote host', () => {
    const probe = getTrace(protocolById('icmp')).find((packet) => packet.label === 'TTL=1')!;
    expect(packetExplanation(probe).after).toContain('discards this probe');
    expect(packetExplanation(probe).after).toContain('ICMP Time Exceeded');
  });
  it('routes a DNS question through the gateway and the response back in reverse', () => {
    const p = protocolById('http'),
      [query, response] = getTrace(p);
    const forward = routeDevices(p.devices, query.from, query.to),
      back = routeDevices(p.devices, response.from, response.to);
    expect(forward.map((n) => n.id)).toEqual(['client', 'router', 'dns']);
    expect(back.map((n) => n.id)).toEqual(['dns', 'router', 'client']);
    const path = packetPath(forward);
    expect(pointOnRoute(path, 0).x).toBeGreaterThan(forward[0].x);
    expect(pointOnRoute(path, 1).y).toBeGreaterThan(forward[2].y);
  });
  it('stops lost packets before the destination and narrates a drop', () => {
    const p = protocolById('udp'),
      packet = getTrace(p).find((p) => p.lost)!;
    expect(routeProgress(packet, 1)).toBeLessThan(1);
    expect(journeyPhase(p, packet, 1)).toBe('dropped');
    expect(journeyPhase(p, packet, 0)).toBe('prepare');
  });
  it('narrates forwarding consistently with compact route geometry', () => {
    const p = protocolById('http'),
      packet = getTrace(p)[0];
    expect(journeyPhase(p, packet, 0.59, true)).toBe('forward');
    expect(journeyPhase(p, packet, 0.3, true)).toBe('travel');
    expect(journeyPhase(p, packet, 0.9, true)).toBe('delivered');
  });
  it('makes DNS query shorthand readable without altering packet data', () => {
    const p = getTrace(protocolById('http'))[0];
    expect(friendlyPacketLabel(p)).toBe('DNS query: example.com (IPv4)');
    expect(p.label).toBe('A? example.com');
  });
  it('keeps zoomed cameras within the diagram and resets fit to the center', () => {
    expect(constrainCamera({ x: -100, y: 1000 }, 2, 780, 380)).toEqual({ x: 195, y: 285 });
    expect(constrainCamera({ x: 0, y: 0 }, 1, 420, 330)).toEqual({ x: 210, y: 165 });
  });
});
