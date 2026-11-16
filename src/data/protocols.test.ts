import { describe, expect, it } from 'vitest';
import { getTrace, learningPaths, protocolById, protocols } from './protocols';
import { validProgress } from '../state';

describe('lesson integrity', () => {
  it('has unique routes and covers every lesson exactly once in the learning path', () => {
    const ids = protocols.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(learningPaths.flatMap((p) => p.ids).sort()).toEqual([...ids].sort());
  });
  for (const protocol of protocols) {
    it(`${protocol.name} can render and traverse every packet and quiz`, () => {
      const trace = getTrace(protocol),
        nodes = new Set(protocol.devices.map((d) => d.id));
      expect(trace.length).toBeGreaterThan(0);
      expect(protocol.steps.length).toBeGreaterThan(2);
      for (const [i, packet] of trace.entries()) {
        expect(nodes.has(packet.from)).toBe(true);
        expect(nodes.has(packet.to)).toBe(true);
        expect(packet.index).toBe(i);
        expect(packet.bytes).toBeGreaterThan(0);
        if (i > 0) expect(packet.time).toBeGreaterThan(trace[i - 1].time);
        expect(protocol.steps[packet.step]).toBeDefined();
      }
      expect(protocol.quiz.options[protocol.quiz.answer]).toBeTruthy();
      expect(protocol.quiz.explanation.length).toBeGreaterThan(20);
    });
  }
  it('keeps TCP recovery and UDP loss semantically distinct', () => {
    expect(getTrace(protocolById('tcp')).some((p) => p.lost)).toBe(true);
    expect(getTrace(protocolById('tcp')).some((p) => p.label.includes('Retransmit'))).toBe(true);
    expect(getTrace(protocolById('udp')).some((p) => p.lost)).toBe(true);
    expect(getTrace(protocolById('udp')).some((p) => p.label.includes('Retransmit'))).toBe(false);
  });
  it('recovers from unknown deep links and rejects malformed persisted progress', () => {
    expect(protocolById('unknown').id).toBe('http');
    for (const data of [
      null,
      {},
      'http',
      { completed: ['unknown'], quizzes: [] },
      { completed: [], quizzes: [42] },
    ])
      expect(validProgress(data)).toBe(false);
    expect(validProgress({ completed: ['http', 'tcp'], quizzes: ['tcp'] })).toBe(true);
  });
});
