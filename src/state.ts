import { useState } from 'react';
import { protocolById } from './data/protocols';
export interface Progress {
  completed: string[];
  quizzes: string[];
}
export function readStored<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`pe:${key}`) ?? 'null');
    if (value === null || (validate && !validate(value))) return fallback;
    return value as T;
  } catch {
    return fallback;
  }
}
export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(`pe:${key}`, JSON.stringify(value));
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
}
export function validProgress(value: unknown): value is Progress {
  if (!value || typeof value !== 'object') return false;
  const p = value as Progress;
  return (
    Array.isArray(p.completed) &&
    Array.isArray(p.quizzes) &&
    [...p.completed, ...p.quizzes].every((x) => typeof x === 'string' && protocolById(x).id === x)
  );
}
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() =>
    readStored('progress', { completed: [], quizzes: [] }, validProgress),
  );
  function complete(id: string, quiz = false) {
    setProgress((previous) => {
      const next = {
        ...previous,
        completed: [...new Set([...previous.completed, id])],
        quizzes: quiz ? [...new Set([...previous.quizzes, id])] : previous.quizzes,
      };
      writeStored('progress', next);
      return next;
    });
  }
  return { progress, complete };
}
export function initialProtocol() {
  return protocolById(new URLSearchParams(window.location.search).get('protocol') || 'http');
}
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
