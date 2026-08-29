import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import DashboardLayout from "../components/DashboardLayout";
import apiClient from "../api/axios.config";
import { showToast } from "../components/Toast";
import { WEBSTORE_LINK_PROPS } from "../utils/extensionLink";
import "../dashboard.css";

const hostOf = (url) => { try { return new URL(url).hostname; } catch { return url || 'unknown'; } };
const relTime = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return 'just now';
};
const worstClass = (s) => (s.criticalCount > 0 ? 'c' : s.highCount > 0 ? 'h' : s.mediumCount > 0 ? 'm' : s.lowCount > 0 ? 'l' : 'n');
const riskInfo = (r) => (r >= 70 ? ['c', 'Critical risk'] : r >= 40 ? ['h', 'High risk'] : r >= 20 ? ['m', 'Medium risk'] : ['l', 'Low risk']);
const sevClass = (sev) => ({ critical: 'c', high: 'h', medium: 'm', low: 'l' }[(sev || '').toLowerCase()] || 'l');

function Bugs() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState(null);
  const [expandedScanId, setExpandedScanId] = useState(null);
  const [scanVulnerabilities, setScanVulnerabilities] = useState({});
  const [loadingVulns, setLoadingVulns] = useState(null);
  const [timelineRange, setTimelineRange] = useState(30);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [animGauge, setAnimGauge] = useState(false);

  const totalCritical = scans.reduce((s, x) => s + (x.criticalCount || 0), 0);
  const totalHigh = scans.reduce((s, x) => s + (x.highCount || 0), 0);
  const totalMedium = scans.reduce((s, x) => s + (x.mediumCount || 0), 0);
  const totalLow = scans.reduce((s, x) => s + (x.lowCount || 0), 0);
  const totalVulns = scans.reduce((s, x) => s + (x.totalVulns || 0), 0);
  const riskScore = totalVulns > 0 ? Math.min(100, totalCritical * 25 + totalHigh * 15 + totalMedium * 8 + totalLow * 3) : 0;
  const securityScore = 100 - riskScore;
  const securityLabel = securityScore >= 80 ? 'Excellent posture' : securityScore >= 60 ? 'Good posture' : securityScore >= 40 ? 'Needs attention' : 'At risk';
  const scoreColor = securityScore >= 70 ? '#00D9A5' : securityScore >= 40 ? '#FFD60A' : '#FF5C6B';

  // sites grouping
  const sitesMap = {};
  scans.forEach((s) => {
    const h = hostOf(s.targetURL);
    const e = sitesMap[h] || (sitesMap[h] = { host: h, count: 0, c: 0, h2: 0, m: 0, l: 0, last: null });
    e.count++; e.c += s.criticalCount || 0; e.h2 += s.highCount || 0; e.m += s.mediumCount || 0; e.l += s.lowCount || 0;
    const t = s.createdAt ? new Date(s.createdAt) : null;
    if (t && (!e.last || t > e.last)) e.last = t;
  });
  const sites = Object.values(sitesMap).sort((a, b) => (b.c * 25 + b.h2 * 15 + b.m * 8 + b.l * 3) - (a.c * 25 + a.h2 * 15 + a.m * 8 + a.l * 3));

  // timeline buckets
  const B = 12;
  const span = timelineRange * 86400000;
  const start = Date.now() - span;
  const buckets = Array.from({ length: B }, () => 0);
  scans.forEach((s) => {
    if (!s.createdAt) return;
    const t = new Date(s.createdAt).getTime();
    if (t < start) return;
    const idx = Math.min(B - 1, Math.floor((t - start) / (span / B)));
    buckets[idx] += (s.totalVulns || 0);
  });
  const maxBar = Math.max(1, ...buckets);

  // donut
  const donutC = 364.4;
  const donutSegs = [
    { cls: 'crit', color: '#FF5C6B', v: totalCritical },
    { cls: 'high', color: '#FF9840', v: totalHigh },
    { cls: 'med', color: '#FFD60A', v: totalMedium },
    { cls: 'low', color: '#00D4FF', v: totalLow },
  ];
  let cum = 0;
  const donutRendered = donutSegs.map((s) => {
    const len = totalVulns > 0 ? (s.v / totalVulns) * donutC : 0;
    const seg = { ...s, len, offset: -cum };
    cum += len; return seg;
  });

  const filteredScans = scans.filter((s) => {
    if (siteFilter && hostOf(s.targetURL) !== siteFilter) return false;
    if (searchQuery && !(s.targetURL || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (severityFilter === 'all') return true;
    return (s[severityFilter + 'Count'] || 0) > 0;
  });

  useEffect(() => {
    apiClient.get('/scans')
      .then((res) => {
        if (res.success && res.data) {
          const loaded = Array.isArray(res.data) ? res.data : [];
          setScans(loaded);
          loaded.slice(0, 5).forEach((scan) => {
            apiClient.get(`/scans/${scan.id}/vulnerabilities`)
              .then((vRes) => { if (vRes.success && vRes.data) setScanVulnerabilities((p) => ({ ...p, [scan.id]: vRes.data })); })
              .catch(() => {});
          });
        }
      })
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setAnimGauge(false); const t = setTimeout(() => setAnimGauge(true), 120); return () => clearTimeout(t); }, [securityScore, loading]);

  const toggleScanExpand = async (scanId) => {
    if (expandedScanId === scanId) { setExpandedScanId(null); return; }
    setExpandedScanId(scanId);
    if (!scanVulnerabilities[scanId]) {
      setLoadingVulns(scanId);
      try {
        const res = await apiClient.get(`/scans/${scanId}/vulnerabilities`);
        if (res.success && res.data) setScanVulnerabilities((p) => ({ ...p, [scanId]: res.data }));
      } catch (err) { console.error('Failed to load vulnerabilities:', err); }
      finally { setLoadingVulns(null); }
    }
  };

  const buildReportHtml = async ({ forPrint }) => {
    const allVulns = { ...scanVulnerabilities };
    for (const scan of scans) {
      if (!allVulns[scan.id]) {
        try { const res = await apiClient.get(`/scans/${scan.id}/vulnerabilities`); if (res.success && res.data) allVulns[scan.id] = res.data; }
        catch (err) { console.error('Failed to fetch vulnerabilities for scan', scan.id, err); }
      }
    }
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const sevColor = (sev) => {
      const k = (sev || '').toLowerCase();
      if (k === 'critical') return { bg: 'rgba(255,92,107,0.16)', text: '#FF5C6B', border: 'rgba(255,92,107,0.4)' };
      if (k === 'high') return { bg: 'rgba(255,152,64,0.16)', text: '#FF9840', border: 'rgba(255,152,64,0.4)' };
      if (k === 'medium') return { bg: 'rgba(255,214,10,0.14)', text: '#FFD60A', border: 'rgba(255,214,10,0.4)' };
      return { bg: 'rgba(0,212,255,0.14)', text: '#00D4FF', border: 'rgba(0,212,255,0.4)' };
    };
    const scanSections = scans.map((scan) => {
      const vulns = allVulns[scan.id] || [];
      if (vulns.length === 0) return '';
      let hostname = scan.targetURL || '';
      try { hostname = new URL(scan.targetURL).hostname; } catch {}
      const scanDate = scan.createdAt ? new Date(scan.createdAt).toLocaleDateString() : '';
      const rows = vulns.map((v) => {
        const c = sevColor(v.severity);
        return `<div class="finding"><div class="finding-head"><span class="sev-badge" style="background:${c.bg};color:${c.text};border:1px solid ${c.border}">${esc(v.severity || 'Unknown')}</span><span class="finding-type">${esc(v.type || 'Unknown')}</span></div>${v.description ? `<p class="finding-desc">${esc(v.description)}</p>` : ''}${v.location ? `<div class="finding-row"><span class="finding-label">Location</span><span class="finding-value mono">${esc(v.location)}</span></div>` : ''}${v.recommendation ? `<div class="finding-row"><span class="finding-label">Fix</span><span class="finding-value">${esc(v.recommendation)}</span></div>` : ''}</div>`;
      }).join('');
      return `<section class="scan-block"><div class="scan-head"><h2 class="scan-host">${esc(hostname)}</h2><span class="scan-date">${esc(scanDate)} · ${vulns.length} finding${vulns.length === 1 ? '' : 's'}</span></div><div class="findings">${rows}</div></section>`;
    }).join('');
    const emptyState = scans.length === 0 || scanSections.trim() === '' ? `<div class="empty-state"><p class="empty-title">No vulnerabilities recorded.</p><p class="empty-sub">Install the Baseera extension and scan your first website.</p></div>` : '';
    const printStyles = forPrint ? `@page{margin:18mm 14mm;}@media print{body{background:#fff!important;color:#0a1929!important;}.report-shell{background:#fff!important;}.hero,.summary-card,.finding,.scan-head{background:#fff!important;border-color:#d6dde6!important;box-shadow:none!important;}.hero-title,.summary-number,.scan-host,.finding-type{color:#0a1929!important;}.hero-sub,.summary-label,.scan-date,.finding-desc,.finding-label,.finding-value{color:#475569!important;}.sev-badge{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.scan-block,.finding{page-break-inside:avoid;}}` : '';
    return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Baseera Security Report · ${esc(dateStr)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&display=swap"><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:'Inter',sans-serif;background:#060D18;color:#EAF1FA;line-height:1.55}.report-shell{max-width:920px;margin:0 auto;padding:48px 28px 80px}.hero{background:linear-gradient(135deg,#0e1d33,#0a1526);border:1px solid #1b2c45;border-radius:18px;padding:36px;position:relative;overflow:hidden}.hero::before{content:"";position:absolute;top:-80px;right:-80px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(0,217,165,.18),transparent 65%)}.hero-brand{display:flex;align-items:center;gap:12px;margin-bottom:18px}.hero-logo{width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,#00E6B0,#00B4D8);display:flex;align-items:center;justify-content:center;color:#04121A;font-weight:800;font-family:'Space Grotesk'}.hero-brand-name{color:#fff;font-weight:700;font-size:17px}.hero-title{font-family:'Space Grotesk';color:#f1f5f9;font-size:28px;font-weight:700;margin:6px 0 8px}.hero-sub{color:#8FA1B8;font-size:14px;margin:0}.summary{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin:28px 0}.summary-card{background:#0e1d33;border:1px solid #1b2c45;border-radius:12px;padding:16px 12px;text-align:center}.summary-card.total{background:linear-gradient(135deg,rgba(0,217,165,.1),rgba(0,180,216,.1));border-color:rgba(0,217,165,.35)}.summary-number{font-family:'Space Grotesk';font-size:24px;font-weight:700;margin:0;color:#f1f5f9}.summary-card.total .summary-number{background:linear-gradient(135deg,#00E6B0,#00B4D8);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}.summary-card.critical .summary-number{color:#FF5C6B}.summary-card.high .summary-number{color:#FF9840}.summary-card.medium .summary-number{color:#FFD60A}.summary-card.low .summary-number{color:#00D4FF}.summary-label{color:#8FA1B8;font-size:11px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;margin-top:4px;display:block}.scan-block{margin-top:28px}.scan-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:14px 18px;background:linear-gradient(135deg,rgba(0,217,165,.06),rgba(0,180,216,.06));border:1px solid #1b2c45;border-radius:12px;margin-bottom:12px}.scan-host{font-family:'Space Grotesk';color:#f1f5f9;font-weight:600;font-size:15px;margin:0;word-break:break-all}.scan-date{color:#8FA1B8;font-size:12px;white-space:nowrap}.findings{display:flex;flex-direction:column;gap:10px}.finding{background:#0e1d33;border:1px solid #1b2c45;border-radius:12px;padding:16px 18px}.finding-head{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}.sev-badge{padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}.finding-type{color:#f1f5f9;font-weight:600;font-size:14px}.finding-desc{color:#cbd5e1;font-size:13.5px;margin:6px 0 10px}.finding-row{display:flex;gap:12px;padding:4px 0;font-size:12.5px}.finding-label{color:#5A6E86;min-width:84px;flex-shrink:0;font-weight:600;text-transform:uppercase;letter-spacing:.6px;font-size:11px}.finding-value{color:#cbd5e1;word-break:break-word}.finding-value.mono{font-family:ui-monospace,monospace;font-size:11.5px;color:#8FA1B8}.empty-state{text-align:center;padding:60px 20px;background:#0e1d33;border:1px dashed #1b2c45;border-radius:14px;margin-top:32px}.empty-title{color:#cbd5e1;font-weight:600;font-size:16px;margin:0 0 6px}.empty-sub{color:#5A6E86;font-size:13px;margin:0}.report-footer{text-align:center;margin-top:48px;padding-top:24px;border-top:1px solid #1b2c45;color:#5A6E86;font-size:11.5px}.report-footer .accent{color:#00D9A5}@media(max-width:720px){.summary{grid-template-columns:repeat(3,1fr)}}${printStyles}</style></head><body><div class="report-shell"><div class="hero"><div class="hero-brand"><div class="hero-logo">B</div><span class="hero-brand-name">Baseera</span></div><h1 class="hero-title">Vulnerability Report</h1><p class="hero-sub">Generated ${esc(dateStr)} · ${esc(timeStr)}</p></div><div class="summary"><div class="summary-card total"><p class="summary-number">${totalVulns}</p><span class="summary-label">Total</span></div><div class="summary-card critical"><p class="summary-number">${totalCritical}</p><span class="summary-label">Critical</span></div><div class="summary-card high"><p class="summary-number">${totalHigh}</p><span class="summary-label">High</span></div><div class="summary-card medium"><p class="summary-number">${totalMedium}</p><span class="summary-label">Medium</span></div><div class="summary-card low"><p class="summary-number">${totalLow}</p><span class="summary-label">Low</span></div><div class="summary-card total"><p class="summary-number">${securityScore}</p><span class="summary-label">Score</span></div></div>${scanSections}${emptyState}<div class="report-footer">Baseera · <span class="accent">${esc(dateStr)}</span> · Passive web vulnerability scanner</div></div></body></html>`;
  };

  const handleExportPDF = async () => {
    setExportLoading(true); setShowExportDropdown(false);
    try {
      const html = await buildReportHtml({ forPrint: true });
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => { try { win.focus(); win.print(); } catch (_) {} }, 350); }
    } finally { setExportLoading(false); }
  };
  const handleExportHTML = async () => {
    setExportLoading(true); setShowExportDropdown(false);
    try {
      const html = await buildReportHtml({ forPrint: false });
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `baseera-report-${new Date().toISOString().slice(0, 10)}.html`; a.click(); URL.revokeObjectURL(url);
    } finally { setExportLoading(false); }
  };
  const handleClearAll = async () => {
    if (!window.confirm('Clear all scan data? This cannot be undone.')) return;
    setClearLoading(true);
    try {
      await apiClient.delete('/scans/clear-all');
      setScans([]); setScanVulnerabilities({}); setExpandedScanId(null);
      showToast('All scan history cleared');
    } catch (err) { showToast('Failed to clear data. Please try again.', { type: 'error' }); }
    finally { setClearLoading(false); }
  };
  const handleDeleteScan = async (scanId, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this scan? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/scans/${scanId}`);
      setScans((prev) => prev.filter((s) => s.id !== scanId));
      setScanVulnerabilities((prev) => { const n = { ...prev }; delete n[scanId]; return n; });
      if (expandedScanId === scanId) setExpandedScanId(null);
      showToast('Scan deleted');
    } catch (err) { showToast('Failed to delete this scan. Please try again.', { type: 'error' }); }
  };

  const gaugeOff = 439.8 * (1 - (animGauge ? securityScore : 0) / 100);

  return (
    <DashboardLayout badge={totalVulns}>
      <div className="topbar">
        <div>
          <h1>Security Dashboard</h1>
          <div className="sub">Across <b>{sites.length} site{sites.length === 1 ? '' : 's'}</b> and <b>{scans.length} scan{scans.length === 1 ? '' : 's'}</b>{scans[0]?.createdAt ? <> · last scan {relTime(scans[0].createdAt)}</> : null}</div>
        </div>
        <div className="tb-actions">
          <div className="range">
            {[7, 30, 90].map((r) => <button key={r} className={timelineRange === r ? 'on' : ''} onClick={() => setTimelineRange(r)}>{r}d</button>)}
          </div>
          <button className="dbtn" onClick={() => setShowExportDropdown((v) => !v)} disabled={exportLoading || scans.length === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            {exportLoading ? 'Exporting…' : 'Export'}
          </button>
          {showExportDropdown && (
            <div className="export-menu">
              <button onClick={handleExportPDF}><i className="fa-solid fa-file-pdf"></i> Export as PDF</button>
              <button onClick={handleExportHTML}><i className="fa-solid fa-code"></i> Export as HTML</button>
            </div>
          )}
          <button className="dbtn danger" onClick={handleClearAll} disabled={clearLoading || scans.length === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
            {clearLoading ? 'Clearing…' : 'Clear all'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty"><p style={{ color: 'var(--t3)', fontFamily: 'var(--fm)' }}>Loading your findings…</p></div>
      ) : scans.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="ei"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z" /></svg></div>
            <h3>No scans yet</h3>
            <p>Install the Baseera extension and scan your first website. Your findings, risk score, and fixes will appear here.</p>
            <a className="b-btn b-btn--chrome b-btn--lg" {...WEBSTORE_LINK_PROPS}>Add Baseera to Chrome</a>
          </div>
        </div>
      ) : (
        <>
          {/* score + tiles */}
          <div className="row r-top">
            <div className="card score">
              <div className="gauge">
                <svg width="168" height="168" viewBox="0 0 168 168">
                  <circle cx="84" cy="84" r="70" fill="none" stroke="#16273f" strokeWidth="12" />
                  <circle className="prog" cx="84" cy="84" r="70" fill="none" stroke={scoreColor} strokeWidth="12" strokeLinecap="round" strokeDasharray="439.8" strokeDashoffset={gaugeOff} />
                </svg>
                <div className="v"><b style={{ color: scoreColor }}>{securityScore}</b><span>Security score</span></div>
              </div>
              <div className="status" style={{ color: scoreColor, background: scoreColor + '1f', border: `1px solid ${scoreColor}4d` }}>{securityLabel}</div>
              <div className="breakdown">
                {[['Critical', totalCritical, 'var(--crit)'], ['High', totalHigh, 'var(--high)'], ['Medium', totalMedium, 'var(--med)'], ['Low', totalLow, 'var(--low)']].map(([nm, ct, col]) => (
                  <div className="bd-row" key={nm}><span className="dot" style={{ background: col }}></span><span className="nm">{nm}</span>
                    <span className="bd-track"><span className="bd-fill" style={{ width: `${Math.min(100, (ct / Math.max(1, totalVulns)) * 100)}%`, background: col }}></span></span>
                    <span className="ct">{ct}</span></div>
                ))}
              </div>
            </div>
            <div className="tiles">
              {[['c', 'Critical', totalCritical], ['h', 'High', totalHigh], ['m', 'Medium', totalMedium], ['l', 'Low', totalLow]].map(([cls, nm, ct]) => (
                <div className={`tile ${cls}`} key={nm}>
                  <div className="tl"><span className="d"></span>{nm}</div>
                  <div className="num">{ct}</div>
                  <div className="sub">across {scans.length} scan{scans.length === 1 ? '' : 's'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* charts */}
          <div className="row r-charts">
            <div className="card">
              <div className="card-h"><h3>Findings over time</h3><span className="mono">last {timelineRange} days</span></div>
              <div className="bars">
                {buckets.map((v, i) => (
                  <div className="bar-col" key={i}><div className="bar" style={{ height: `${(v / maxBar) * 100}%` }} title={`${v} findings`}></div></div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--t3)', marginTop: '8px' }}>
                <span>{timelineRange}d ago</span><span>today</span>
              </div>
            </div>
            <div className="card">
              <div className="card-h"><h3>By severity</h3><span className="mono">{totalVulns} total</span></div>
              <div className="donut-wrap">
                <div className="donut">
                  <svg width="150" height="150" viewBox="0 0 150 150">
                    <circle cx="75" cy="75" r="58" fill="none" stroke="#16273f" strokeWidth="16" />
                    {donutRendered.map((s) => s.len > 0 && (
                      <circle key={s.cls} cx="75" cy="75" r="58" fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${s.len} ${donutC}`} strokeDashoffset={s.offset} />
                    ))}
                  </svg>
                  <div className="v"><b>{totalVulns}</b><span>findings</span></div>
                </div>
                <div className="legend">
                  {[['Critical', totalCritical, 'var(--crit)'], ['High', totalHigh, 'var(--high)'], ['Medium', totalMedium, 'var(--med)'], ['Low', totalLow, 'var(--low)']].map(([nm, ct, col]) => (
                    <div className="lg" key={nm}><span className="d" style={{ background: col }}></span><span className="nm">{nm}</span><span className="ct">{ct}</span><span className="pc">{totalVulns ? Math.round((ct / totalVulns) * 100) : 0}%</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* sites — only useful once more than one site has been scanned */}
          {sites.length > 1 && (
          <div className="card" style={{ marginBottom: '18px' }}>
            <div className="sec-head"><h3>Sites</h3>{siteFilter && <button className="reset" onClick={() => setSiteFilter(null)}>Clear site filter ✕</button>}</div>
            <div className="sites">
              {sites.map((s) => {
                const risk = s.c * 25 + s.h2 * 15 + s.m * 8 + s.l * 3;
                const [rc, rl] = riskInfo(Math.min(100, risk));
                return (
                  <div className={`site-card ${siteFilter === s.host ? 'on' : ''}`} key={s.host} onClick={() => setSiteFilter(siteFilter === s.host ? null : s.host)}>
                    <div className="site-top"><div className="site-fav">{s.host.charAt(0)}</div><div style={{ minWidth: 0 }}><div className="site-host">{s.host}</div><div className="site-sub">{s.count} scan{s.count === 1 ? '' : 's'} · {relTime(s.last)}</div></div></div>
                    <div className="site-counts">
                      {s.c > 0 && <span className="sct c">{s.c} Crit</span>}
                      {s.h2 > 0 && <span className="sct h">{s.h2} High</span>}
                      {s.m > 0 && <span className="sct m">{s.m} Med</span>}
                      {s.l > 0 && <span className="sct l">{s.l} Low</span>}
                      {(s.c + s.h2 + s.m + s.l) === 0 && <span className="sct l">Clean</span>}
                    </div>
                    <div className="site-foot"><span className={`rbadge ${rc}`}>{rl}</span><span className="scans">→ view findings</span></div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* findings / scans */}
          <div className="card">
            <div className="card-h"><h3>{siteFilter ? `Findings · ${siteFilter}` : 'Scans & findings'}</h3><span className="mono">{filteredScans.length} of {scans.length}</span></div>
            <div className="tbl-toolbar">
              <div className="search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input placeholder="Search sites and URLs…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="filters">
                {['all', 'critical', 'high', 'medium', 'low'].map((f) => (
                  <span key={f} className={`fpill ${severityFilter === f ? 'on' : ''}`} onClick={() => setSeverityFilter(f)}>{f}</span>
                ))}
              </div>
            </div>

            {filteredScans.length === 0 ? (
              <div className="vempty">No scans match your filters.</div>
            ) : filteredScans.map((scan) => {
              const vulns = scanVulnerabilities[scan.id] || [];
              const open = expandedScanId === scan.id;
              return (
                <div className={`scan-row ${worstClass(scan)} ${open ? 'open' : ''}`} key={scan.id}>
                  <div className="scan-head" onClick={() => toggleScanExpand(scan.id)}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="scan-host">{hostOf(scan.targetURL)}</div>
                      <div className="scan-id">SCAN-{scan.id} · {scan.targetURL}</div>
                    </div>
                    <div className="scan-mini">
                      {scan.criticalCount > 0 && <span className="mchip c">{scan.criticalCount}C</span>}
                      {scan.highCount > 0 && <span className="mchip h">{scan.highCount}H</span>}
                      {scan.mediumCount > 0 && <span className="mchip m">{scan.mediumCount}M</span>}
                      {scan.lowCount > 0 && <span className="mchip l">{scan.lowCount}L</span>}
                    </div>
                    <span className="scan-time">{relTime(scan.createdAt)}</span>
                    <button className="scan-del" onClick={(e) => handleDeleteScan(scan.id, e)} title="Delete scan">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                    </button>
                    <span className="scan-chev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg></span>
                  </div>
                  {open && (
                    <div className="scan-vulns">
                      {loadingVulns === scan.id ? <div className="vloading">Loading findings…</div>
                        : vulns.length === 0 ? <div className="vempty">No findings recorded for this scan.</div>
                          : vulns.map((v, i) => (
                            <div className="vuln" key={v.id || i}>
                              <div className="vuln-head"><span className={`sev ${sevClass(v.severity)}`}><span className="d"></span>{v.severity}</span><span className="vuln-type">{v.type}</span></div>
                              {v.description && <p className="vuln-desc">{v.description}</p>}
                              {v.evidence && <div className="vuln-evidence"><span className="ev-label">Evidence</span><code>{v.evidence}</code></div>}
                              {v.location && <div className="vuln-meta"><b>Location:</b> {v.location}</div>}
                              {v.recommendation && <div className="vuln-fix"><div className="fl">How to fix</div><p>{v.recommendation}</p></div>}
                              <Link className="ask" to="/ai-chatbot" state={{ seed: `What is ${v.type} and how do I fix it?` }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="#04121A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z" /></svg>Ask Baseera AI
                              </Link>
                            </div>
                          ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default Bugs;
