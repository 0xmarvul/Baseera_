import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import './ExtensionDemo.css';

const TARGETS = [
  { host: 'example.com', c: 2, h: 2, m: 1, l: 1 },
  { host: 'acme-shop.io', c: 1, h: 3, m: 2, l: 1 },
  { host: 'my-startup.co', c: 3, h: 1, m: 1, l: 2 },
  { host: 'dashboard.app', c: 0, h: 2, m: 2, l: 1 },
];
const RC = 201.06, GC = 213.6;
const riskOf = (t) => Math.min(100, t.c * 25 + t.h * 15 + t.m * 8 + t.l * 3);
const colorFor = (r) => (r >= 70 ? ['#FF5C6B', 'Critical risk'] : r >= 40 ? ['#FF9840', 'High risk'] : r >= 20 ? ['#FFD60A', 'Elevated risk'] : ['#00D4FF', 'Low risk']);

/**
 * "Baseera running in Chrome" hero demo. Cycles idle -> scanning -> results
 * across sample sites. `authed` picks the results ending: guest sees a locked
 * findings teaser (sign-up funnel); a member sees "saved to your dashboard".
 */
export default function ExtensionDemo({ authed = false }) {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = (s) => el.querySelector(s);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const idle = q('[data-state="idle"]'), scan = q('[data-state="scan"]'), res = q('[data-state="results"]');
    const checks = [...el.querySelectorAll('[data-state="scan"] .xck')];
    let ti = 0, timers = [];
    const wait = (f, m) => timers.push(setTimeout(f, m));
    const clr = () => { timers.forEach(clearTimeout); timers = []; };
    const show = (e) => [idle, scan, res].forEach((s) => { s.hidden = s !== e; });
    const hx = (c, a) => c + a;

    const setTarget = (t) => { const u = 'https://' + t.host; q('.js-omni').textContent = u; q('.js-url').textContent = u; q('.js-tab').textContent = t.host; };
    const ring = (pct) => { q('.xring .arc').style.strokeDashoffset = RC * (1 - pct / 100); q('.js-ringpct').textContent = pct + '%'; };
    const countUp = (node, to) => { if (reduce || to <= 0) { node.textContent = to; return; } let n = 0; const s = () => { n++; node.textContent = n; if (n < to) wait(s, 90); }; wait(s, 110); };
    const results = (t) => {
      const r = riskOf(t), [col, lbl] = colorFor(r);
      const arc = q('.xgauge .arc'); arc.setAttribute('stroke', col); q('.js-gnum').style.color = col;
      const tag = q('.js-tag'); tag.textContent = lbl; tag.style.color = col; tag.style.background = hx(col, '1f'); tag.style.borderColor = hx(col, '4d');
      arc.style.transition = 'none'; arc.style.strokeDashoffset = GC;
      requestAnimationFrame(() => { arc.style.transition = 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)'; arc.style.strokeDashoffset = GC * (1 - r / 100); });
      countUp(q('.js-gnum'), r);
      countUp(q('.js-nc'), t.c); countUp(q('.js-nh'), t.h); countUp(q('.js-nm'), t.m); countUp(q('.js-nl'), t.l);
      const ln = q('.js-lockn'); if (ln) ln.textContent = (t.c + t.h + t.m + t.l) + ' findings on this page';
    };
    const cycle = () => {
      clr(); const t = TARGETS[ti]; setTarget(t);
      checks.forEach((c) => (c.className = 'xck')); ring(0);
      ['.js-nc', '.js-nh', '.js-nm', '.js-nl'].forEach((s) => (q(s).textContent = '0')); q('.js-gnum').textContent = '0';
      show(idle);
      if (reduce) { show(res); results(t); return; }
      wait(() => {
        show(scan);
        checks.forEach((it, i) => {
          wait(() => { checks.forEach((x, j) => { if (j < i) x.className = 'xck done'; }); it.className = 'xck active'; ring(i * 20); }, 520 * i + 300);
          wait(() => { it.className = 'xck done'; ring((i + 1) * 20); }, 520 * i + 820);
        });
        wait(() => { show(res); results(t); }, 520 * checks.length + 700);
        wait(() => { ti = (ti + 1) % TARGETS.length; cycle(); }, 520 * checks.length + 5400);
      }, 1400);
    };
    cycle();
    return clr;
  }, []);

  return (
    <div className="browser-wrap" ref={root}>
      <div className="browser">
        <div className="br-tabs">
          <div className="br-dots"><span className="br-dot r"></span><span className="br-dot a"></span><span className="br-dot g"></span></div>
          <div className="br-tab active"><span className="fav"></span><span className="js-tab">example.com</span></div>
          <div className="br-tab dim">New Tab</div>
        </div>
        <div className="br-omni">
          <div className="br-nav">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </div>
          <div className="omni">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            <span className="js-omni">https://example.com</span>
          </div>
          <div className="br-tools">
            <span className="puzzle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.2 2.2 0 1 1 0 4.4H2V19a2 2 0 0 0 2 2h3.8v-1.5a2.2 2.2 0 1 1 4.4 0V21H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z" /></svg></span>
            <span className="ext-pin"><Logo size={18} pupil="#0B1524" /></span>
          </div>
        </div>
        <div className="br-body">
          <div className="skel">
            <div className="bar w1"></div><div className="bar w2"></div><div className="bar w3"></div><div className="bar w4"></div>
            <div className="grid2"><div className="box"></div><div className="box"></div><div className="box"></div><div className="box"></div></div>
          </div>

          <div className="xpop">
            <div className="xhead">
              <div className="xbrand"><Logo size={21} pupil="#0A1220" /><b>Baseera</b></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                {authed
                  ? <span className="xbadge signed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Signed in</span>
                  : <span className="xbadge">Guest</span>}
                <span className="xgear"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /></svg></span>
              </div>
            </div>
            <div className="xurl"><div className="xurl-card"><div className="xurl-l">Current page</div><div className="xurl-r"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg><span className="u js-url">https://example.com</span></div></div></div>

            {/* idle */}
            <div className="xstate" data-state="idle">
              <div className="xctr">
                <div className="xmark"><Logo size={50} pupil="#0A1220" /></div>
                <p className="xtitle">Ready to scan</p>
                <p className="xsub">Run 31 passive checks on this page. Nothing is sent, nothing is changed.</p>
              </div>
              <button className="xbtn"><svg viewBox="0 0 24 24" fill="none" stroke="#04121A" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>Start Scan</button>
              <Link className="xlink" to="/bugs">Open your dashboard<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg></Link>
              <div className="xstatus"><i></i>No active scan</div>
            </div>

            {/* scanning */}
            <div className="xstate" data-state="scan" hidden>
              <div className="xctr">
                <div className="xring">
                  <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="32" fill="none" stroke="#16273f" strokeWidth="7" /><circle className="arc" cx="40" cy="40" r="32" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray="201.06" strokeDashoffset="201.06" /></svg>
                  <div className="v"><b className="js-ringpct">0%</b><span>scanning</span></div>
                </div>
                <p className="xtitle" style={{ marginTop: '12px' }}>Scanning this page</p>
                <p className="xsub">Analyzing DOM, scripts and security headers</p>
              </div>
              <div className="xchecks">
                <div className="xck"><span className="xci"></span>SSL certificate</div>
                <div className="xck"><span className="xci"></span>Scripts and resources</div>
                <div className="xck"><span className="xci"></span>Detecting vulnerabilities</div>
                <div className="xck"><span className="xci"></span>Security headers</div>
                <div className="xck"><span className="xci"></span>Known exploits</div>
              </div>
              <div className="xstatus"><i className="on"></i>Scan in progress</div>
            </div>

            {/* results */}
            <div className="xstate" data-state="results" hidden>
              <div className="xctr">
                <div className="xgauge">
                  <svg width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="34" fill="none" stroke="#16273f" strokeWidth="8" /><circle className="arc" cx="48" cy="48" r="34" fill="none" stroke="#FF9840" strokeWidth="8" strokeLinecap="round" strokeDasharray="213.6" strokeDashoffset="213.6" /></svg>
                  <div className="v"><b className="js-gnum">0</b><small>/ 100 risk</small></div>
                </div>
                <span className="xtag js-tag">High risk</span>
              </div>
              <div className="xchips">
                <div className="xchip c"><b className="js-nc">0</b><span>Crit</span></div>
                <div className="xchip h"><b className="js-nh">0</b><span>High</span></div>
                <div className="xchip m"><b className="js-nm">0</b><span>Med</span></div>
                <div className="xchip l"><b className="js-nl">0</b><span>Low</span></div>
              </div>

              {authed ? (
                <>
                  <div className="xsaved">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Scan saved to your dashboard
                  </div>
                  <div className="xbtns">
                    <Link className="xbtn" to="/bugs">View findings on dashboard<svg viewBox="0 0 24 24" fill="none" stroke="#04121A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
                    <button className="xbtn ghost"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>Rescan</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="xlock">
                    <div className="xlock-blur">
                      <div className="xlrow"><span className="xlb c"></span><span className="xlbar w2"></span></div>
                      <div className="xlrow"><span className="xlb c"></span><span className="xlbar w1"></span></div>
                      <div className="xlrow"><span className="xlb h"></span><span className="xlbar w3"></span></div>
                      <div className="xlrow"><span className="xlb h"></span><span className="xlbar w4"></span></div>
                    </div>
                    <div className="xlover">
                      <div className="lk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></div>
                      <b className="js-lockn">6 findings on this page</b>
                      <span>Sign up to see what they are and how to fix them</span>
                    </div>
                  </div>
                  <div className="xbtns">
                    <Link className="xbtn" to="/register">Sign up to view findings<svg viewBox="0 0 24 24" fill="none" stroke="#04121A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
                    <Link className="xbtn ghost" to="/login">Already have an account? Sign in</Link>
                  </div>
                </>
              )}
            </div>

            <div className="xfoot"><Link to="/bugs">Open Dashboard</Link><span className="fb">100% client-side · nothing leaves your browser</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
