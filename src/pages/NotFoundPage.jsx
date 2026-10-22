import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowLeft, Home, Radar } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ *
 *  CONFIG
 *  Real application routes for fuzzy-match signal suggestions.
 * ------------------------------------------------------------------ */
const KNOWN_ROUTES = [
  '/',
  '/subscriptions',
  '/breakdown',
  '/savings',
  '/settings',
  '/investments',
  '/notifications',
];

const CLICKS_TO_WARP = 5;
const GLYPHS = '!<>-_\\/[]{}=+*^?#01';

/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */
function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return 0;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

/** Decodes `text` from random glyphs. Bump `trigger` to replay. */
function useScramble(text, { duration = 900, trigger = 0 } = {}) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (reduce) {
      setOut(text);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const revealed = Math.floor(p * text.length);
      setOut(
        text
          .split('')
          .map((ch, i) =>
            ch === '/' || ch === ' ' || i < revealed
              ? ch
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          )
          .join('')
      );
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, trigger, reduce]);

  return out;
}

/* ------------------------------------------------------------------ *
 *  Starfield (canvas): parallax, twinkle, shooting stars,
 *  cursor glow and a warp-speed mode.
 * ------------------------------------------------------------------ */
function StarField({ mouse, warpRef, reduce }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    let raf = 0;
    let stars = [];
    const shooters = [];
    let warpSpeed = 0;
    let nextShooter = performance.now() + 1500;

    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(Math.round((w * h) / 5500), 320);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 0.9 + 0.1,
        tw: Math.random() * Math.PI * 2,
      }));
      if (reduce) draw(performance.now());
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const mx = mouse.current.x - 0.5;
      const my = mouse.current.y - 0.5;

      warpSpeed += ((warpRef.current ? 1 : 0) - warpSpeed) * 0.05;

      // cursor glow
      if (!reduce && warpSpeed < 0.1) {
        const g = ctx.createRadialGradient(
          mouse.current.x * w,
          mouse.current.y * h,
          0,
          mouse.current.x * w,
          mouse.current.y * h,
          180
        );
        g.addColorStop(0, 'rgba(208,188,255,0.12)');
        g.addColorStop(1, 'rgba(208,188,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // stars
      for (const s of stars) {
        if (warpSpeed > 0.02) {
          const vx = (s.x - cx) * 0.06 * warpSpeed * s.z;
          const vy = (s.y - cy) * 0.06 * warpSpeed * s.z;
          s.x += vx;
          s.y += vy;
          ctx.strokeStyle = `rgba(235,225,255,${0.35 + s.z * 0.65})`;
          ctx.lineWidth = s.z * 1.6;
          ctx.beginPath();
          ctx.moveTo(s.x - vx * 4, s.y - vy * 4);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
          if (s.x < 0 || s.x > w || s.y < 0 || s.y > h) {
            s.x = cx + (Math.random() - 0.5) * 60;
            s.y = cy + (Math.random() - 0.5) * 60;
          }
        } else {
          const px = s.x + mx * 40 * s.z;
          const py = s.y + my * 40 * s.z;
          const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 0.002 * s.z + s.tw));
          ctx.fillStyle = `rgba(230,220,255,${a * s.z})`;
          ctx.beginPath();
          ctx.arc(px, py, s.z * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // shooting stars
      if (!reduce && warpSpeed < 0.1) {
        if (t > nextShooter) {
          shooters.push({
            x: Math.random() * w * 0.8,
            y: Math.random() * h * 0.4,
            vx: 7 + Math.random() * 4,
            vy: 2.5 + Math.random() * 2,
            life: 1,
          });
          nextShooter = t + 2500 + Math.random() * 3500;
        }
        for (let i = shooters.length - 1; i >= 0; i--) {
          const s = shooters[i];
          s.x += s.vx;
          s.y += s.vy;
          s.life -= 0.018;
          if (s.life <= 0) {
            shooters.splice(i, 1);
            continue;
          }
          const g = ctx.createLinearGradient(s.x - s.vx * 9, s.y - s.vy * 9, s.x, s.y);
          g.addColorStop(0, 'rgba(208,188,255,0)');
          g.addColorStop(1, `rgba(245,240,255,${s.life})`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(s.x - s.vx * 9, s.y - s.vy * 9);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
        }
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    if (!reduce) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mouse, warpRef, reduce]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
}

/* ------------------------------------------------------------------ *
 *  The "0" — a lost compass. Needle chases the cursor with a springy
 *  wobble, wanders when idle, and locks on when you hover Dashboard.
 *  Click it 5 times… something happens.
 * ------------------------------------------------------------------ */
function LostCompass({ angle, found, clicks, onClick, compassRef, controls }) {
  const ticks = Array.from({ length: 36 });

  return (
    <motion.div animate={controls} className="relative">
      <button
        ref={compassRef}
        type="button"
        onClick={onClick}
        aria-label="Lost compass. Click it a few times."
        className="relative block w-24 h-24 sm:w-32 sm:h-32 rounded-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
      >
        {/* pulsing halo */}
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: found ? 'var(--tertiary)' : 'var(--primary)' }}
          animate={{ scale: [1, 1.35], opacity: [0.28, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
        />

        {/* slowly rotating dial */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        >
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="rgba(208,188,255,0.06)"
              stroke="var(--primary)"
              strokeOpacity="0.55"
              strokeWidth="2"
            />
            {ticks.map((_, i) => {
              const a = (i * 10 * Math.PI) / 180;
              const long = i % 9 === 0;
              const r1 = 54;
              const r2 = long ? 44 : 49;
              return (
                <line
                  key={i}
                  x1={60 + Math.sin(a) * r1}
                  y1={60 - Math.cos(a) * r1}
                  x2={60 + Math.sin(a) * r2}
                  y2={60 - Math.cos(a) * r2}
                  stroke="var(--primary)"
                  strokeOpacity={long ? 0.9 : 0.4}
                  strokeWidth={long ? 2 : 1}
                />
              );
            })}
            <text x="60" y="35" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--primary)">
              N
            </text>
          </svg>
        </motion.div>

        {/* orbiting dot */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
        >
          <span className="absolute top-0 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--secondary)] shadow-[0_0_10px_var(--secondary)]" />
        </motion.div>

        {/* needle */}
        <motion.div className="absolute inset-0" style={{ rotate: angle }}>
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <polygon
              points="60,16 67,60 53,60"
              style={{ fill: found ? 'var(--tertiary)' : 'var(--primary)', transition: 'fill 0.3s' }}
            />
            <polygon points="60,104 67,60 53,60" fill="rgba(255,255,255,0.22)" />
            <circle cx="60" cy="60" r="4.5" fill="var(--on-surface)" />
          </svg>
        </motion.div>
      </button>

      {/* click progress pips */}
      <div className="flex justify-center gap-1.5 mt-3 h-1.5" aria-hidden="true">
        {Array.from({ length: CLICKS_TO_WARP }).map((_, i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            animate={{
              backgroundColor: i < clicks ? 'var(--tertiary)' : 'rgba(255,255,255,0.15)',
              scale: i < clicks ? 1.3 : 1,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* A digit with a periodic RGB-split glitch */
function GlitchDigit({ children, delay = 0 }) {
  const ghost = 'absolute inset-0 select-none pointer-events-none mix-blend-screen';
  return (
    <motion.span
      initial={{ opacity: 0, y: 40, scale: 0.6, rotateX: -60 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 14, delay }}
      className="relative inline-block text-7xl sm:text-8xl font-black font-mono leading-none"
    >
      <span className="bg-gradient-to-b from-[var(--primary)] to-[var(--tertiary)] bg-clip-text text-transparent">
        {children}
      </span>
      <motion.span
        aria-hidden="true"
        className={`${ghost} text-[var(--secondary)]`}
        animate={{ x: [0, -4, 3, 0], opacity: [0, 0.8, 0.8, 0] }}
        transition={{ duration: 0.28, repeat: Infinity, repeatDelay: 3.5 + delay * 4 }}
      >
        {children}
      </motion.span>
      <motion.span
        aria-hidden="true"
        className={`${ghost} text-[var(--tertiary)]`}
        animate={{ x: [0, 4, -3, 0], opacity: [0, 0.8, 0.8, 0] }}
        transition={{ duration: 0.28, repeat: Infinity, repeatDelay: 3.5 + delay * 4 }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

/* ------------------------------------------------------------------ *
 *  Page
 * ------------------------------------------------------------------ */
export default function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const wrapRef = useRef(null);
  const compassRef = useRef(null);
  const homeRef = useRef(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const lastMove = useRef(Date.now());
  const warpRef = useRef(false);
  const timeoutRef = useRef(null);

  const [found, setFound] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [warping, setWarping] = useState(false);
  const [scrambleKey, setScrambleKey] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const controls = useAnimationControls();

  // needle angle (spring gives the overshoot/wobble)
  const angleMV = useMotionValue(0);
  const angle = useSpring(angleMV, { stiffness: 70, damping: 8, mass: 0.8 });

  // card tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 80, damping: 18 });
  const smy = useSpring(my, { stiffness: 80, damping: 18 });
  const rotateY = useTransform(smx, [-0.5, 0.5], [-6, 6]);
  const rotateX = useTransform(smy, [-0.5, 0.5], [6, -6]);

  const path = location.pathname || '/';
  const scrambledPath = useScramble(path, { trigger: scrambleKey });

  const suggestions = useMemo(
    () =>
      KNOWN_ROUTES.filter((r) => r !== '/')
        .map((route) => ({ route, score: similarity(path, route) }))
        .filter((s) => s.score > 0.35)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [path]
  );

  const aimAt = useCallback(
    (x, y) => {
      if (!compassRef.current) return;
      const r = compassRef.current.getBoundingClientRect();
      const deg =
        (Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) * 180) / Math.PI + 90;
      const cur = angleMV.get();
      const d = ((deg - cur + 540) % 360) - 180; // shortest way round
      angleMV.set(cur + d);
    },
    [angleMV]
  );

  const handlePointerMove = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    mouse.current = { x: nx, y: ny };
    mx.set(nx - 0.5);
    my.set(ny - 0.5);
    lastMove.current = Date.now();
    if (!found) aimAt(e.clientX, e.clientY);
  };

  const lockOnHome = () => {
    setFound(true);
    if (homeRef.current) {
      const r = homeRef.current.getBoundingClientRect();
      aimAt(r.left + r.width / 2, r.top + r.height / 2);
    }
  };

  // idle: the needle wanders because it's lost
  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => {
      if (!found && Date.now() - lastMove.current > 2000) {
        angleMV.set(angleMV.get() + (Math.random() - 0.5) * 260);
      }
    }, 1600);
    return () => clearInterval(id);
  }, [found, reduce, angleMV]);

  // hint after a few seconds of nothing
  useEffect(() => {
    const id = setTimeout(() => setShowHint(true), 7000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleCompassClick = () => {
    if (warping) return;
    const next = clicks + 1;
    setClicks(next);
    setShowHint(false);
    controls.start({ rotate: [0, -10, 10, -5, 0], transition: { duration: 0.4 } });
    angleMV.set(angleMV.get() + 180 + Math.random() * 180);

    if (next >= CLICKS_TO_WARP) {
      setWarping(true);
      warpRef.current = true;
      timeoutRef.current = setTimeout(() => navigate('/'), reduce ? 300 : 1300);
    }
  };

  const lines = [
    { text: 'scanning route table…', tone: 'dim', delay: 0.9 },
    { text: `0 matches for ${path}`, tone: 'warn', delay: 1.7 },
    suggestions[0]
      ? { text: `nearest signal: ${suggestions[0].route}`, tone: 'ok', delay: 2.5 }
      : { text: 'no known signal nearby', tone: 'dim', delay: 2.5 },
  ];
  const toneClass = {
    dim: 'text-slate-400',
    warn: 'text-[var(--secondary)]',
    ok: 'text-[var(--tertiary)]',
  };

  return (
    <div
      ref={wrapRef}
      onPointerMove={handlePointerMove}
      className="relative min-h-[70vh] flex flex-col items-center justify-center px-4 py-8 overflow-hidden"
    >
      <StarField mouse={mouse} warpRef={warpRef} reduce={reduce} />

      {/* drifting ambient glows */}
      <motion.div
        className="absolute top-10 right-[10%] w-64 h-64 bg-[var(--primary)]/15 rounded-full blur-3xl pointer-events-none"
        animate={reduce ? undefined : { x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-10 left-[10%] w-64 h-64 bg-[var(--secondary)]/15 rounded-full blur-3xl pointer-events-none"
        animate={reduce ? undefined : { x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={
          warping && !reduce
            ? { opacity: 0, scale: 1.8, y: 0, filter: 'blur(8px)' }
            : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
        }
        transition={warping ? { duration: 1, ease: 'easeIn' } : { duration: 0.5, ease: 'easeOut' }}
        style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
        className="glass-card relative z-10 max-w-md w-full p-8 text-center flex flex-col items-center overflow-hidden rounded-3xl border border-[var(--outline-variant)]/60 shadow-2xl"
      >
        {/* 4 [compass] 4 */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-5">
          <GlitchDigit delay={0.1}>4</GlitchDigit>
          <LostCompass
            angle={angle}
            found={found}
            clicks={clicks}
            onClick={handleCompassClick}
            compassRef={compassRef}
            controls={controls}
          />
          <GlitchDigit delay={0.3}>4</GlitchDigit>
        </div>

        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-xs uppercase font-mono tracking-widest px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 font-bold mb-3"
        >
          {found ? 'Signal found' : 'Signal lost'}
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-headline-md font-bold text-[var(--on-surface)] mb-2"
        >
          Page Not Found
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-body-md text-[var(--on-surface-variant)] mb-4 max-w-xs"
        >
          This route drifted out of orbit. The compass is as confused as you are.
        </motion.p>

        {/* click to re-scramble the broken path */}
        <motion.button
          type="button"
          onClick={() => setScrambleKey((k) => k + 1)}
          title="Click to re-decode"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-xs font-mono text-slate-300 mb-4 max-w-full truncate cursor-pointer hover:border-[var(--primary)]/40 transition-colors"
        >
          {scrambledPath}
        </motion.button>

        {/* terminal readout */}
        <div className="w-full text-left rounded-xl bg-black/30 border border-white/10 px-4 py-3 mb-5 font-mono text-xs">
          <ul className="space-y-1">
            {lines.map((l, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: l.delay, duration: 0.3 }}
                className={`flex items-center gap-2 ${toneClass[l.tone]}`}
              >
                {i === 0 ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    className="inline-flex"
                  >
                    <Radar size={12} />
                  </motion.span>
                ) : (
                  <span aria-hidden="true">&gt;</span>
                )}
                <span className="truncate">{l.text}</span>
              </motion.li>
            ))}
            <motion.li
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ delay: 3, duration: 1, repeat: Infinity }}
              className="text-[var(--primary)]"
              aria-hidden="true"
            >
              &gt; _
            </motion.li>
          </ul>
        </div>

        {/* did you mean */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.7 }}
            className="flex flex-wrap items-center justify-center gap-2 mb-5"
          >
            <span className="text-xs text-[var(--on-surface-variant)]">Did you mean</span>
            {suggestions.map((s) => (
              <Link
                key={s.route}
                to={s.route}
                className="text-xs font-mono px-2.5 py-1 rounded-full border border-[var(--tertiary)]/40 text-[var(--tertiary)] bg-[var(--tertiary)]/10 hover:bg-[var(--tertiary)]/20 transition-colors"
              >
                {s.route} · {Math.round(s.score * 100)}%
              </Link>
            ))}
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            ref={homeRef}
            to="/"
            onPointerEnter={lockOnHome}
            onPointerLeave={() => setFound(false)}
            onFocus={lockOnHome}
            onBlur={() => setFound(false)}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--tertiary)] text-[var(--on-primary)] text-label-md font-semibold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(208,188,255,0.3)] hover:opacity-95 transition-opacity"
          >
            <Home size={18} />
            <span>Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[var(--on-surface)] text-label-md font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </button>
        </div>

        {/* easter-egg hint */}
        <div className="h-5 mt-4">
          <AnimatePresence>
            {showHint && clicks === 0 && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.7, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[11px] font-mono text-[var(--on-surface-variant)]"
              >
                psst… the compass is clickable.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* warp flash */}
      <AnimatePresence>
        {warping && (
          <motion.div
            className="absolute inset-0 z-20 bg-[var(--primary)] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.9] }}
            transition={{ duration: 1.2, times: [0, 0.6, 1] }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
