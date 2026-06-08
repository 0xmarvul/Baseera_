import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import LandingNavbar from "../components/LandingNavbar";
import "../index.css";
import "../bugs.css";
import icon3 from "../assets/calander.png";
import apiClient from "../api/axios.config";

function Bugs() {
  const [activeTab, setActiveTab] = useState('overview');
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expandedScanId, setExpandedScanId] = useState(null);
  const [scanVulnerabilities, setScanVulnerabilities] = useState({});
  const [loadingVulns, setLoadingVulns] = useState(null);
  const [timelineRange, setTimelineRange] = useState(7);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // Derived stats from scans
  const totalCritical = scans.reduce((sum, s) => sum + (s.criticalCount || 0), 0);
  const totalHigh = scans.reduce((sum, s) => sum + (s.highCount || 0), 0);
  const totalMedium = scans.reduce((sum, s) => sum + (s.mediumCount || 0), 0);
  const totalLow = scans.reduce((sum, s) => sum + (s.lowCount || 0), 0);
  const totalVulns = scans.reduce((sum, s) => sum + (s.totalVulns || 0), 0);

  // Dynamic security score
  const riskScore = totalVulns > 0 ? Math.min(100, totalCritical * 25 + totalHigh * 15 + totalMedium * 8 + totalLow * 3) : 0;
  const securityScore = 100 - riskScore;
  const securityLabel = securityScore >= 80 ? 'Excellent security posture' :
                        securityScore >= 60 ? 'Good security posture' :
                        securityScore >= 40 ? 'Moderate security posture' :
                        'Poor security posture';

  // Dynamic top vulnerability types from fetched vulnerability data
  const vulnTypeCounts = {};
  Object.values(scanVulnerabilities).forEach(vulnArray => {
    (vulnArray || []).forEach(v => {
      const type = v.type || 'Unknown';
      vulnTypeCounts[type] = (vulnTypeCounts[type] || 0) + 1;
    });
  });
  const topVulnTypes = Object.entries(vulnTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxVulnCount = topVulnTypes.length > 0 ? topVulnTypes[0][1] : 1;

  // Returns vulnerabilities for a scan that match the active severity filter.
  const getMatchingVulns = (scanId) => {
    const all = scanVulnerabilities[scanId] || [];
    if (severityFilter === 'all') return all;
    return all.filter(v => (v.severity || '').toLowerCase() === severityFilter);
  };

  // Filtered scans for display. When a severity is selected we only keep scans that
  // actually contain at least one vulnerability of that severity.
  const filteredScans = scans.filter(s => {
    const matchesSearch = !searchQuery || s.targetURL?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (severityFilter === 'all') return true;
    const countKey = severityFilter + 'Count';
    return (s[countKey] || 0) > 0;
  });

  useEffect(() => {
    apiClient.get('/scans')
      .then(res => {
        if (res.success && res.data) {
          const loadedScans = Array.isArray(res.data) ? res.data : [];
          setScans(loadedScans);
          // Fetch vulnerabilities for the 5 most recent scans (for timeline & top types)
          loadedScans.slice(0, 5).forEach(scan => {
            apiClient.get(`/scans/${scan.id}/vulnerabilities`)
              .then(vRes => {
                if (vRes.success && vRes.data) {
                  setScanVulnerabilities(prev => ({ ...prev, [scan.id]: vRes.data }));
                }
              })
              .catch(() => {});
          });
        }
      })
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, []);

  // When a severity filter is picked on the Vulnerabilities tab, make sure every scan's
  // vulnerability list is loaded so we can filter accurately at the vulnerability level.
  useEffect(() => {
    if (severityFilter === 'all' || activeTab !== 'vulnerabilities') return;
    scans.forEach(scan => {
      if (!scanVulnerabilities[scan.id]) {
        apiClient.get(`/scans/${scan.id}/vulnerabilities`)
          .then(vRes => {
            if (vRes.success && vRes.data) {
              setScanVulnerabilities(prev => ({ ...prev, [scan.id]: vRes.data }));
            }
          })
          .catch(() => {});
      }
    });
  }, [severityFilter, activeTab, scans]);

  const toggleScanExpand = async (scanId) => {
    if (expandedScanId === scanId) {
      setExpandedScanId(null);
      return;
    }
    setExpandedScanId(scanId);
    if (!scanVulnerabilities[scanId]) {
      setLoadingVulns(scanId);
      try {
        const res = await apiClient.get(`/scans/${scanId}/vulnerabilities`);
        if (res.success && res.data) {
          setScanVulnerabilities(prev => ({ ...prev, [scanId]: res.data }));
        }
      } catch (err) {
        console.error('Failed to load vulnerabilities:', err);
      } finally {
        setLoadingVulns(null);
      }
    }
  };

  // Brand-matching report template. Mirrors the website palette
  // (navy bg, teal->cyan gradient, semantic severity colors from index.css).
  // One template shared by both PDF and HTML exports — print() variant adds a
  // small @media print rule so paged output stays readable.
  const buildReportHtml = async ({ forPrint }) => {
    const allVulns = { ...scanVulnerabilities };
    for (const scan of scans) {
      if (!allVulns[scan.id]) {
        try {
          const res = await apiClient.get(`/scans/${scan.id}/vulnerabilities`);
          if (res.success && res.data) allVulns[scan.id] = res.data;
        } catch (err) { console.error('Failed to fetch vulnerabilities for scan', scan.id, err); }
      }
    }

    const esc = (s) => String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const dateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    const timeStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    // Semantic severity colors (matching index.css :root vars).
    const sevColor = (sev) => {
      const k = (sev || '').toLowerCase();
      if (k === 'critical') return { bg: 'rgba(255,71,87,0.18)', text: '#ff4757', border: 'rgba(255,71,87,0.4)' };
      if (k === 'high')     return { bg: 'rgba(255,165,2,0.18)', text: '#ffa502', border: 'rgba(255,165,2,0.4)' };
      if (k === 'medium')   return { bg: 'rgba(55,66,250,0.20)', text: '#7d8af8', border: 'rgba(55,66,250,0.4)' };
      return { bg: 'rgba(46,213,115,0.18)', text: '#2ed573', border: 'rgba(46,213,115,0.4)' };
    };

    const scanSections = scans.map(scan => {
      const vulns = allVulns[scan.id] || [];
      if (vulns.length === 0) return '';
      let hostname = scan.targetURL || '';
      try { hostname = new URL(scan.targetURL).hostname; } catch {}
      const scanDate = scan.createdAt ? new Date(scan.createdAt).toLocaleDateString() : '';
      const findingRows = vulns.map(v => {
        const c = sevColor(v.severity);
        return `
        <div class="finding">
          <div class="finding-head">
            <span class="sev-badge" style="background:${c.bg};color:${c.text};border:1px solid ${c.border}">${esc(v.severity || 'Unknown')}</span>
            <span class="finding-type">${esc(v.type || 'Unknown')}</span>
          </div>
          ${v.description ? `<p class="finding-desc">${esc(v.description)}</p>` : ''}
          ${v.location ? `<div class="finding-row"><span class="finding-label">Location</span><span class="finding-value mono">${esc(v.location)}</span></div>` : ''}
          ${v.recommendation ? `<div class="finding-row"><span class="finding-label">Fix</span><span class="finding-value">${esc(v.recommendation)}</span></div>` : ''}
        </div>`;
      }).join('');
      return `
      <section class="scan-block">
        <div class="scan-head">
          <h2 class="scan-host">${esc(hostname)}</h2>
          <span class="scan-date">${esc(scanDate)} · ${vulns.length} finding${vulns.length === 1 ? '' : 's'}</span>
        </div>
        <div class="findings">${findingRows}</div>
      </section>`;
    }).join('');

    const emptyState = scans.length === 0 || scanSections.trim() === ''
      ? `<div class="empty-state">
           <p class="empty-title">No vulnerabilities recorded.</p>
           <p class="empty-sub">Install the Baseera extension and scan your first website.</p>
         </div>`
      : '';

    const printStyles = forPrint ? `
      @page { margin: 18mm 14mm; }
      @media print {
        body { background: #ffffff !important; color: #0a1929 !important; }
        .report-shell { background: #ffffff !important; }
        .hero, .summary-card, .finding, .scan-head { background: #ffffff !important; border-color: #d6dde6 !important; box-shadow: none !important; }
        .hero-title, .summary-number, .scan-host, .finding-type { color: #0a1929 !important; }
        .hero-sub, .summary-label, .scan-date, .finding-desc, .finding-label, .finding-value { color: #475569 !important; }
        .sev-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .scan-block { page-break-inside: avoid; }
        .finding { page-break-inside: avoid; }
      }` : '';

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Baseera Security Report — ${esc(dateStr)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0a1929;
    color: #e2e8f0;
    line-height: 1.55;
  }
  .report-shell {
    max-width: 920px;
    margin: 0 auto;
    padding: 48px 28px 80px;
  }

  /* Hero */
  .hero {
    background: linear-gradient(135deg, #0d2137 0%, #132f4c 60%, #0d2137 100%);
    border: 1px solid #1e3a5f;
    border-radius: 18px;
    padding: 36px 36px 32px;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: ""; position: absolute; top: -80px; right: -80px;
    width: 280px; height: 280px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,217,165,0.18), transparent 65%);
    pointer-events: none;
  }
  .hero-brand {
    display: flex; align-items: center; gap: 12px; margin-bottom: 18px;
  }
  .hero-logo {
    width: 40px; height: 40px; border-radius: 11px;
    background: linear-gradient(135deg, #00d9a5 0%, #00b4d8 100%);
    display: flex; align-items: center; justify-content: center;
    color: #ffffff; font-weight: 800; font-size: 18px;
  }
  .hero-brand-name {
    color: #ffffff; font-weight: 700; font-size: 17px; letter-spacing: 0.2px;
  }
  .hero-title {
    color: #f1f5f9;
    font-size: 28px;
    font-weight: 700;
    margin: 6px 0 8px;
    line-height: 1.2;
  }
  .hero-sub { color: #94a3b8; font-size: 14px; margin: 0; }

  /* Summary */
  .summary {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin: 28px 0;
  }
  .summary-card {
    background: #0d2137;
    border: 1px solid #1e3a5f;
    border-radius: 12px;
    padding: 16px 12px;
    text-align: center;
  }
  .summary-card.total {
    background: linear-gradient(135deg, rgba(0,217,165,0.10) 0%, rgba(0,180,216,0.10) 100%);
    border-color: rgba(0,217,165,0.35);
  }
  .summary-number {
    font-size: 24px; font-weight: 700; color: #f1f5f9; margin: 0;
    background: linear-gradient(135deg, #00d9a5, #00b4d8);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  .summary-card:not(.total) .summary-number { background: none; -webkit-text-fill-color: initial; }
  .summary-card.critical .summary-number { color: #ff4757; }
  .summary-card.high     .summary-number { color: #ffa502; }
  .summary-card.medium   .summary-number { color: #7d8af8; }
  .summary-card.low      .summary-number { color: #2ed573; }
  .summary-label { color: #94a3b8; font-size: 11px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; margin-top: 4px; display: block; }

  /* Scan block */
  .scan-block { margin-top: 28px; }
  .scan-head {
    display: flex; justify-content: space-between; align-items: baseline; gap: 16px;
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(0,217,165,0.06), rgba(0,180,216,0.06));
    border: 1px solid #1e3a5f;
    border-radius: 12px;
    margin-bottom: 12px;
  }
  .scan-host { color: #f1f5f9; font-weight: 600; font-size: 15px; margin: 0; word-break: break-all; }
  .scan-date { color: #94a3b8; font-size: 12px; white-space: nowrap; }

  /* Finding */
  .findings { display: flex; flex-direction: column; gap: 10px; }
  .finding {
    background: #0d2137;
    border: 1px solid #1e3a5f;
    border-radius: 12px;
    padding: 16px 18px;
  }
  .finding-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
  .sev-badge {
    padding: 4px 12px; border-radius: 999px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .finding-type { color: #f1f5f9; font-weight: 600; font-size: 14px; }
  .finding-desc { color: #cbd5e1; font-size: 13.5px; margin: 6px 0 10px; }
  .finding-row { display: flex; gap: 12px; padding: 4px 0; font-size: 12.5px; }
  .finding-label {
    color: #64748b; min-width: 84px; flex-shrink: 0;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; font-size: 11px; padding-top: 1px;
  }
  .finding-value { color: #cbd5e1; word-break: break-word; }
  .finding-value.mono { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 11.5px; color: #94a3b8; }

  /* Empty state */
  .empty-state {
    text-align: center; padding: 60px 20px;
    background: #0d2137; border: 1px dashed #1e3a5f; border-radius: 14px;
    margin-top: 32px;
  }
  .empty-title { color: #cbd5e1; font-weight: 600; font-size: 16px; margin: 0 0 6px; }
  .empty-sub { color: #64748b; font-size: 13px; margin: 0; }

  /* Footer */
  .report-footer {
    text-align: center; margin-top: 48px; padding-top: 24px;
    border-top: 1px solid #1e3a5f;
    color: #64748b; font-size: 11.5px;
  }
  .report-footer .accent { color: #00d9a5; }

  @media (max-width: 720px) {
    .summary { grid-template-columns: repeat(3, 1fr); }
    .scan-head { flex-direction: column; align-items: flex-start; gap: 4px; }
  }
  ${printStyles}
</style>
</head>
<body>
  <div class="report-shell">
    <div class="hero">
      <div class="hero-brand">
        <div class="hero-logo">B</div>
        <span class="hero-brand-name">Baseera Security Scanner</span>
      </div>
      <h1 class="hero-title">Vulnerability Report</h1>
      <p class="hero-sub">Generated ${esc(dateStr)} · ${esc(timeStr)}</p>
    </div>

    <div class="summary">
      <div class="summary-card total"><p class="summary-number">${totalVulns}</p><span class="summary-label">Total</span></div>
      <div class="summary-card critical"><p class="summary-number">${totalCritical}</p><span class="summary-label">Critical</span></div>
      <div class="summary-card high"><p class="summary-number">${totalHigh}</p><span class="summary-label">High</span></div>
      <div class="summary-card medium"><p class="summary-number">${totalMedium}</p><span class="summary-label">Medium</span></div>
      <div class="summary-card low"><p class="summary-number">${totalLow}</p><span class="summary-label">Low</span></div>
      <div class="summary-card total"><p class="summary-number">${securityScore}</p><span class="summary-label">Score</span></div>
    </div>

    ${scanSections}
    ${emptyState}

    <div class="report-footer">
      Baseera Security Scanner · <span class="accent">${esc(dateStr)}</span> · Passive web vulnerability scanner
    </div>
  </div>
</body>
</html>`;
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    setShowExportDropdown(false);
    try {
      const html = await buildReportHtml({ forPrint: true });
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        // Give fonts a beat to load before the print dialog opens.
        setTimeout(() => { try { win.focus(); win.print(); } catch (_) {} }, 350);
      }
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportHTML = async () => {
    setExportLoading(true);
    setShowExportDropdown(false);
    try {
      const html = await buildReportHtml({ forPrint: false });
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `baseera-report-${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all vulnerability data? This action cannot be undone.')) return;
    setClearLoading(true);
    try {
      await apiClient.delete('/scans/clear-all');
      setScans([]);
      setScanVulnerabilities({});
      setExpandedScanId(null);
    } catch (err) {
      console.error('Failed to clear all scans:', err);
      alert('Failed to clear data. Please try again.');
    } finally {
      setClearLoading(false);
    }
  };

  // Delete a single scan + its vulnerabilities. Backend cascade-deletes
  // dependents (Vulnerabilities, Reports for this scan) via EF; we just
  // need to refresh local state. stopPropagation on the button click
  // prevents the scan card's expand toggle from firing.
  const handleDeleteScan = async (scanId, e) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this scan? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/scans/${scanId}`);
      setScans((prev) => prev.filter((s) => s.id !== scanId));
      setScanVulnerabilities((prev) => {
        const next = { ...prev };
        delete next[scanId];
        return next;
      });
      if (expandedScanId === scanId) setExpandedScanId(null);
    } catch (err) {
      console.error('Failed to delete scan:', err);
      alert('Failed to delete this scan. Please try again.');
    }
  };

  return (
    <>
      <LandingNavbar />

      <div className="bugs-sec">

        {/* RIGHT SIDE */}
        <div className="bugs-actions">
          <div className="risk-box">
            <span className="risk-title">Risk Score</span>

            <div className="risk-row">
              <h3 className="risk-number">{totalVulns > 0 ? Math.min(100, totalCritical * 25 + totalHigh * 15 + totalMedium * 8 + totalLow * 3) : 0}</h3>

              <div className="row-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.6665 11.3334H14.6665V7.33337" stroke="#00D492" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14.6668 11.3333L9.00016 5.66663L5.66683 8.99996L1.3335 4.66663" stroke="#00D492" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="risk-change">{totalVulns > 0 ? `${totalVulns} found` : "—"}</span>
              </div>
            </div>
          </div>

          <div className="export-dropdown-wrapper">
            <div className="export-split-btn">
              <button className="export-main-btn" onClick={() => setShowExportDropdown(v => !v)} disabled={exportLoading}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 10V2" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.6665 6.66663L7.99984 9.99996L11.3332 6.66663" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h4>{exportLoading ? 'Exporting...' : 'Export Report'}</h4>
              </button>
              <button className="export-chevron-btn" onClick={() => setShowExportDropdown(v => !v)} disabled={exportLoading}>
                ▾
              </button>
            </div>
            {showExportDropdown && (
              <div className="export-dropdown">
                <button className="export-dropdown-item" onClick={handleExportPDF}>📄 Export as PDF</button>
                <button className="export-dropdown-item" onClick={handleExportHTML}>🌐 Export as HTML</button>
              </div>
            )}
          </div>
          <button className="clear-btn" onClick={handleClearAll} disabled={clearLoading}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4H14" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5.3335 4V2.66667C5.3335 2.31305 5.47397 1.97391 5.72402 1.72386C5.97407 1.47381 6.31321 1.33333 6.66683 1.33333H9.3335C9.68712 1.33333 10.0263 1.47381 10.2763 1.72386C10.5264 1.97391 10.6668 2.31305 10.6668 2.66667V4" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.6665 7.33333V11.3333" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9.3335 7.33333V11.3333" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.3335 4L4.00016 12.6667C4.00016 13.0203 4.14064 13.3594 4.39069 13.6095C4.64074 13.8595 4.97987 14 5.3335 14H10.6668C11.0205 14 11.3596 13.8595 11.6096 13.6095C11.8597 13.3594 12.0002 13.0203 12.0002 12.6667L12.6668 4" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h4>{clearLoading ? 'Clearing...' : 'Clear All'}</h4>
          </button>
        </div>
      </div>

      {/* CARDS SECTION */}
      <div className="bugs-cards">
        <div className="card-High">
          <div className="high-info">
            <div className="high-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16H12.01" stroke="#FF6467" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12" stroke="#FF6467" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15.312 2C15.8424 2.00011 16.351 2.2109 16.726 2.586L21.414 7.274C21.7891 7.64899 21.9999 8.15761 22 8.688V15.312C21.9999 15.8424 21.7891 16.351 21.414 16.726L16.726 21.414C16.351 21.7891 15.8424 21.9999 15.312 22H8.688C8.15761 21.9999 7.64899 21.7891 7.274 21.414L2.586 16.726C2.2109 16.351 2.00011 15.8424 2 15.312V8.688C2.00011 8.15761 2.2109 7.64899 2.586 7.274L7.274 2.586C7.64899 2.2109 8.15761 2.00011 8.688 2H15.312Z" stroke="#FF6467" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4>Critical</h4>
          </div>
          <div className="num">
            <h1>{totalCritical}</h1>
          </div>
          <div className="info">
            <h4>Critical Threats</h4>
          </div>
          <div className="high-img">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_191_1512)">
                <path d="M8 3.5H11V6.5" stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 3.5L6.75 7.75L4.25 5.25L1 8.5" stroke="#FF6467" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
            <h4>{totalCritical > 0 ? `${totalCritical} total` : "No data"}</h4>
          </div>
        </div>

        <div className="card-Urgent">
          <div className="urgent-info">
            <div className="urgent-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.7299 18L13.7299 3.99998C13.5555 3.69218 13.3025 3.43617 12.9969 3.25805C12.6912 3.07993 12.3437 2.98608 11.9899 2.98608C11.6361 2.98608 11.2887 3.07993 10.983 3.25805C10.6773 3.43617 10.4244 3.69218 10.2499 3.99998L2.24993 18C2.07361 18.3053 1.98116 18.6519 1.98194 19.0045C1.98272 19.3571 2.07671 19.7032 2.25438 20.0078C2.43204 20.3124 2.68708 20.5646 2.99362 20.7388C3.30017 20.9131 3.64734 21.0032 3.99993 21H19.9999C20.3508 20.9996 20.6955 20.9069 20.9992 20.7313C21.303 20.5556 21.5551 20.3031 21.7304 19.9991C21.9057 19.6951 21.998 19.3504 21.9979 18.9995C21.9978 18.6486 21.9054 18.3039 21.7299 18Z" stroke="#FF8904" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 9V13" stroke="#FF8904" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17H12.01" stroke="#FF8904" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4>High</h4>
          </div>
          <div className="num">
            <h1>{totalHigh}</h1>
          </div>
          <div className="info">
            <h4>High Severity</h4>
          </div>
          <div className="urgent-img">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_191_1913)">
                <path d="M6 3V6L8 7" stroke="#FF8904" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z" stroke="#FF8904" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
            <h4>{totalHigh > 0 ? `${totalHigh} total` : "No data"}</h4>
          </div>
        </div>

        <div className="card-In-Progress">
          <div className="In-Progress-info">
            <div className="In-Progress-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#00D3F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12" stroke="#00D3F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16H12.01" stroke="#00D3F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4>Medium</h4>
          </div>
          <div className="num">
            <h1>{totalMedium}</h1>
          </div>
          <div className="info">
            <h4>Active Issues</h4>
          </div>
          <div className="In-Progress-img">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_191_1935)">
                <path d="M8 10.5V9.5C8 8.96957 7.78929 8.46086 7.41421 8.08579C7.03914 7.71071 6.53043 7.5 6 7.5H3C2.46957 7.5 1.96086 7.71071 1.58579 8.08579C1.21071 8.46086 1 8.96957 1 9.5V10.5" stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 1.56396C8.42888 1.67515 8.8087 1.9256 9.07984 2.276C9.35098 2.6264 9.4981 3.05691 9.4981 3.49996C9.4981 3.94302 9.35098 4.37353 9.07984 4.72393C8.8087 5.07433 8.42888 5.32478 8 5.43596" stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 10.4999V9.49994C10.9997 9.05681 10.8522 8.62633 10.5807 8.2761C10.3092 7.92587 9.92906 7.67573 9.5 7.56494" stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.5 5.5C5.60457 5.5 6.5 4.60457 6.5 3.5C6.5 2.39543 5.60457 1.5 4.5 1.5C3.39543 1.5 2.5 2.39543 2.5 3.5C2.5 4.60457 3.39543 5.5 4.5 5.5Z" stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
            <h4>{totalMedium > 0 ? `${totalMedium} total` : "No data"}</h4>
          </div>
        </div>

        <div className="card-Completed">
          <div className="Completed-info">
            <div className="Completed-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.8011 9.99999C22.2578 12.2413 21.9323 14.5714 20.879 16.6018C19.8256 18.6322 18.108 20.24 16.0126 21.1573C13.9172 22.0746 11.5707 22.2458 9.3644 21.6424C7.15807 21.0389 5.22529 19.6974 3.88838 17.8414C2.55146 15.9854 1.89122 13.7272 2.01776 11.4434C2.14431 9.15952 3.04998 6.98808 4.58375 5.29116C6.11752 3.59424 8.18668 2.47442 10.4462 2.11844C12.7056 1.76247 15.0189 2.19185 17.0001 3.33499" stroke="#00D492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 11L12 14L22 4" stroke="#00D492" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h4>Low</h4>
          </div>
          <div className="num">
            <h1>{totalLow}</h1>
          </div>
          <div className="info">
            <h4>Low Severity</h4>
          </div>
          <div className="Completed-img">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_191_1958)">
                <path d="M8 8.5H11V5.5" stroke="#00D492" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 8.5L6.75 4.25L4.25 6.75L1 3.5" stroke="#00D492" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
            </svg>
            <h4>{totalLow > 0 ? `${totalLow} total` : "No data"}</h4>
          </div>
        </div>
      </div>

      {/* TABS SECTION */}
      <section className="DashboardPageAlt">
        <div className="button">
          <div className={activeTab === 'overview' ? "Primitive-button" : "non-Primitive-button"}>
            <button onClick={() => setActiveTab('overview')}>
              <div className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 2V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H14" stroke={activeTab === 'overview' ? "white" : "#90A1B9"} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 11.3333V6" stroke={activeTab === 'overview' ? "white" : "#90A1B9"} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.6665 11.3334V3.33337" stroke={activeTab === 'overview' ? "white" : "#90A1B9"} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5.3335 11.3334V9.33337" stroke={activeTab === 'overview' ? "white" : "#90A1B9"} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              Overview
            </button>
          </div>

          <div className={activeTab === 'vulnerabilities' ? "Primitive-button" : "non-Primitive-button"}>
            <button onClick={() => setActiveTab('vulnerabilities')}>
              <div className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_191_1595)">
                    <path d="M14.4866 12L9.15329 2.66665C9.037 2.46146 8.86836 2.29078 8.66457 2.17203C8.46078 2.05329 8.22915 1.99072 7.99329 1.99072C7.75743 1.99072 7.52579 2.05329 7.322 2.17203C7.11822 2.29078 6.94958 2.46146 6.83329 2.66665L1.49995 12C1.38241 12.2036 1.32077 12.4346 1.32129 12.6697C1.32181 12.9047 1.38447 13.1355 1.50292 13.3385C1.62136 13.5416 1.79138 13.7097 1.99575 13.8259C2.20011 13.942 2.43156 14.0021 2.66662 14H13.3333C13.5672 13.9997 13.797 13.938 13.9995 13.8208C14.202 13.7037 14.3701 13.5354 14.487 13.3327C14.6038 13.1301 14.6653 12.9002 14.6653 12.6663C14.6652 12.4324 14.6036 12.2026 14.4866 12Z" stroke={activeTab === 'vulnerabilities' ? "white" : "#90A1B9"} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 6V8.66667" stroke={activeTab === 'vulnerabilities' ? "white" : "#90A1B9"} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 11.3334H8.00667" stroke={activeTab === 'vulnerabilities' ? "white" : "#90A1B9"} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>
                </svg>
              </div>
              Vulnerabilities
            </button>
          </div>

          <div className={activeTab === 'analytics' ? "Primitive-button" : "non-Primitive-button"}>
            <button onClick={() => setActiveTab('analytics')}>
              <div className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_191_1601)">
                    <path d="M14.0002 8.00007C14.3682 8.00007 14.6702 7.70074 14.6335 7.33474C14.4798 5.80418 13.8016 4.37387 12.7137 3.28628C11.6259 2.1987 10.1954 1.52076 8.66485 1.3674C8.29818 1.33074 7.99951 1.63274 7.99951 2.00074V7.33407C7.99951 7.51088 8.06975 7.68045 8.19477 7.80547C8.3198 7.9305 8.48937 8.00074 8.66618 8.00074L14.0002 8.00007Z" stroke={activeTab === 'analytics' ? "white" : "#90A1B9"} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.1399 10.5933C13.7158 11.5963 13.0525 12.4801 12.2079 13.1675C11.3633 13.8549 10.3631 14.3249 9.2949 14.5365C8.22668 14.748 7.12289 14.6947 6.08004 14.3811C5.03719 14.0676 4.08703 13.5033 3.31262 12.7377C2.53822 11.9721 1.96315 11.0284 1.6377 9.98923C1.31225 8.95003 1.24632 7.84692 1.44568 6.77635C1.64503 5.70578 2.10361 4.70035 2.78131 3.84795C3.45901 2.99555 4.3352 2.32214 5.33328 1.8866" stroke={activeTab === 'analytics' ? "white" : "#90A1B9"} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>
                </svg>
              </div>
              Analytics
            </button>
          </div>
        </div>
      </section>

      {/* OVERVIEW TAB CONTENT */}
      {activeTab === 'overview' && (
        <div className="Vulnerability">
          {scans.length === 0 && !loading && (
            <div style={{textAlign: 'center', padding: '40px', color: '#64748b', width: '100%'}}>
              No scans yet. Install the Baseera extension and scan your first website to see vulnerability data here.
            </div>
          )}
          {(scans.length > 0 || loading) && (
          <>
          <div className="Container-right">
            <div className="container-headline">
              <div className="heading">
                <div className="container-icon">
                  <img src={icon3} alt="security icon" width={20} height={20} />
                  <div className="container-text">
                    <h4>Threat Timeline</h4>
                  </div>
                </div>
              </div>
              <div className="container-last">
                <select
                  value={timelineRange}
                  onChange={e => setTimelineRange(Number(e.target.value))}
                  style={{background: '#0d1b35', color: '#90A1B9', border: '1px solid #1e2d4e', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer'}}
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
              </div>
            </div>

            <div className="bug-table">
              {(() => {
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - timelineRange);
                const timelineScans = scans
                  .filter(scan => scan.createdAt && new Date(scan.createdAt) >= cutoff)
                  .slice(0, 10);
                return timelineScans.map((scan, idx) => {
                const severity = scan.criticalCount > 0 ? 'Critical' : scan.highCount > 0 ? 'High' : scan.mediumCount > 0 ? 'Medium' : 'Low';
                const badgeClass = severity === 'Critical' ? 'Badge' : severity === 'High' ? 'Badge-1' : 'Badge-2';
                const lineClass = severity === 'Critical' ? 'head-line' : severity === 'High' ? 'head-line-1' : 'head-line-2';
                let hostname = scan.targetURL || '';
        try { hostname = new URL(scan.targetURL).hostname; } catch { hostname = scan.targetURL || ''; }
                const date = scan.createdAt ? new Date(scan.createdAt).toISOString().slice(0, 10) : '';
                const vulnType = (scanVulnerabilities[scan.id] && scanVulnerabilities[scan.id][0]?.type) || `${scan.totalVulns} vulnerabilities`;
                return (
                  <div key={scan.id || idx} className="bug-1">
                    <div className="bug-line">
                      <div className={lineClass}></div>
                      <div className="line"></div>
                    </div>
                    <div className="bug-box">
                      <div className="bug-contact">
                        <div className={badgeClass}>
                          <h4>{severity}</h4>
                        </div>
                        <div className="date">
                          <h4>• {date}</h4>
                        </div>
                      </div>
                      <div className="bug-name">
                        <h4>{vulnType}</h4>
                      </div>
                      <div className="bug-web">
                        <div className="web-icon">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_191_1637)">
                              <path d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z" stroke="#90A1B9" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M6 1C4.71612 2.34808 4 4.13837 4 6C4 7.86163 4.71612 9.65192 6 11C7.28388 9.65192 8 7.86163 8 6C8 4.13837 7.28388 2.34808 6 1Z" stroke="#90A1B9" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M1 6H11" stroke="#90A1B9" strokeLinecap="round" strokeLinejoin="round"/>
                            </g>
                          </svg>
                        </div>
                        <div className="web">
                          <h4>{hostname}</h4>
                        </div>
                      </div>
                    </div>
                  </div>
                );
                });
              })()}
            </div>
          </div>

          <div className="Container-left">
            <div className="score-box">
              <h4>Security Score</h4>
              <div className="circle-score">
                <div className="score-circle-display">
                  <span className="score-number-large">{securityScore}</span>
                  <span className="score-denom">/100</span>
                </div>
              </div>
              <div className="score-footer">
                <h4>{securityLabel}</h4>
              </div>
            </div>

            <div className="top-vulnerability-box">
              <h4>Top Vulnerability Types</h4>
              
              <div className="vulnerability-list">
                {topVulnTypes.length === 0 ? (
                  <div style={{color: '#64748b', fontSize: '13px', padding: '8px 0'}}>No vulnerability data yet.</div>
                ) : topVulnTypes.map(([type, count], idx) => {
                  const barColors = ['progress-red', 'progress-orange', 'progress-yellow', 'progress-orange', 'progress-red'];
                  return (
                    <div key={type} className="vulnerability-item">
                      <div className="vulnerability-header">
                        <span className="vulnerability-name">{type}</span>
                        <span className="vulnerability-count">{count}</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className={`progress-bar-fill ${barColors[idx] || 'progress-yellow'}`} style={{width: `${Math.round(count / maxVulnCount * 100)}%`}}></div>
                        <div className="progress-bar-bg"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
          </>
          )}
        </div>
      )}

      {/* VULNERABILITIES TAB CONTENT */}
{activeTab === 'vulnerabilities' && (
  <section className="vulnerabilities-section">
    {/* Search Bar */}
    <div className="search-container">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17.5 17.5L13.875 13.875" stroke="#90A1B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <input 
        type="text" 
        placeholder="Search scans by URL..." 
        className="vulnerability-search"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />
      <select
        value={severityFilter}
        onChange={e => setSeverityFilter(e.target.value)}
        style={{marginLeft: '12px', background: '#0d1b35', color: '#90A1B9', border: '1px solid #1e2d4e', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer'}}
      >
        <option value="all">All Severity</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>

    {/* Scans from API */}
    <div className="vulnerabilities-list">
      {loading && (
        <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Loading scans...</div>
      )}
      {!loading && filteredScans.length === 0 && (
        <div style={{textAlign: 'center', padding: '40px', color: '#64748b', width: '100%'}}>
          {scans.length === 0 ? 'No scans found. Use the Chrome Extension to scan pages!' : 'No scans match your search.'}
        </div>
      )}
      {!loading && filteredScans.map((scan, idx) => (
        <div key={scan.id || idx} className="vulnerability-card">
          <div className="vulnerability-card-header" onClick={() => toggleScanExpand(scan.id)} style={{cursor: 'pointer'}}>
            <div className="vulnerability-header-row">
              <div className="vulnerability-meta">
                <span className="vulnerability-id">SCAN-{scan.id}</span>
                {(severityFilter === 'all' || severityFilter === 'critical') && (
                  <span className="severity-badge severity-critical">Critical: {scan.criticalCount}</span>
                )}
                {(severityFilter === 'all' || severityFilter === 'high') && (
                  <span className="severity-badge severity-high">High: {scan.highCount}</span>
                )}
                {(severityFilter === 'all' || severityFilter === 'medium') && (
                  <span className="severity-badge severity-medium">Medium: {scan.mediumCount}</span>
                )}
                {(severityFilter === 'all' || severityFilter === 'low') && (
                  <span className="severity-badge severity-low">Low: {scan.lowCount}</span>
                )}
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0}}>
                <button
                  type="button"
                  onClick={(e) => handleDeleteScan(scan.id, e)}
                  className="scan-delete-btn"
                  title="Delete this scan"
                  aria-label="Delete this scan"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M3 3.5L3.5 12a1 1 0 001 1h5a1 1 0 001-1L11 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{transform: expandedScanId === scan.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease'}}>
                  <path d="M4 6L8 10L12 6" stroke="#90A1B9" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <h3 className="vulnerability-title" style={{wordBreak: 'break-all'}}>{scan.targetURL}</h3>
            <div className="vulnerability-footer">
              <div className="vulnerability-info-item">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z" stroke="#90A1B9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 7H13" stroke="#90A1B9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 1C8.5 2.5 9.5 4.5 9.5 7C9.5 9.5 8.5 11.5 7 13C5.5 11.5 4.5 9.5 4.5 7C4.5 4.5 5.5 2.5 7 1Z" stroke="#90A1B9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{severityFilter === 'all' ? scan.totalVulns : (scan[severityFilter + 'Count'] || 0)} vulnerabilities</span>
              </div>
              <div className="vulnerability-info-item">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3.5" width="8" height="8" rx="1" stroke="#90A1B9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 2.5V4.5" stroke="#90A1B9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 2.5V4.5" stroke="#90A1B9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 7H11" stroke="#90A1B9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{scan.createdAt ? new Date(scan.createdAt).toLocaleDateString() : ''}</span>
              </div>
            </div>
          </div>
          {expandedScanId === scan.id && (
            <div className="scan-vulns-expanded">
              {loadingVulns === scan.id ? (
                <div className="scan-vulns-loading">Loading vulnerabilities...</div>
              ) : getMatchingVulns(scan.id).length === 0 ? (
                <div className="scan-vulns-empty">
                  {severityFilter === 'all'
                    ? 'No vulnerabilities found for this scan.'
                    : `No ${severityFilter} vulnerabilities found for this scan.`}
                </div>
              ) : (
                getMatchingVulns(scan.id).map((vuln, vIdx) => {
                  const sev = (vuln.severity || '').toLowerCase();
                  return (
                    <div key={vuln.id || vIdx} className="vuln-detail-item">
                      <div className="vuln-detail-header">
                        <span className={`severity-badge severity-${sev}`}>{vuln.severity}</span>
                        <span className="vuln-detail-type">{vuln.type}</span>
                      </div>
                      {vuln.description && <p className="vuln-detail-description">{vuln.description}</p>}
                      {vuln.location && (
                        <div className="vuln-detail-meta">
                          <span className="vuln-detail-icon">📍</span>
                          <span className="vuln-detail-text"><strong>Location:</strong> {vuln.location}</span>
                        </div>
                      )}
                      {vuln.recommendation && (
                        <div className="vuln-detail-meta">
                          <span className="vuln-detail-icon">💡</span>
                          <span className="vuln-detail-text"><strong>Fix:</strong> {vuln.recommendation}</span>
                        </div>
                      )}
                      {vuln.detectedAt && (
                        <div className="vuln-detail-meta">
                          <span className="vuln-detail-icon">🕐</span>
                          <span className="vuln-detail-text">Detected: {new Date(vuln.detectedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {vuln.type && (
                        <button
                          type="button"
                          className="vuln-ask-btn"
                          onClick={() => {
                            // Fire the global ask-channel event. The floating
                            // chat widget listens at window level, opens itself,
                            // and sends this question to the AI.
                            window.dispatchEvent(new CustomEvent('baseera-ask', {
                              detail: { question: `How do I fix ${vuln.type}?` }
                            }));
                          }}
                          title="Ask Baseera AI how to fix this"
                        >
                          <span className="vuln-ask-icon">💬</span>
                          Ask Baseera how to fix this
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  </section>
)}
    {/* ANALYTICS TAB CONTENT */}
{activeTab === 'analytics' && (
  <section className="analytics-section">
    <div className="analytics-container">
      {totalVulns === 0 ? (
        <div className="analytics-box" style={{width: '100%', textAlign: 'center', padding: '40px'}}>
          <p style={{color: '#90A1B9', fontFamily: 'Arimo', fontSize: '16px'}}>No scan data available</p>
        </div>
      ) : (
        <>
          {/* Left Section - Severity Distribution */}
          <div className="analytics-box">
            <h3 className="analytics-title">Severity Distribution</h3>
            <div className="analytics-severity-items">
              <div className="analytics-severity-row">
                <div className="analytics-severity-left">
                  <div className="analytics-severity-badge analytics-severity-critical">{totalCritical}</div>
                  <span className="analytics-severity-label">Critical</span>
                </div>
                <div className="analytics-severity-right">
                  <div className="analytics-severity-bar-container">
                    <div className="analytics-severity-bar analytics-bar-critical" style={{width: `${totalVulns > 0 ? Math.round(totalCritical / totalVulns * 100) : 0}%`}}></div>
                  </div>
                  <div className="analytics-severity-stats">
                    <span className="analytics-severity-number">{totalVulns > 0 ? Math.round(totalCritical / totalVulns * 100) : 0}</span>
                    <span className="analytics-severity-percent">%</span>
                  </div>
                </div>
              </div>
              <div className="analytics-severity-row">
                <div className="analytics-severity-left">
                  <div className="analytics-severity-badge analytics-severity-high">{totalHigh}</div>
                  <span className="analytics-severity-label">High</span>
                </div>
                <div className="analytics-severity-right">
                  <div className="analytics-severity-bar-container">
                    <div className="analytics-severity-bar analytics-bar-high" style={{width: `${totalVulns > 0 ? Math.round(totalHigh / totalVulns * 100) : 0}%`}}></div>
                  </div>
                  <div className="analytics-severity-stats">
                    <span className="analytics-severity-number">{totalVulns > 0 ? Math.round(totalHigh / totalVulns * 100) : 0}</span>
                    <span className="analytics-severity-percent">%</span>
                  </div>
                </div>
              </div>
              <div className="analytics-severity-row">
                <div className="analytics-severity-left">
                  <div className="analytics-severity-badge analytics-severity-medium">{totalMedium}</div>
                  <span className="analytics-severity-label">Medium</span>
                </div>
                <div className="analytics-severity-right">
                  <div className="analytics-severity-bar-container">
                    <div className="analytics-severity-bar analytics-bar-medium" style={{width: `${totalVulns > 0 ? Math.round(totalMedium / totalVulns * 100) : 0}%`}}></div>
                  </div>
                  <div className="analytics-severity-stats">
                    <span className="analytics-severity-number">{totalVulns > 0 ? Math.round(totalMedium / totalVulns * 100) : 0}</span>
                    <span className="analytics-severity-percent">%</span>
                  </div>
                </div>
              </div>
              <div className="analytics-severity-row">
                <div className="analytics-severity-left">
                  <div className="analytics-severity-badge analytics-severity-low">{totalLow}</div>
                  <span className="analytics-severity-label">Low</span>
                </div>
                <div className="analytics-severity-right">
                  <div className="analytics-severity-bar-container">
                    <div className="analytics-severity-bar analytics-bar-low" style={{width: `${totalVulns > 0 ? Math.round(totalLow / totalVulns * 100) : 0}%`}}></div>
                  </div>
                  <div className="analytics-severity-stats">
                    <span className="analytics-severity-number">{totalVulns > 0 ? Math.round(totalLow / totalVulns * 100) : 0}</span>
                    <span className="analytics-severity-percent">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  </section>
)}

    </>
  );
}

export default Bugs ;