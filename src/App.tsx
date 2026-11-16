import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Code2,
  Compass,
  Expand,
  Globe2,
  GraduationCap,
  Hexagon,
  Keyboard,
  Layers3,
  ListFilter,
  LockKeyhole,
  Menu,
  Moon,
  Network,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  Shrink,
  SkipForward,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import {
  categories,
  categoryColors,
  getTrace,
  protocols,
  type Category,
  type Protocol,
  type TracePacket,
} from './data/protocols';
import { clamp, initialProtocol, readStored, useProgress, writeStored } from './state';
import { NetworkDiagram, SequenceDiagram, packetColor } from './components/NetworkDiagram';
import LessonDetail, { layerName } from './components/LessonDetail';
import PacketInspector from './components/PacketInspector';
import { LearningPath, ReferenceView } from './components/LearningViews';
import Modal from './components/Modal';
import { usePlaybackClock } from './simulation/playback';
import { JourneyReadout, LessonPlaybackProgress } from './components/PacketJourney';
import { friendlyPacketLabel } from './simulation/journey';

type Section = 'explorer' | 'path' | 'reference';
interface Frame {
  step: number;
  packet?: TracePacket;
}
const speeds = [0.5, 1, 1.5, 2];
export default function App() {
  const [protocol, setProtocol] = useState(initialProtocol);
  const [section, setSection] = useState<Section>('explorer');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 900px)').matches);
  const [phone, setPhone] = useState(() => matchMedia('(max-width: 640px)').matches);
  const menuRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    readStored('theme', 'dark', (x): x is 'dark' | 'light' => x === 'dark' || x === 'light'),
  );
  const [advanced, setAdvanced] = useState(() =>
    readStored('advanced', false, (x): x is boolean => typeof x === 'boolean'),
  );
  const [view, setView] = useState<'network' | 'sequence'>('network');
  const [frameIndex, setFrameIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [inspected, setInspected] = useState<TracePacket | null>(null);
  const [help, setHelp] = useState(false);
  const [traceExpanded, setTraceExpanded] = useState(true);
  const [notice, setNotice] = useState('');
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const { progress, complete } = useProgress();
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const trace = useMemo(() => getTrace(protocol), [protocol]);
  const frames = useMemo<Frame[]>(
    () =>
      protocol.steps.flatMap((step, i) =>
        step.packets.length
          ? trace.filter((p) => p.step === i).map((packet) => ({ step: i, packet }))
          : [{ step: i }],
      ),
    [protocol, trace],
  );
  const frame = frames[frameIndex];
  const activeStep = frame?.step ?? -1;
  const visiblePackets =
    frameIndex < 0 || done
      ? trace
      : trace.filter(
          (p) =>
            p.step < activeStep ||
            (p.step === activeStep && (!frame?.packet || p.index <= frame.packet.index)),
        );
  const filtered = protocols.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      `${p.name} ${p.fullName} ${p.category} ${p.steps.map((s) => s.title).join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const completion = Math.round((progress.completed.length / protocols.length) * 100);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStored('theme', theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1018' : '#f5f7fa');
  }, [theme]);
  useEffect(() => {
    writeStored('advanced', advanced);
  }, [advanced]);
  useEffect(() => {
    document.title = `${protocol.name} · Protocol Explorer`;
  }, [protocol]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReducedMotion(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 2800);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const media = matchMedia('(max-width: 900px)'),
      small = matchMedia('(max-width: 640px)');
    const changed = () => {
      setNarrow(media.matches);
      setPhone(small.matches);
    };
    media.addEventListener('change', changed);
    small.addEventListener('change', changed);
    return () => {
      media.removeEventListener('change', changed);
      small.removeEventListener('change', changed);
    };
  }, []);
  useEffect(() => {
    if (!narrow) return;
    if (sidebarOpen) searchRef.current?.focus();
    else if (sidebarRef.current?.contains(document.activeElement)) menuRef.current?.focus();
  }, [narrow, sidebarOpen]);
  const selectProtocol = useCallback((next: Protocol, history = true) => {
    setProtocol(next);
    setFrameIndex(-1);
    setPlaying(false);
    setDone(false);
    setInspected(null);
    setSidebarOpen(false);
    setSection('explorer');
    if (history) {
      const url = new URL(window.location.href);
      url.searchParams.set('protocol', next.id);
      window.history.pushState({}, '', url);
    }
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  useEffect(() => {
    const pop = () => selectProtocol(initialProtocol(), false);
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [selectProtocol]);
  function navigate(next: Section) {
    setSection(next);
    setSidebarOpen(false);
    setPlaying(false);
    mainRef.current?.scrollTo({ top: 0 });
  }
  function finish() {
    clock.pause();
    clock.seek(1);
    setPlaying(false);
    setDone(true);
    complete(protocol.id);
  }
  const clock = usePlaybackClock({
    frameKey: `${protocol.id}:${frameIndex}`,
    playing,
    speed,
    onComplete: () => {
      if (frameIndex >= frames.length - 1) finish();
      else setFrameIndex((i) => i + 1);
    },
  });
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  function seekPacket(progress: number) {
    clock.pause();
    setPlaying(false);
    setDone(false);
    clock.seek(progress);
  }
  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (done || frameIndex < 0) {
      setFrameIndex(0);
      setDone(false);
    }
    setPlaying(true);
  }
  function reset() {
    clock.pause();
    clock.seek(0);
    setFrameIndex(-1);
    setPlaying(false);
    setDone(false);
  }
  function goStep(step: number) {
    clock.pause();
    clock.seek(0);
    setPlaying(false);
    if (step >= protocol.steps.length) {
      finish();
      return;
    }
    setDone(false);
    setFrameIndex(step < 0 ? -1 : frames.findIndex((f) => f.step === step));
  }
  function nextPacket() {
    setPlaying(false);
    if (frameIndex >= frames.length - 1) {
      finish();
      return;
    }
    setDone(false);
    setFrameIndex((i) => i + 1);
  }
  function inspect(packet: TracePacket) {
    setPlaying(false);
    setInspected(packet);
  }
  function focusSearch() {
    setSidebarOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  }
  function nextLesson() {
    selectProtocol(
      protocols[(protocols.findIndex((p) => p.id === protocol.id) + 1) % protocols.length],
    );
  }
  function exportTrace() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            protocol: protocol.name,
            description:
              'Educational simulation. Timings, sizes, and message content are illustrative.',
            devices: protocol.devices.map(({ id, label, address }) => ({ id, label, address })),
            packets: trace,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `${protocol.id}-lesson-trace.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Lesson trace exported');
  }
  useEffect(() => {
    function keydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!inspected && !help) focusSearch();
        return;
      }
      if (target.matches('input,textarea,select') || target.isContentEditable) return;
      if (inspected || help) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setHelp(true);
        setPlaying(false);
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        focusSearch();
        return;
      }
      if (e.key.toLowerCase() === 't') {
        setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
        return;
      }
      if (section !== 'explorer') return;
      // Keep native Space/Enter behavior when a button or link has focus.
      if (e.code === 'Space' && !target.closest('button,a')) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goStep(activeStep + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goStep(activeStep - 1);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        nextPacket();
      } else if (e.key.toLowerCase() === 'r') {
        reset();
      } else if (e.key.toLowerCase() === 'v') {
        setView((v) => (v === 'network' ? 'sequence' : 'network'));
      } else if (e.key === '[') {
        setSpeed((x) => speeds[clamp(speeds.indexOf(x) - 1, 0, speeds.length - 1)]);
      } else if (e.key === ']') {
        setSpeed((x) => speeds[clamp(speeds.indexOf(x) + 1, 0, speeds.length - 1)]);
      } else if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key) - 1;
        if (n < protocol.steps.length) goStep(n);
      }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar" inert={narrow && sidebarOpen}>
        <div className="brand-area">
          <button
            ref={menuRef}
            className="icon-button mobile-menu"
            aria-label="Open protocol library"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={21} />
          </button>
          <button
            className="brand"
            onClick={() => navigate('explorer')}
            aria-label="Protocol Explorer home"
          >
            <span className="brand-mark">
              <Hexagon size={31} strokeWidth={1.5} />
              <Network size={16} />
            </span>
            <span>
              protocol<span className="brand-light">explorer</span>
              <span className="brand-dot">.</span>
            </span>
          </button>
          <span className="version">LAB</span>
        </div>
        <nav className="top-nav" aria-label="Main navigation">
          <button
            className={section === 'explorer' ? 'active' : ''}
            onClick={() => navigate('explorer')}
          >
            <Compass size={16} />
            Explorer
          </button>
          <button className={section === 'path' ? 'active' : ''} onClick={() => navigate('path')}>
            <GraduationCap size={17} />
            Learning path
          </button>
          <button
            className={section === 'reference' ? 'active' : ''}
            onClick={() => navigate('reference')}
          >
            <BookOpen size={16} />
            Reference
          </button>
        </nav>
        <div className="header-actions">
          <span className="live-label">
            <i />
            Learn by doing
          </span>
          <button
            className="icon-button"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            onClick={() => {
              setHelp(true);
              setPlaying(false);
            }}
          >
            <Keyboard size={18} />
          </button>
          <button
            className="icon-button theme-button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title="Toggle theme (T)"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a
            className="github-link icon-button"
            href="https://github.com/kaan84k/Protocol-Explorer"
            target="_blank"
            rel="noreferrer"
            aria-label="View project on GitHub"
          >
            <Code2 size={19} />
          </a>
        </div>
      </header>
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close protocol library"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        inert={narrow && !sidebarOpen}
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Protocol library"
      >
        <div className="sidebar-title">
          <span>PROTOCOL LIBRARY</span>
          <span className="count-badge">{protocols.length}</span>
          <button
            className="icon-button sidebar-close"
            aria-label="Close protocol library"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <label className="search-field sidebar-search">
          <Search size={15} />
          <input
            ref={searchRef}
            type="search"
            placeholder="Find a protocol…"
            aria-label="Search protocols"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="category-filter">
          <ListFilter size={14} />
          <select
            aria-label="Filter protocol category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | 'All')}
          >
            <option value="All">All protocols</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>
        <div className="protocol-list">
          {categories.map((c) => {
            const matches = filtered.filter((p) => p.category === c);
            if (!matches.length) return null;
            return (
              <section key={c} className="protocol-group">
                <h2>
                  <span className={`status-dot color-${categoryColors[c]}`} />
                  {c === 'Web'
                    ? 'WEB COMMUNICATION'
                    : c === 'Transport'
                      ? 'TRANSPORT LAYER'
                      : c === 'Network'
                        ? 'NETWORK ESSENTIALS'
                        : c === 'Security'
                          ? 'SECURITY & TRUST'
                          : 'APPLICATIONS'}
                  <span>{matches.length}</span>
                </h2>
                {matches.map((p) => (
                  <button
                    key={p.id}
                    className={`protocol-item ${protocol.id === p.id && section === 'explorer' ? 'selected' : ''}`}
                    aria-current={
                      protocol.id === p.id && section === 'explorer' ? 'page' : undefined
                    }
                    onClick={() => selectProtocol(p)}
                  >
                    <span className={`protocol-glyph color-${p.color}`}>
                      {p.category === 'Web' ? (
                        <Globe2 size={17} />
                      ) : p.category === 'Transport' ? (
                        <Layers3 size={17} />
                      ) : p.category === 'Security' ? (
                        <LockKeyhole size={17} />
                      ) : p.category === 'Network' ? (
                        <Network size={17} />
                      ) : (
                        <Terminal size={17} />
                      )}
                    </span>
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.fullName}</small>
                    </span>
                    {progress.completed.includes(p.id) ? (
                      <Check className="completed-check" size={14} />
                    ) : (
                      <ChevronRight className="item-chevron" size={13} />
                    )}
                  </button>
                ))}
              </section>
            );
          })}
          {!filtered.length && (
            <div className="sidebar-empty">
              <Search size={22} />
              <strong>No matching protocols</strong>
              <p>Try a name like DNS, a category, or a lesson step.</p>
              <button
                className="text-button"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
        <button className="sidebar-progress" onClick={() => navigate('path')}>
          <div className="inline">
            <span className="progress-star">
              <GraduationCap size={20} />
            </span>
            <span>
              <strong>Your learning journey</strong>
              <small>
                {progress.completed.length} of {protocols.length} protocols explored
              </small>
            </span>
            <ArrowUpRight size={15} />
          </div>
          <div className="progress-track">
            <i style={{ width: `${completion}%` }} />
          </div>
          <span className="progress-caption">
            {completion === 100
              ? 'All lessons explored. Nicely done.'
              : 'Curiosity is a good place to start.'}
          </span>
        </button>
      </aside>
      <main
        ref={mainRef}
        inert={narrow && sidebarOpen}
        id="main-content"
        className="main-content"
        tabIndex={-1}
      >
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button
            onClick={() => navigate('explorer')}
            className={section === 'explorer' ? 'active' : ''}
          >
            Explorer
          </button>
          <button onClick={() => navigate('path')} className={section === 'path' ? 'active' : ''}>
            Learning path
          </button>
          <button
            onClick={() => navigate('reference')}
            className={section === 'reference' ? 'active' : ''}
          >
            Reference
          </button>
        </nav>
        {section === 'path' ? (
          <LearningPath progress={progress} onSelect={selectProtocol} />
        ) : section === 'reference' ? (
          <ReferenceView onSelect={selectProtocol} />
        ) : (
          <div className={`explorer-page ${expanded ? 'diagram-expanded' : ''}`}>
            <div className="breadcrumb">
              <span>EXPLORE</span>
              <ChevronRight size={12} />
              <span>{protocol.category.toUpperCase()}</span>
              <ChevronRight size={12} />
              <strong>{protocol.name}</strong>
            </div>
            <div className="lesson-heading">
              <div>
                <div className="title-line">
                  <h1>{protocol.name}</h1>
                  <span className={`layer-badge color-${protocol.color}`}>
                    LAYER {protocol.layer} · {layerName(protocol.layer).toUpperCase()}
                  </span>
                  {progress.completed.includes(protocol.id) && (
                    <span className="completed-label">
                      <Check size={13} /> Explored
                    </span>
                  )}
                </div>
                <p>
                  {protocol.fullName}
                  <span className="heading-separator">/</span>
                  <span className="heading-tagline">{protocol.tagline}</span>
                </p>
              </div>
              <div className="mode-control">
                <span>LEARNING MODE</span>
                <div className="segmented compact">
                  <button
                    className={!advanced ? 'active' : ''}
                    aria-pressed={!advanced}
                    onClick={() => setAdvanced(false)}
                  >
                    Guided
                  </button>
                  <button
                    className={advanced ? 'active' : ''}
                    aria-pressed={advanced}
                    onClick={() => setAdvanced(true)}
                  >
                    Advanced
                  </button>
                </div>
              </div>
            </div>
            <div className="workspace-grid">
              <section className="simulation panel" aria-label="Interactive simulation">
                <div className="simulation-head">
                  <div className="canvas-title">
                    <span className="live-dot" />
                    <h2>Inside the connection</h2>
                    <span className="simulation-tag">SIMULATION</span>
                  </div>
                  <button
                    className="icon-button expand-button"
                    aria-label={expanded ? 'Collapse diagram' : 'Expand diagram'}
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? <Shrink size={16} /> : <Expand size={16} />}
                  </button>
                </div>
                <div className="canvas-toolbar">
                  <div className="segmented view-tabs">
                    <button
                      className={view === 'network' ? 'active' : ''}
                      aria-pressed={view === 'network'}
                      onClick={() => setView('network')}
                    >
                      <Network size={14} />
                      Network
                    </button>
                    <button
                      className={view === 'sequence' ? 'active' : ''}
                      aria-pressed={view === 'sequence'}
                      onClick={() => setView('sequence')}
                    >
                      <Activity size={14} />
                      Sequence
                    </button>
                  </div>
                  <span className="canvas-state">
                    <span className={`state-dot ${playing ? 'running' : ''}`} />
                    {done
                      ? 'Complete'
                      : playing
                        ? 'Playing'
                        : frameIndex < 0
                          ? 'Ready to explore'
                          : 'Paused'}
                  </span>
                </div>
                <div className="canvas" aria-label="Packet visualization">
                  {view === 'network' ? (
                    <NetworkDiagram
                      key={protocol.id}
                      protocol={protocol}
                      packet={frame?.packet}
                      clock={clock}
                      reducedMotion={reducedMotion}
                      compact={phone}
                    />
                  ) : (
                    <SequenceDiagram
                      protocol={protocol}
                      packets={visiblePackets}
                      active={frame?.packet?.index ?? -1}
                      onInspect={inspect}
                    />
                  )}
                </div>
                <div className={`canvas-caption ${frame?.packet && !done ? 'has-journey' : ''}`}>
                  <span className="canvas-message">
                    {done ? <Check size={13} /> : <Radio size={13} />}
                    <span>
                      {done
                        ? 'Connection explored. Take the quick check to test your understanding.'
                        : frame?.packet
                          ? frame.packet.summary
                          : frameIndex < 0
                            ? 'Press play to follow a packet’s journey through the network.'
                            : protocol.steps[activeStep].title}
                    </span>
                  </span>
                  <span className="caption-shortcut">
                    Play / pause <kbd>Space</kbd>
                  </span>
                </div>
                {frame?.packet && !done && (
                  <JourneyReadout
                    protocol={protocol}
                    packet={frame.packet}
                    clock={clock}
                    compact={phone}
                    onSeek={seekPacket}
                  />
                )}
                <LessonPlaybackProgress
                  clock={clock}
                  index={frameIndex}
                  total={frames.length}
                  done={done}
                />
                <div className="playback">
                  <div className="playback-main">
                    <button
                      className="icon-button"
                      title="Previous step (←)"
                      aria-label="Previous step"
                      disabled={frameIndex < 0}
                      onClick={() => goStep(activeStep - 1)}
                    >
                      <ChevronLeft size={19} />
                    </button>
                    <button
                      className="play-button"
                      onClick={togglePlay}
                      aria-label={playing ? 'Pause lesson' : done ? 'Replay lesson' : 'Play lesson'}
                    >
                      {playing ? (
                        <Pause size={15} fill="currentColor" />
                      ) : done ? (
                        <RotateCcw size={15} />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                      <span>
                        {playing
                          ? 'Pause'
                          : done
                            ? 'Replay lesson'
                            : frameIndex < 0
                              ? 'Play lesson'
                              : 'Continue'}
                      </span>
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Next step"
                      title="Next step (→)"
                      disabled={done}
                      onClick={() => goStep(activeStep + 1)}
                    >
                      <ChevronRight size={19} />
                    </button>
                    <span className="controls-divider" />
                    <button
                      className="icon-button packet-step"
                      aria-label="Next packet"
                      title="One packet at a time (S)"
                      disabled={done}
                      onClick={nextPacket}
                    >
                      <SkipForward size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Reset lesson"
                      title="Reset lesson (R)"
                      disabled={frameIndex < 0}
                      onClick={reset}
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                  <div className="playback-right">
                    <span className="step-counter">
                      {done
                        ? 'ALL STEPS COMPLETE'
                        : activeStep < 0
                          ? `${protocol.steps.length} STEPS`
                          : `STEP ${activeStep + 1} / ${protocol.steps.length}`}
                    </span>
                    <label className="speed-control">
                      <span className="sr-only">Playback speed</span>
                      <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                        {speeds.map((s) => (
                          <option value={s} key={s}>
                            {s}×
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={11} />
                    </label>
                  </div>
                </div>
              </section>
              <LessonDetail
                key={protocol.id + (done ? '-complete' : '')}
                protocol={protocol}
                step={activeStep}
                done={done}
                advanced={advanced}
                onQuiz={() => complete(protocol.id, true)}
                quizPassed={progress.quizzes.includes(protocol.id)}
                onNext={nextLesson}
                packet={frame?.packet}
                onInspect={inspect}
              />
              <section className="journey panel" aria-label="Lesson steps">
                <div className="journey-title">
                  <span className="eyebrow">THE JOURNEY</span>
                  <span>{protocol.steps.length} steps to understanding</span>
                </div>
                <div className="journey-steps">
                  {protocol.steps.map((s, i) => (
                    <button
                      key={s.title}
                      className={`${activeStep === i && !done ? 'active' : ''} ${activeStep > i || done ? 'passed' : ''}`}
                      onClick={() => goStep(i)}
                      aria-label={`Go to step ${i + 1}: ${s.title}`}
                      aria-current={activeStep === i ? 'step' : undefined}
                    >
                      <span className="step-number">
                        {activeStep > i || done ? (
                          <Check size={13} />
                        ) : (
                          String(i + 1).padStart(2, '0')
                        )}
                      </span>
                      <span>{s.title}</span>
                      {i < protocol.steps.length - 1 && (
                        <ChevronRight className="journey-chevron" size={12} />
                      )}
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <section className="packet-log panel" aria-label="Packet flow">
              <div className="packet-log-head">
                <button
                  className="log-toggle"
                  aria-expanded={traceExpanded}
                  onClick={() => setTraceExpanded(!traceExpanded)}
                >
                  <Terminal size={17} />
                  <h2>Packet flow</h2>
                  <span className="count-badge">{visiblePackets.length}</span>
                  {traceExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <div className="packet-log-actions">
                  <span className="trace-label">
                    {frameIndex < 0 ? 'TRACE PREVIEW' : 'SIMULATED TRACE'}
                  </span>
                  <button className="text-button export-button" onClick={exportTrace}>
                    <ArrowDownToLine size={14} />
                    <span>Export</span>
                  </button>
                </div>
              </div>
              {traceExpanded && (
                <>
                  <div className={`packet-table-scroll ${advanced ? 'advanced' : ''}`}>
                    <table className="packet-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>
                            Time <span>(s)</span>
                          </th>
                          <th>Source</th>
                          <th>Destination</th>
                          <th>Protocol</th>
                          <th>Information</th>
                          {advanced && <th>Port</th>}
                          <th>Size</th>
                          <th>
                            <span className="sr-only">Inspect</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visiblePackets.map((p) => (
                          <tr
                            key={p.index}
                            className={`${p.index === frame?.packet?.index ? 'active-row' : ''} ${p.lost ? 'lost-row' : ''}`}
                          >
                            <td className="mono">{String(p.index + 1).padStart(2, '0')}</td>
                            <td className="mono muted">{p.time.toFixed(3)}</td>
                            <td>{protocol.devices.find((n) => n.id === p.from)?.label}</td>
                            <td>{protocol.devices.find((n) => n.id === p.to)?.label}</td>
                            <td>
                              <span
                                className="protocol-badge"
                                style={{ color: packetColor(p.protocol) }}
                              >
                                {p.protocol}
                              </span>
                            </td>
                            <td className="packet-info">
                              {p.encrypted && <LockKeyhole size={11} />}
                              <span title={p.label}>{friendlyPacketLabel(p)}</span>
                              {p.lost && <span className="lost-tag">LOST</span>}
                            </td>
                            {advanced && <td className="mono">{p.port ?? '—'}</td>}
                            <td className="mono muted">{p.bytes} B</td>
                            <td>
                              <button
                                className="inspect-button"
                                aria-label={`Inspect packet ${p.index + 1}`}
                                title="Inspect packet"
                                onClick={() => inspect(p)}
                              >
                                <ArrowUpRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!visiblePackets.length && (
                      <div className="packet-empty">
                        <Radio size={23} />
                        <p>No packets in this step yet. Keep following the lesson.</p>
                      </div>
                    )}
                  </div>
                  <div className="packet-log-foot">
                    <span>
                      <span className="tiny-dot" />
                      Illustrative traffic · Select a packet to look inside
                    </span>
                    <span>
                      {new Set(trace.map((p) => p.protocol)).size} protocols in this exchange
                    </span>
                  </div>
                </>
              )}
            </section>
            <footer className="page-footer">
              <span>
                Every connection has a story. <span className="mint">Keep exploring.</span>
              </span>
              <button
                className="text-button"
                onClick={() => {
                  setHelp(true);
                  setPlaying(false);
                }}
              >
                <CircleHelp size={14} />
                Shortcuts & help
              </button>
            </footer>
          </div>
        )}
      </main>
      {inspected && (
        <PacketInspector
          key={`${protocol.id}-${inspected.index}`}
          protocol={protocol}
          packet={inspected}
          trace={trace}
          onClose={() => setInspected(null)}
          onSelect={setInspected}
          advanced={advanced}
        />
      )}
      {help && (
        <Modal title="Make yourself at home" onClose={() => setHelp(false)}>
          <div className="help-body">
            <p>
              Pick a protocol, press play, and watch the conversation unfold. Jump to any step or
              open a packet for more detail.
            </p>
            <h3>
              <Keyboard size={17} /> Keyboard shortcuts
            </h3>
            <dl className="shortcuts">
              {[
                ['Play / pause', 'Space'],
                ['Next / previous step', '→ / ←'],
                ['One packet at a time', 'S'],
                ['Jump to a lesson step', '1–9'],
                ['Restart the lesson', 'R'],
                ['Switch network / sequence', 'V'],
                ['Slower / faster', '[ / ]'],
                ['Search protocols', '⌘ K / Ctrl K / /'],
                ['Toggle light / dark theme', 'T'],
                ['Zoom focused canvas', '+ / −'],
                ['Pan focused canvas', 'Arrow keys'],
                ['Fit focused canvas', '0'],
                ['Open this guide', '?'],
              ].map(([label, key]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    <kbd>{key}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="insight">
              <BookOpen size={18} />
              <p>
                <strong>A note about the lessons</strong>
                <br />
                These are simplified educational simulations. They do not capture network traffic.
                Addresses use private or documentation ranges. Progress is stored only in this
                browser.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
