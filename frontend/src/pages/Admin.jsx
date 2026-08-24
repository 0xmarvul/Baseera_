import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { adminApi } from "../api/adminApi";
import { showToast } from "../components/Toast";
import "../dashboard.css";
import "../admin.css";

function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [menuId, setMenuId] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.getUsers()])
      .then(([s, u]) => {
        if (s.success) setStats(s.data);
        if (u.success) setUsers(u.data || []);
      })
      .catch(() => { showToast("Admin access required.", { type: "error" }); navigate("/bugs"); })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (menuId == null) return;
    const close = (e) => { if (!e.target.closest?.(".aacts")) setMenuId(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuId]);

  const applyUser = (u) => setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));

  const patch = async (id, data) => {
    setMenuId(null);
    try {
      const res = await adminApi.updateUser(id, data);
      if (res.success) { applyUser(res.data); showToast("User updated"); }
      else showToast(res.message || "Update failed", { type: "error" });
    } catch (err) { showToast(err.response?.data?.message || "Update failed", { type: "error" }); }
  };

  const resetPw = async (id) => {
    setMenuId(null);
    try { const res = await adminApi.resetUserPassword(id); showToast(res.message || "Password reset email sent"); }
    catch (err) { showToast(err.response?.data?.message || "Failed to send reset", { type: "error" }); }
  };

  const removeUser = async (id) => {
    setMenuId(null);
    if (!window.confirm("Delete this user permanently? This cannot be undone.")) return;
    try {
      const res = await adminApi.deleteUser(id);
      if (res.success) { setUsers((prev) => prev.filter((x) => x.id !== id)); showToast("User deleted"); }
    } catch (err) { showToast(err.response?.data?.message || "Failed to delete user", { type: "error" }); }
  };

  const openEdit = (u) => { setMenuId(null); setEditUser(u); setEditForm({ firstName: u.firstName, lastName: u.lastName, username: u.username, email: u.email, country: u.country || "" }); };
  const saveEdit = async () => { const id = editUser.id; setEditUser(null); await patch(id, editForm); };

  const shown = users.filter((u) => {
    if (filter === "verified" && !u.isEmailVerified) return false;
    if (filter === "unverified" && u.isEmailVerified) return false;
    if (filter === "inactive" && u.isActive) return false;
    if (q) { const s = `${u.firstName} ${u.lastName} ${u.username} ${u.email}`.toLowerCase(); if (!s.includes(q)) return false; }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="admin">
        <div className="topbar">
          <div>
            <h1>Admin panel</h1>
            <div className="sub">{stats ? <><b>{stats.totalUsers} users</b> · <b>{stats.totalScans} scans</b> · <b>{stats.totalFindings} findings</b> across the platform</> : "Loading…"}</div>
          </div>
        </div>

        {loading ? (
          <div className="aloading">Loading admin data…</div>
        ) : (
          <>
            <div className="atiles">
              <Tile label="Total users" icon={<UsersIcon />} num={stats?.totalUsers ?? 0} sub={`${stats?.verifiedUsers ?? 0} verified`} />
              <Tile label="Verified" icon={<CheckIcon />} num={stats?.verifiedUsers ?? 0} sub={`${stats?.unverifiedUsers ?? 0} pending`} color="var(--teal)" />
              <Tile label="Total scans" icon={<ShieldIcon />} num={stats?.totalScans ?? 0} sub="across the platform" />
              <Tile label="Findings" icon={<BarIcon />} num={stats?.totalFindings ?? 0} sub="all severities" />
            </div>

            <div className="card">
              <div className="card-h"><h3>Vulnerabilities found across all scans</h3><span className="mono">{stats?.totalFindings ?? 0} total</span></div>
              <div className="asev-grid">
                <Sev cls="c" label="Critical" n={stats?.critical ?? 0} />
                <Sev cls="h" label="High" n={stats?.high ?? 0} />
                <Sev cls="m" label="Medium" n={stats?.medium ?? 0} />
                <Sev cls="l" label="Low" n={stats?.low ?? 0} />
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h3>Users</h3><span className="mono">{shown.length} of {users.length}</span></div>
              <div className="tbl-toolbar" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="search" style={{ flex: 1, minWidth: 220 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input placeholder="Search name, email, username…" value={q} onChange={(e) => setQ(e.target.value.toLowerCase().trim())} />
                </div>
                <div className="filters">
                  {["all", "verified", "unverified", "inactive"].map((f) => (
                    <span key={f} className={`fpill ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</span>
                  ))}
                </div>
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>User</th><th>Username</th><th>Email</th><th>Country</th><th>Role</th><th>Verified</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {shown.map((u) => (
                      <tr key={u.id}>
                        <td><div className="u-cell"><div className="u-av">{(u.firstName[0] || '') + (u.lastName[0] || '')}</div><div className="u-name">{u.firstName} {u.lastName}</div></div></td>
                        <td className="u-mono">@{u.username}</td>
                        <td className="u-mono">{u.email}</td>
                        <td className="u-country">{u.country || '—'}</td>
                        <td><span className={`arole ${u.role === 'Admin' ? 'admin' : ''}`}>{u.role}</span></td>
                        <td><span className={`apill ${u.isEmailVerified ? 'yes' : 'no'}`} onClick={() => patch(u.id, { isEmailVerified: !u.isEmailVerified })}><span className="d"></span>{u.isEmailVerified ? 'Verified' : 'Pending'}</span></td>
                        <td><span className={`apill ${u.isActive ? 'active' : 'inactive'}`} onClick={() => patch(u.id, { isActive: !u.isActive })}><span className="d"></span>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <div className="aacts">
                            <button className="aact" title="Edit" onClick={() => openEdit(u)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></svg></button>
                            <button className="aact" title="More" onClick={() => setMenuId(menuId === u.id ? null : u.id)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg></button>
                            {menuId === u.id && (
                              <div className="amenu">
                                {!u.isEmailVerified && <button onClick={() => patch(u.id, { isEmailVerified: true })}><CheckIcon />Verify email</button>}
                                <button onClick={() => patch(u.id, { isActive: !u.isActive })}>{u.isActive ? 'Deactivate' : 'Activate'} account</button>
                                <button onClick={() => resetPw(u.id)}><ResetIcon />Send password reset</button>
                                <button onClick={() => patch(u.id, { role: u.role === 'Admin' ? 'User' : 'Admin' })}><ShieldIcon />{u.role === 'Admin' ? 'Remove admin' : 'Make admin'}</button>
                                <div className="sep"></div>
                                <button className="danger" onClick={() => removeUser(u.id)}><TrashIcon />Delete user</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {shown.length === 0 && <tr><td colSpan="8" style={{ color: 'var(--t3)', fontFamily: 'var(--fm)', fontSize: 13 }}>No users match your filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {editUser && (
          <div className="b-modal" role="dialog" aria-modal="true">
            <div className="b-modal-back" onClick={() => setEditUser(null)} />
            <div className="b-modal-card" style={{ maxWidth: 460, textAlign: 'left' }}>
              <h3 style={{ fontFamily: 'var(--fd)', fontSize: 18, marginBottom: 16 }}>Edit user</h3>
              <div className="b-row2">
                <div className="b-field"><label className="b-label">First name</label><input className="b-input" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
                <div className="b-field"><label className="b-label">Last name</label><input className="b-input" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
              </div>
              <div className="b-field"><label className="b-label">Username</label><input className="b-input" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} /></div>
              <div className="b-field"><label className="b-label">Email</label><input className="b-input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div className="b-field"><label className="b-label">Country</label><input className="b-input" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="b-btn b-btn--primary" onClick={saveEdit}>Save changes</button>
                <button className="b-btn b-btn--ghost" onClick={() => setEditUser(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Tile({ label, icon, num, sub, color }) {
  return (<div className="atile"><div className="tl">{icon}{label}</div><div className="num" style={color ? { color } : undefined}>{num}</div><div className="sub">{sub}</div></div>);
}
function Sev({ cls, label, n }) {
  return (<div className={`asev ${cls}`}><div className="lbl">{label}</div><div className="n">{n}</div></div>);
}

const UsersIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>);
const CheckIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>);
const ShieldIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7z" /></svg>);
const BarIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>);
const ResetIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>);
const TrashIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>);

export default Admin;
