import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Lightbulb,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import type { Protocol, TracePacket } from '../data/protocols';
import { PacketNarration } from './PacketJourney';
export default function LessonDetail({
  protocol,
  step,
  done,
  advanced,
  onQuiz,
  onNext,
  quizPassed,
  packet,
  onInspect,
}: {
  protocol: Protocol;
  step: number;
  done: boolean;
  advanced: boolean;
  onQuiz: () => void;
  onNext: () => void;
  quizPassed: boolean;
  packet?: TracePacket;
  onInspect: (packet: TracePacket) => void;
}) {
  const [answer, setAnswer] = useState<number | null>(null);
  const current = protocol.steps[step];
  const correct = answer === protocol.quiz.answer;
  return (
    <aside className="lesson-detail panel" aria-label="Lesson explanation">
      <div className="detail-kicker">
        <BookOpen size={15} />
        <span>
          {done
            ? 'LESSON COMPLETE'
            : step < 0
              ? 'THE BIG PICTURE'
              : `STEP ${String(step + 1).padStart(2, '0')} OF ${String(protocol.steps.length).padStart(2, '0')}`}
        </span>
        {done && <Check size={15} className="mint" />}
      </div>
      {done ? (
        <>
          <div className="complete-icon">
            <ShieldCheck size={27} />
          </div>
          <h2>
            One more piece of
            <br />
            the internet, understood.
          </h2>
          <p>{protocol.takeaway}</p>
          <div className="quiz">
            <div className="eyebrow">
              <Sparkles size={13} /> QUICK CHECK
            </div>
            <h3>{protocol.quiz.question}</h3>
            {protocol.quiz.options.map((option, i) => (
              <button
                key={option}
                className={`quiz-option ${answer === i ? (correct ? 'correct' : 'incorrect') : ''}`}
                onClick={() => {
                  setAnswer(i);
                  if (i === protocol.quiz.answer) onQuiz();
                }}
              >
                <span>{String.fromCharCode(65 + i)}</span>
                {option}
                {answer === i && correct && <Check size={15} />}
              </button>
            ))}
            {answer !== null && (
              <p className={`quiz-feedback ${correct ? 'mint' : ''}`} role="status">
                {correct ? 'Exactly. ' : 'Try again. '}
                {protocol.quiz.explanation}
              </p>
            )}
            {quizPassed && answer === null && (
              <p className="mint small">✓ You’ve passed this knowledge check.</p>
            )}
          </div>
          <button className="button primary next-lesson" onClick={onNext}>
            Explore the next protocol <ChevronRight size={16} />
          </button>
        </>
      ) : (
        <>
          <div className={`detail-protocol color-${protocol.color}`}>
            {step < 0 ? protocol.name : String(step + 1).padStart(2, '0')}
            <span>{step < 0 ? 'PROTOCOL OVERVIEW' : 'WHAT HAPPENS'}</span>
          </div>
          <h2>{step < 0 ? protocol.tagline : current.title}</h2>
          <p className="explanation" aria-live="polite">
            {step < 0 ? protocol.description : current.description}
          </p>
          {step < 0 ? (
            <dl className="facts">
              <div>
                <dt>OSI layer</dt>
                <dd>
                  {protocol.layer} <span>· {layerName(protocol.layer)}</span>
                </dd>
              </div>
              <div>
                <dt>Default port</dt>
                <dd className="mono">{protocol.port}</dd>
              </div>
              <div>
                <dt>Lesson length</dt>
                <dd>
                  {protocol.steps.length} steps{' '}
                  <span>· ~{Math.max(2, Math.ceil(protocol.steps.length * 0.55))} min</span>
                </dd>
              </div>
            </dl>
          ) : packet ? (
            <PacketNarration packet={packet} onInspect={onInspect} />
          ) : (
            <div className="step-mini-list">
              {protocol.steps.map((s, i) => (
                <div key={s.title} className={i === step ? 'current' : i < step ? 'passed' : ''}>
                  <span>{i < step ? <Check size={11} /> : i + 1}</span>
                  <p>{s.title}</p>
                </div>
              ))}
            </div>
          )}
          <div className="insight">
            <Lightbulb size={17} />
            <div>
              <strong>{step < 0 ? 'Keep this in mind' : 'The key idea'}</strong>
              <p>{step < 0 ? protocol.takeaway : current.insight}</p>
            </div>
          </div>
          {advanced && (
            <div className="advanced-note">
              <h3>Under the hood</h3>
              <p>
                Packet sizes and times are illustrative. The trace groups some messages and omits
                routine acknowledgments to make the exchange easier to follow.
              </p>
            </div>
          )}
          <a
            className="reference-link"
            href={
              protocol.rfc.startsWith('IEEE')
                ? 'https://www.ieee802.org/11/'
                : `https://www.rfc-editor.org/rfc/rfc${protocol.rfc}`
            }
            target="_blank"
            rel="noreferrer"
          >
            Read {protocol.rfc.startsWith('IEEE') ? protocol.rfc : `RFC ${protocol.rfc}`}{' '}
            <ArrowUpRight size={13} />
          </a>
        </>
      )}
    </aside>
  );
}
export function layerName(layer: number) {
  return [
    'Physical',
    'Data link',
    'Network',
    'Transport',
    'Session',
    'Presentation',
    'Application',
  ][layer - 1];
}
