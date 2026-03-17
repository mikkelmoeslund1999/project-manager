"use client";
import { useState, useEffect, useRef, useMemo } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

let USERS = [];

const COLUMNS = ["Backlog", "To Do", "In Progress", "Review", "Done"];
const PRIORITIES = ["low", "medium", "high", "critical"];


// ─── Helpers ─────────────────────────────────────────────────────────────────

const getUser = (id) => USERS.find((u) => u.id === id) || { id: id || "?", name: "Unknown", avatar: "?", color: "#888", role: "Member", email: "" };
const getAssigneeIds = (t) => t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const timeAgo = (d) => {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};

const prioC = {
  critical: { bg: "rgba(255,69,58,0.12)", fg: "#ff453a", label: "Critical" },
  high:     { bg: "rgba(255,159,10,0.12)", fg: "#ff9f0a", label: "High" },
  medium:   { bg: "rgba(255,214,10,0.12)", fg: "#ffd60a", label: "Medium" },
  low:      { bg: "rgba(48,209,88,0.12)",  fg: "#30d158", label: "Low" },
};

const statusC = { on_track: { c: "#30d158", l: "On Track" }, at_risk: { c: "#ff9f0a", l: "At Risk" }, behind: { c: "#ff453a", l: "Behind" } };

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

const I = ({ d, size = 18, className = "", style: s = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={s}>{d}</svg>
);

const Icons = {
  dashboard: (p) => <I {...p} d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>} />,
  kanban: (p) => <I {...p} d={<><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></>} />,
  tasks: (p) => <I {...p} d={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>} />,
  team: (p) => <I {...p} d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>} />,
  timeline: (p) => <I {...p} d={<><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="18" x2="18" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></>} />,
  activity: (p) => <I {...p} d={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>} />,
  plus: (p) => <I {...p} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />,
  x: (p) => <I {...p} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />,
  search: (p) => <I {...p} d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />,
  filter: (p) => <I {...p} d={<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>} />,
  edit: (p) => <I {...p} d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />,
  moon: (p) => <I {...p} d={<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>} />,
  sun: (p) => <I {...p} d={<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>} />,
  msg: (p) => <I {...p} d={<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>} />,
  clock: (p) => <I {...p} d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />,
  menu: (p) => <I {...p} d={<><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>} />,
};

// ─── Micro Components ────────────────────────────────────────────────────────

const Av = ({ user, size = 30 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", background: user.color,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontSize: size * 0.36, fontWeight: 700, flexShrink: 0, letterSpacing: 0.4,
  }}>{user.avatar}</div>
);

const Badge = ({ children, fg, bg }) => (
  <span style={{
    display: "inline-flex", padding: "3px 8px", borderRadius: 6,
    fontSize: 11, fontWeight: 600, color: fg, background: bg,
    letterSpacing: 0.1, whiteSpace: "nowrap",
  }}>{children}</span>
);

const Btn = ({ children, variant = "primary", onClick, style: s = {}, icon, ...r }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    borderRadius: 9, cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 500,
    fontSize: 13, padding: "7px 14px", transition: "all 0.12s ease", whiteSpace: "nowrap",
    letterSpacing: -0.1,
  };
  const vars = {
    primary:   { background: "var(--accent)", color: "#fff", border: "none" },
    secondary: { background: "var(--btn-secondary-bg)", color: "var(--text-primary)", border: "1px solid var(--border)" },
    ghost:     { background: "transparent", color: "var(--text-secondary)", border: "none", padding: "6px 8px" },
    cta:       { background: "var(--green)", color: "#fff", border: "none" },
  };
  return <button onClick={onClick} style={{ ...base, ...vars[variant], ...s }} {...r}>{icon}{children}</button>;
};

const Bar = ({ value, h = 3, color = "var(--accent)" }) => (
  <div style={{ width: "100%", height: h, background: "var(--bg-tertiary)", borderRadius: h, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", background: color, borderRadius: h, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
  </div>
);

// ─── Modal ───────────────────────────────────────────────────────────────────

const Modal = ({ open, onClose, title, children, w = 540 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(24px) saturate(200%)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--modal-bg)", borderRadius: 18, width: "100%", maxWidth: w,
        maxHeight: "85vh", overflow: "auto",
        boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.12)",
        animation: "scaleIn 0.18s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--modal-bg)", zIndex: 1, borderRadius: "18px 18px 0 0" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "var(--bg-tertiary)", border: "none", cursor: "pointer", color: "var(--text-tertiary)", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {Icons.x({ size: 14 })}
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const Sidebar = ({ view, setView, dark, setDark, projects, mobOpen, setMobOpen, onNewProject }) => {
  const nav = [
    { id: "dashboard", icon: Icons.dashboard, label: "Dashboard" },
    { id: "kanban", icon: Icons.kanban, label: "Board" },
    { id: "tasks", icon: Icons.tasks, label: "Tasks" },
    { id: "team", icon: Icons.team, label: "Team" },
    { id: "timeline", icon: Icons.timeline, label: "Timeline" },
    { id: "activity", icon: Icons.activity, label: "Activity" },
  ];

  const content = (
    <div style={{ width: 220, height: "100%", background: "var(--sidebar-bg)", backdropFilter: "blur(40px) saturate(200%)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 14px 10px", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>P</div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.4 }}>Planwise</div>
      </div>

      <nav style={{ padding: "6px 8px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", padding: "14px 8px 5px", letterSpacing: 0.2 }}>Views</div>
        {nav.map((n) => (
          <button key={n.id} onClick={() => { setView(n.id); setMobOpen(false); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "7px 9px",
              border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13,
              fontFamily: "var(--font-sans)", fontWeight: 400, marginBottom: 1,
              background: view === n.id ? "var(--sidebar-active)" : "transparent",
              color: view === n.id ? "var(--text-primary)" : "var(--text-secondary)",
              transition: "background 0.1s",
            }}>
            <span style={{ opacity: view === n.id ? 1 : 0.7, color: view === n.id ? "var(--accent)" : "inherit" }}>{n.icon({ size: 15 })}</span>
            {n.label}
          </button>
        ))}

        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", padding: "18px 8px 5px", letterSpacing: 0.2 }}>Projects</div>
        {projects.map((p) => (
          <button key={p.id} onClick={() => { setView("kanban"); setMobOpen(false); }} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 9px",
            border: "none", borderRadius: 7, background: "transparent", color: "var(--text-secondary)",
            cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 400, marginBottom: 1,
            transition: "background 0.1s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--sidebar-active)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
          </button>
        ))}
        <button onClick={() => { onNewProject(); setMobOpen(false); }} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 9px",
          border: "none", borderRadius: 7, background: "transparent", color: "var(--text-tertiary)",
          cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 400, marginTop: 2,
          transition: "background 0.1s",
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--sidebar-active)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
          {Icons.plus({ size: 13 })}
          <span>New Project</span>
        </button>
      </nav>

      <div style={{ padding: "8px 10px 12px", borderTop: "1px solid var(--border)" }}>
        <button onClick={() => setDark(!dark)} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "7px 10px",
          border: "1px solid var(--border)", borderRadius: 8, background: "transparent", color: "var(--text-tertiary)",
          cursor: "pointer", fontSize: 12.5, fontFamily: "var(--font-sans)", fontWeight: 400,
          transition: "all 0.1s",
        }}>
          {dark ? Icons.sun({ size: 14 }) : Icons.moon({ size: 14 })}
          {dark ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="sidebar-desktop" style={{ display: "none", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50 }}>{content}</div>
      {mobOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          <div onClick={() => setMobOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />
          <div style={{ position: "relative", zIndex: 1, height: "100%", animation: "slideIn 0.2s ease" }}>{content}</div>
        </div>
      )}
    </>
  );
};

// ─── Header ──────────────────────────────────────────────────────────────────

const Header = ({ title, sub, setMobOpen, children }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid var(--border)", background: "var(--header-bg)", backdropFilter: "blur(40px) saturate(200%)", flexWrap: "wrap", gap: 10, position: "sticky", top: 0, zIndex: 40 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button className="mob-menu" onClick={() => setMobOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", padding: 4, display: "none" }}>
        {Icons.menu({ size: 20 })}
      </button>
      <div>
        <h1 style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.4 }}>{title}</h1>
        {sub && <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 1 }}>{sub}</p>}
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
  </div>
);

// ─── Dashboard ───────────────────────────────────────────────────────────────

const DashboardView = ({ projects, tasks, activities, onDeleteProject }) => {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "Done").length;
  const active = tasks.filter((t) => t.status === "In Progress").length;
  const overdue = tasks.filter((t) => daysUntil(t.dueDate) < 0 && t.status !== "Done").length;

  const stats = [
    { label: "Total Tasks", val: total, c: "var(--accent)", icon: Icons.tasks },
    { label: "Completed", val: done, c: "#22c55e", icon: Icons.tasks },
    { label: "In Progress", val: active, c: "#eab308", icon: Icons.clock },
    { label: "Overdue", val: overdue, c: "#ef4444", icon: Icons.clock },
  ];

  const getProg = (pid) => {
    const pt = tasks.filter((t) => t.projectId === pid);
    return pt.length ? Math.round((pt.filter((t) => t.status === "Done").length / pt.length) * 100) : 0;
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{
            background: "var(--bg-card)", borderRadius: 14, padding: "20px 22px",
            border: "1px solid var(--border)",
            animation: `fadeIn 0.35s ease ${i * 60}ms both`,
            boxShadow: "var(--shadow-card)",
          }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 400, marginBottom: 10 }}>{s.label}</p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <p style={{ fontSize: 36, fontWeight: 700, letterSpacing: -2, color: "var(--text-primary)", lineHeight: 1 }}>{s.val}</p>
              <div style={{ color: s.c, opacity: 0.9 }}>{s.icon({ size: 22 })}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)", letterSpacing: -0.1 }}>Projects</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginBottom: 32 }}>
        {projects.map((p, i) => {
          const prog = getProg(p.id);
          const pt = tasks.filter((t) => t.projectId === p.id);
          const sc = statusC[p.status];
          const dl = daysUntil(p.deadline);
          const team = [...new Set(pt.flatMap((t) => getAssigneeIds(t)))];
          return (
            <div key={p.id} className="project-card" style={{
              background: "var(--bg-card)", borderRadius: 14, padding: 20,
              border: "1px solid var(--border)",
              animation: `fadeIn 0.35s ease ${i * 75}ms both`,
              boxShadow: "var(--shadow-card)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>{p.name}</h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Badge fg={sc.c} bg={sc.c + "18"}>{sc.l}</Badge>
                  <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) onDeleteProject(p.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", padding: 3, borderRadius: 6, transition: "color 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}>
                    {Icons.x({ size: 14 })}
                  </button>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>{p.description}</p>
              <Bar value={prog} color={p.color} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11.5, color: "var(--text-tertiary)", fontWeight: 500 }}>
                <span>{prog}% complete</span>
                <span>{pt.filter((t) => t.status === "Done").length}/{pt.length} tasks</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", marginLeft: -4 }}>
                  {team.slice(0, 4).map((uid, j) => (
                    <div key={uid} style={{ marginLeft: j > 0 ? -6 : 0, border: "2px solid var(--bg-card)", borderRadius: "50%" }}><Av user={getUser(uid)} size={26} /></div>
                  ))}
                </div>
                <span style={{ fontSize: 11.5, color: dl < 7 ? "#ef4444" : "var(--text-tertiary)", fontWeight: dl < 7 ? 700 : 500 }}>
                  {dl > 0 ? `${dl}d left` : `${Math.abs(dl)}d overdue`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--text-secondary)", letterSpacing: -0.1 }}>Activity</h2>
      <div style={{ background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
        {activities.slice(0, 6).map((a, i) => <ActivityRow key={a.id} a={a} i={i} />)}
      </div>
    </div>
  );
};

// ─── Kanban ──────────────────────────────────────────────────────────────────

const KanbanView = ({ tasks, setTasks, projects, onTask, onNew }) => {
  const [proj, setProj] = useState("all");
  const [dragged, setDragged] = useState(null);
  const ft = proj === "all" ? tasks : tasks.filter((t) => t.projectId === proj);

  const drop = (col) => {
    if (!dragged) return;
    setTasks((prev) => prev.map((t) => t.id === dragged.id ? { ...t, status: col } : t));
    setDragged(null);
  };

  return (
    <div>
      <div style={{ padding: "10px 24px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--border)" }}>
        {Icons.filter({ size: 14, style: { color: "var(--text-tertiary)" } })}
        <select value={proj} onChange={(e) => setProj(e.target.value)} style={{ width: "auto", fontSize: 12.5, padding: "5px 28px 5px 10px" }}>
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 14, padding: 18, overflowX: "auto", minHeight: "calc(100vh - 130px)", alignItems: "flex-start" }}>
        {COLUMNS.map((col) => {
          const ct = ft.filter((t) => t.status === col);
          return (
            <div key={col} onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("kanban-col-over"); }} onDragLeave={(e) => e.currentTarget.classList.remove("kanban-col-over")} onDrop={(e) => { e.currentTarget.classList.remove("kanban-col-over"); drop(col); }}
              style={{ minWidth: 262, width: 262, flexShrink: 0, background: "var(--kanban-bg)", borderRadius: 14, padding: 8, display: "flex", flexDirection: "column", border: "1px solid var(--border)", transition: "box-shadow 0.2s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{col}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: 10, fontFamily: "var(--font-display)" }}>{ct.length}</span>
                </div>
                <button onClick={() => onNew(col)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", padding: 2 }}>
                  {Icons.plus({ size: 15 })}
                </button>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                {ct.map((task) => {
                  const assignees = getAssigneeIds(task).map(getUser);
                  const pc = prioC[task.priority];
                  const dl = daysUntil(task.dueDate);
                  const pr = projects.find((p) => p.id === task.projectId);
                  return (
                    <div key={task.id} draggable onDragStart={() => setDragged(task)} onClick={() => onTask(task)}
                      className="kanban-card"
                      style={{
                        background: "var(--bg-secondary)", borderRadius: 11, padding: "13px 14px",
                        border: "1px solid var(--border)", cursor: "grab",
                        boxShadow: "var(--shadow-card)",
                        animation: `fadeIn 0.25s ease both`,
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                        {pr && <div style={{ width: 6, height: 6, borderRadius: "50%", background: pr.color }} />}
                        <span style={{ fontSize: 10.5, color: "var(--text-tertiary)", fontWeight: 500 }}>{pr?.name}</span>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 10 }}>{task.title}</p>
                      {task.subtasks > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <Bar value={(task.subtasksDone / task.subtasks) * 100} h={3} color={task.subtasksDone === task.subtasks ? "#22c55e" : "var(--accent)"} />
                          <span style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 3, display: "block" }}>{task.subtasksDone}/{task.subtasks} subtasks</span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Badge fg={pc.fg} bg={pc.bg}>{pc.label}</Badge>
                          {dl <= 3 && dl >= 0 && task.status !== "Done" && <span style={{ fontSize: 10.5, color: "#ef4444", fontWeight: 700 }}>{dl}d</span>}
                        </div>
                        <div style={{ display: "flex" }}>{assignees.map((a, j) => <div key={a.id} style={{ marginLeft: j > 0 ? -6 : 0, border: "2px solid var(--bg-card)", borderRadius: "50%" }}><Av user={a} size={22} /></div>)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Task List ───────────────────────────────────────────────────────────────

const TaskListView = ({ tasks, projects, onTask }) => {
  const [search, setSearch] = useState("");
  const [fPrio, setFPrio] = useState("all");
  const [fProj, setFProj] = useState("all");
  const [sort, setSort] = useState("dueDate");

  const filtered = useMemo(() => {
    let r = [...tasks];
    if (search) r = r.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
    if (fPrio !== "all") r = r.filter((t) => t.priority === fPrio);
    if (fProj !== "all") r = r.filter((t) => t.projectId === fProj);
    if (sort === "dueDate") r.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    else { const o = { critical: 0, high: 1, medium: 2, low: 3 }; r.sort((a, b) => o[a.priority] - o[b.priority]); }
    return r;
  }, [tasks, search, fPrio, fProj, sort]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 300 }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", display: "flex" }}>{Icons.search({ size: 14 })}</div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." style={{ paddingLeft: 32 }} />
        </div>
        <select value={fPrio} onChange={(e) => setFPrio(e.target.value)} style={{ width: "auto", padding: "8px 28px 8px 10px" }}>
          <option value="all">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select value={fProj} onChange={(e) => setFProj(e.target.value)} style={{ width: "auto", padding: "8px 28px 8px 10px" }}>
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: "auto", padding: "8px 28px 8px 10px" }}>
          <option value="dueDate">Due Date</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      <div style={{ background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Task", "Project", "Priority", "Status", "Assignee", "Due", "Hrs"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10.5, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: 0.6, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const assignees = getAssigneeIds(t).map(getUser);
                const pc = prioC[t.priority];
                const pr = projects.find((p) => p.id === t.projectId);
                return (
                  <tr key={t.id} onClick={() => onTask(t)} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {t.title}
                        {t.tags.map((tag) => <span key={tag} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--accent-bg)", color: "var(--accent)", fontWeight: 600 }}>{tag}</span>)}
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: pr?.color }} />{pr?.name}
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px" }}><Badge fg={pc.fg} bg={pc.bg}>{pc.label}</Badge></td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 11.5, padding: "3px 10px", borderRadius: 20, background: t.status === "Done" ? "rgba(34,197,94,0.1)" : "var(--bg-tertiary)", color: t.status === "Done" ? "#22c55e" : "var(--text-secondary)", fontWeight: 600 }}>{t.status}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ display: "flex" }}>{assignees.map((a, j) => <div key={a.id} style={{ marginLeft: j > 0 ? -6 : 0, border: "2px solid var(--bg-card)", borderRadius: "50%" }}><Av user={a} size={20} /></div>)}</div>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{assignees.map((a) => a.name).join(", ")}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: daysUntil(t.dueDate) < 0 && t.status !== "Done" ? "#ef4444" : "var(--text-secondary)", whiteSpace: "nowrap", fontWeight: 500 }}>{fmtDate(t.dueDate)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>{t.estimatedHours}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 48, color: "var(--text-tertiary)" }}>No tasks match filters</div>}
      </div>
    </div>
  );
};

// ─── Task Detail ─────────────────────────────────────────────────────────────

const TaskDetail = ({ task, open, onClose, comments, onComment, onUpdate, projects, members }) => {
  const [nc, setNc] = useState("");
  const [editing, setEditing] = useState(false);
  const [ef, setEf] = useState({});
  useEffect(() => { if (task) setEf({ ...task }); }, [task]);
  if (!task) return null;

  const assignees = getAssigneeIds(task).map(getUser);
  const pc = prioC[task.priority];
  const tc = comments.filter((c) => c.taskId === task.id);
  const pr = projects.find((p) => p.id === task.projectId);

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Task" : task.title} w={580}>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Title
            <input value={ef.title || ""} onChange={(e) => setEf({ ...ef, title: e.target.value })} style={{ marginTop: 4 }} /></label>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Description
            <textarea rows={3} value={ef.description || ""} onChange={(e) => setEf({ ...ef, description: e.target.value })} style={{ marginTop: 4 }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Priority
              <select value={ef.priority} onChange={(e) => setEf({ ...ef, priority: e.target.value })} style={{ marginTop: 4 }}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select></label>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Status
              <select value={ef.status} onChange={(e) => setEf({ ...ef, status: e.target.value })} style={{ marginTop: 4 }}>
                {COLUMNS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></label>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Project
              <select value={ef.projectId || ""} onChange={(e) => setEf({ ...ef, projectId: e.target.value })} style={{ marginTop: 4 }}>
                <option value="">— No project —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></label>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Assignees
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
                {members.map((m) => {
                  const ids = getAssigneeIds(ef);
                  return (
                    <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 400, cursor: "pointer" }}>
                      <input type="checkbox" checked={ids.includes(m.id)} onChange={(e) => {
                        const next = e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id);
                        setEf({ ...ef, assigneeIds: next });
                      }} />
                      {m.name}
                    </label>
                  );
                })}
              </div></label>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Due Date
              <input type="date" value={ef.dueDate || ""} onChange={(e) => setEf({ ...ef, dueDate: e.target.value })} style={{ marginTop: 4 }} /></label>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setEditing(false)}>Cancel</Btn>
            <Btn onClick={() => { onUpdate(ef); setEditing(false); }}>Save</Btn>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <Badge fg={pc.fg} bg={pc.bg}>{pc.label}</Badge>
            <span style={{ fontSize: 11.5, padding: "3px 10px", borderRadius: 20, background: task.status === "Done" ? "rgba(34,197,94,0.1)" : "var(--bg-tertiary)", color: task.status === "Done" ? "#22c55e" : "var(--text-secondary)", fontWeight: 600 }}>{task.status}</span>
            {pr && <span style={{ fontSize: 11.5, padding: "3px 10px", borderRadius: 20, background: pr.color + "18", color: pr.color, fontWeight: 600 }}>{pr.name}</span>}
          </div>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 18 }}>{task.description}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18, padding: 16, background: "var(--bg-tertiary)", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex" }}>{assignees.map((a, j) => <div key={a.id} style={{ marginLeft: j > 0 ? -6 : 0, border: "2px solid var(--bg-tertiary)", borderRadius: "50%" }}><Av user={a} size={24} /></div>)}</div>
              <div><p style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>Assignees</p><p style={{ fontSize: 12.5, fontWeight: 600 }}>{assignees.map((a) => a.name).join(", ") || "—"}</p></div>
            </div>
            <div><p style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>Due Date</p><p style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtDate(task.dueDate)}</p></div>
            <div><p style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>Est. Hours</p><p style={{ fontSize: 12.5, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{task.estimatedHours}h</p></div>
            <div><p style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>Subtasks</p><p style={{ fontSize: 12.5, fontWeight: 600 }}>{task.subtasksDone}/{task.subtasks}</p></div>
          </div>
          <Btn variant="secondary" onClick={() => setEditing(true)} icon={Icons.edit({ size: 14 })} style={{ marginBottom: 20 }}>Edit Task</Btn>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            <h4 style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Comments ({tc.length})</h4>
            {tc.map((c) => {
              const a = getUser(c.authorId);
              return (
                <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <Av user={a} size={26} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{a.name}</span>
                      <span style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{c.content}</p>
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={nc} onChange={(e) => setNc(e.target.value)} placeholder="Write a comment..."
                onKeyDown={(e) => { if (e.key === "Enter" && nc.trim()) { onComment(task.id, nc); setNc(""); } }} />
              <Btn onClick={() => { if (nc.trim()) { onComment(task.id, nc); setNc(""); } }}>Send</Btn>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─── New Task Modal ──────────────────────────────────────────────────────────

const NewTaskModal = ({ open, onClose, onSave, projects, defaultStatus, members }) => {
  const [f, setF] = useState({ title: "", description: "", priority: "medium", status: defaultStatus || "To Do", assigneeIds: members[0] ? [members[0].id] : [], projectId: "", dueDate: "2026-04-01", estimatedHours: 8 });
  useEffect(() => { if (defaultStatus) setF((p) => ({ ...p, status: defaultStatus })); }, [defaultStatus]);
  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Title *
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="What needs to be done?" autoFocus style={{ marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Description
          <textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Details..." style={{ marginTop: 4 }} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Project
            <select value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })} style={{ marginTop: 4 }}>
              <option value="">— No project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Priority
            <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} style={{ marginTop: 4 }}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
            </select></label>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Assignees
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
              {members.map((m) => (
                <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 400, cursor: "pointer" }}>
                  <input type="checkbox" checked={f.assigneeIds.includes(m.id)} onChange={(e) => {
                    const next = e.target.checked ? [...f.assigneeIds, m.id] : f.assigneeIds.filter((id) => id !== m.id);
                    setF({ ...f, assigneeIds: next });
                  }} />
                  {m.name}
                </label>
              ))}
            </div></label>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Due Date
            <input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} style={{ marginTop: 4 }} /></label>
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Estimated Hours
          <input type="number" value={f.estimatedHours} onChange={(e) => setF({ ...f, estimatedHours: parseInt(e.target.value) || 0 })} min={0} style={{ marginTop: 4 }} /></label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => { if (!f.title.trim()) return; onSave({ ...f, id: "t" + Date.now(), subtasks: 0, subtasksDone: 0, order: 0, tags: ["new"] }); setF({ title: "", description: "", priority: "medium", status: "To Do", assigneeIds: members[0] ? [members[0].id] : [], projectId: "", dueDate: "2026-04-01", estimatedHours: 8 }); onClose(); }}>Create Task</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ─── New Project Modal ───────────────────────────────────────────────────────

const PROJECT_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

const NewProjectModal = ({ open, onClose, onSave, members }) => {
  const today = new Date().toISOString().split("T")[0];
  const [f, setF] = useState({ name: "", description: "", status: "on_track", owner: members[0]?.id || "", deadline: today, color: "#6366f1" });
  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Name *
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Project name" autoFocus style={{ marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Description
          <textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What is this project about?" style={{ marginTop: 4 }} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Status
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} style={{ marginTop: 4 }}>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="behind">Behind</option>
            </select></label>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Owner
            <select value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} style={{ marginTop: 4 }}>
              {members.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select></label>
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Deadline
          <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} style={{ marginTop: 4 }} /></label>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 8 }}>Color</p>
          <div style={{ display: "flex", gap: 8 }}>
            {PROJECT_COLORS.map((c) => (
              <button key={c} onClick={() => setF({ ...f, color: c })} style={{
                width: 28, height: 28, borderRadius: "50%", background: c, border: f.color === c ? "3px solid var(--text-primary)" : "3px solid transparent",
                cursor: "pointer", flexShrink: 0,
              }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => {
            if (!f.name.trim()) return;
            onSave({ ...f, id: "p" + Date.now(), createdAt: new Date().toISOString().split("T")[0] });
            setF({ name: "", description: "", status: "on_track", owner: members[0]?.id || "", deadline: today, color: "#6366f1" });
            onClose();
          }}>Create Project</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ─── Team ────────────────────────────────────────────────────────────────────

const MEMBER_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

const TeamView = ({ tasks, members, onAdd, onDelete }) => {
  const rc = { Admin: "#6366f1", Manager: "#ec4899", Member: "#22c55e", Viewer: "#8b5cf6" };
  const [modalOpen, setModalOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", role: "Member", color: "#6366f1" });

  const handleAdd = () => {
    if (!f.name.trim()) return;
    const initials = f.name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    onAdd({ id: "u" + Date.now(), name: f.name.trim(), email: f.email.trim(), avatar: initials, role: f.role, color: f.color });
    setF({ name: "", email: "", role: "Member", color: "#6366f1" });
    setModalOpen(false);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn onClick={() => setModalOpen(true)} icon={Icons.plus({ size: 14 })}>Add Member</Btn>
      </div>
      {members.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-tertiary)" }}>No team members yet. Add your first member!</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {members.map((user, i) => {
          const ut = tasks.filter((t) => getAssigneeIds(t).includes(user.id));
          const done = ut.filter((t) => t.status === "Done").length;
          const active = ut.filter((t) => t.status === "In Progress").length;
          const totalH = ut.reduce((s, t) => s + t.estimatedHours, 0);
          const doneH = ut.filter((t) => t.status === "Done").reduce((s, t) => s + t.estimatedHours, 0);
          return (
            <div key={user.id} className="team-card" style={{ background: "var(--bg-card)", borderRadius: 14, padding: 20, border: "1px solid var(--border)", animation: `fadeIn 0.35s ease ${i * 60}ms both`, position: "relative", boxShadow: "var(--shadow-card)" }}>
              <button onClick={() => onDelete(user.id)} style={{ position: "absolute", top: 12, right: 12, background: "var(--bg-tertiary)", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4, borderRadius: 6, display: "flex" }}>
                {Icons.x({ size: 14 })}
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <Av user={user} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>{user.name}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: rc[user.role] + "18", color: rc[user.role], fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>{user.role}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{user.email}</span>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11.5 }}>
                  <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>Workload</span>
                  <span style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>{doneH}/{totalH}h</span>
                </div>
                <Bar value={totalH > 0 ? (doneH / totalH) * 100 : 0} h={5} color={user.color} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[{ l: "Total", v: ut.length, c: "var(--text-primary)" }, { l: "Active", v: active, c: "#eab308" }, { l: "Done", v: done, c: "#22c55e" }].map((s) => (
                  <div key={s.l} style={{ background: "var(--bg-tertiary)", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: s.c, letterSpacing: -0.5 }}>{s.v}</p>
                    <p style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2, fontWeight: 500 }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Member">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Name *
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Full name" autoFocus style={{ marginTop: 4 }}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} /></label>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Email
            <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="email@example.com" style={{ marginTop: 4 }} /></label>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>Role
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} style={{ marginTop: 4 }}>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Member">Member</option>
              <option value="Viewer">Viewer</option>
            </select></label>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 8 }}>Color</p>
            <div style={{ display: "flex", gap: 8 }}>
              {MEMBER_COLORS.map((c) => (
                <button key={c} onClick={() => setF({ ...f, color: c })} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: f.color === c ? "3px solid var(--text-primary)" : "3px solid transparent", cursor: "pointer", flexShrink: 0 }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn onClick={handleAdd}>Add Member</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── Timeline ────────────────────────────────────────────────────────────────

const TimelineView = ({ tasks, projects }) => {
  const [proj, setProj] = useState("all");
  const ft = (proj === "all" ? tasks : tasks.filter((t) => t.projectId === proj)).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const today = new Date();
  const start = new Date(today); start.setDate(start.getDate() - 14);
  const days = 90, dw = 28;
  const off = (d) => Math.floor((new Date(d) - start) / 86400000) * dw;
  const todayOff = off(today.toISOString().split("T")[0]);

  const months = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    if (d.getDate() === 1 || i === 0) months.push({ l: d.toLocaleDateString("en-US", { month: "short" }), o: i * dw });
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 14 }}>
        <select value={proj} onChange={(e) => setProj(e.target.value)} style={{ width: "auto", padding: "6px 28px 6px 10px", fontSize: 12.5 }}>
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{ background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "auto" }}>
        <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 10, background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 200, minWidth: 200, padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", borderRight: "1px solid var(--border)", letterSpacing: 0.5, textTransform: "uppercase" }}>Task</div>
          <div style={{ position: "relative", width: days * dw, height: 36 }}>
            {months.map((m, i) => <div key={i} style={{ position: "absolute", left: m.o, top: 0, padding: "10px 6px", fontSize: 10.5, fontWeight: 700, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{m.l}</div>)}
          </div>
        </div>
        {ft.map((task) => {
          const pr = projects.find((p) => p.id === task.projectId);
          const bStart = off(task.dueDate) - (task.estimatedHours / 8) * dw;
          const bW = Math.max((task.estimatedHours / 8) * dw, dw);
          const isDone = task.status === "Done";
          return (
            <div key={task.id} style={{ display: "flex", borderBottom: "1px solid var(--border)", minHeight: 40 }}>
              <div style={{ width: 200, minWidth: 200, padding: "9px 14px", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: pr?.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isDone ? "line-through" : "none", color: isDone ? "var(--text-tertiary)" : "var(--text-primary)" }}>{task.title}</span>
              </div>
              <div style={{ position: "relative", width: days * dw, height: 40 }}>
                <div style={{ position: "absolute", left: todayOff, top: 0, bottom: 0, width: 2, background: "var(--accent)", opacity: 0.25 }} />
                <div style={{ position: "absolute", left: Math.max(0, bStart), top: 8, width: bW, height: 24, borderRadius: 6, background: isDone ? "#22c55e" : (pr?.color || "var(--accent)"), opacity: isDone ? 0.45 : 0.8, display: "flex", alignItems: "center", paddingLeft: 8 }}>
                  <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}>{fmtDate(task.dueDate)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {ft.length === 0 && <div style={{ textAlign: "center", padding: 48, color: "var(--text-tertiary)" }}>No tasks to display</div>}
      </div>
    </div>
  );
};

// ─── Activity ────────────────────────────────────────────────────────────────

const actCfg = {
  task_completed: { icon: Icons.tasks, c: "#22c55e" },
  task_moved: { icon: Icons.kanban, c: "#6366f1" },
  task_created: { icon: Icons.plus, c: "#3b82f6" },
  comment_added: { icon: Icons.msg, c: "#eab308" },
  member_joined: { icon: Icons.team, c: "#8b5cf6" },
  deadline_warning: { icon: Icons.clock, c: "#ef4444" },
};

const actMsg = (a) => {
  const u = getUser(a.userId);
  const n = <strong>{u.name}</strong>;
  switch (a.type) {
    case "task_completed": return <>{n} completed <strong>{a.meta.title}</strong></>;
    case "task_moved": return <>{n} moved task from {a.meta.from} to <strong>{a.meta.to}</strong></>;
    case "task_created": return <>{n} created <strong>{a.meta.title}</strong></>;
    case "comment_added": return <>{n} commented: &ldquo;{a.meta.preview}&rdquo;</>;
    case "member_joined": return <><strong>{a.meta.name}</strong> joined the project</>;
    case "deadline_warning": return <>Deadline approaching: <strong>{a.meta.title}</strong> ({a.meta.days}d left)</>;
    default: return <>{a.type}</>;
  }
};

const ActivityRow = ({ a, i = 0 }) => {
  const cfg = actCfg[a.type] || { icon: Icons.activity, c: "var(--text-tertiary)" };
  const u = getUser(a.userId);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--border)", animation: `fadeIn 0.3s ease ${i * 40}ms both` }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: cfg.c + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: cfg.c }}>
        {cfg.icon({ size: 14 })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>{actMsg(a)}</p>
        <p style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2 }}>{timeAgo(a.createdAt)}</p>
      </div>
      <Av user={u} size={22} />
    </div>
  );
};

const ActivityView = ({ activities }) => (
  <div style={{ padding: 24 }}>
    <div style={{ background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
      {activities.map((a, i) => <ActivityRow key={a.id} a={a} i={i} />)}
    </div>
  </div>
);

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark] = useState(true);
  const [view, setView] = useState("dashboard");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [members, setMembers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const hasSaved = useRef(false);
  const abortRef = useRef(null);
  const [selTask, setSelTask] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newProjOpen, setNewProjOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("To Do");
  const [mobOpen, setMobOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/data?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Load failed: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setProjects(d.projects || []);
        setTasks(d.tasks || []);
        setComments(d.comments || []);
        setActivities(d.activities || []);
        setMembers(d.members || []);
        setLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load data:", err);
        setSaveStatus("error");
      });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!hasSaved.current) { hasSaved.current = true; return; }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSaveStatus("saving");
    const data = { projects, tasks, comments, activities, members };
    fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
      signal: controller.signal,
    })
      .then((r) => { if (!r.ok) throw new Error(); setSaveStatus("saved"); })
      .catch((err) => { if (err.name === "AbortError") return; setSaveStatus("error"); });
  }, [projects, tasks, comments, activities, members, loaded]);

  useEffect(() => { USERS = members; }, [members]);

  useEffect(() => {
    const h = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setNewOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const openTask = (t) => { setSelTask(t); setDetailOpen(true); };
  const openNew = (status) => { setNewStatus(status || "To Do"); setNewOpen(true); };
  const addMember = (m) => {
    setMembers((p) => [...p, m]);
    setActivities((p) => [{ id: "a" + Date.now(), type: "member_joined", userId: m.id, projectId: null, meta: { name: m.name }, createdAt: new Date().toISOString() }, ...p]);
  };
  const deleteMember = (id) => setMembers((p) => p.filter((m) => m.id !== id));
  const deleteProject = (id) => {
    setProjects((p) => p.filter((x) => x.id !== id));
    setTasks((p) => p.filter((t) => t.projectId !== id));
  };

  const titles = {
    dashboard: ["Dashboard", "Overview of all projects and activity"],
    kanban: ["Board", "Drag tasks across columns"],
    tasks: ["Tasks", "All tasks across projects"],
    team: ["Team", "Members, roles & workload"],
    timeline: ["Timeline", "Gantt view of tasks and deadlines"],
    activity: ["Activity", "Recent updates across projects"],
  };
  const [t, s] = titles[view] || ["", ""];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        :root {
          --font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif;
          --font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
          --font-mono: 'SF Mono', 'JetBrains Mono', monospace;
        }
        ${dark ? `
        :root {
          --bg-primary: #000000;
          --bg-secondary: #1c1c1e;
          --bg-tertiary: #2c2c2e;
          --bg-card: #1c1c1e;
          --bg-hover: rgba(255,255,255,0.06);
          --border: rgba(255,255,255,0.1);
          --border-focus: #0a84ff;
          --text-primary: #ffffff;
          --text-secondary: rgba(255,255,255,0.55);
          --text-tertiary: rgba(255,255,255,0.28);
          --accent: #0a84ff;
          --accent-hover: #409cff;
          --accent-bg: rgba(10,132,255,0.14);
          --green: #30d158;
          --red: #ff453a;
          --orange: #ff9f0a;
          --yellow: #ffd60a;
          --sidebar-bg: rgba(22,22,24,0.92);
          --sidebar-active: rgba(255,255,255,0.09);
          --header-bg: rgba(0,0,0,0.75);
          --modal-bg: #1c1c1e;
          --kanban-bg: rgba(28,28,30,0.6);
          --btn-secondary-bg: rgba(255,255,255,0.08);
          --scrollbar-thumb: rgba(255,255,255,0.12);
          --shadow-card: 0 1px 0 rgba(255,255,255,0.04) inset, 0 2px 12px rgba(0,0,0,0.4);
          --shadow-float: 0 0 0 0.5px rgba(255,255,255,0.1), 0 12px 40px rgba(0,0,0,0.7);
        }` : `
        :root {
          --bg-primary: #f2f2f7;
          --bg-secondary: #ffffff;
          --bg-tertiary: #e5e5ea;
          --bg-card: #ffffff;
          --bg-hover: rgba(0,0,0,0.04);
          --border: rgba(0,0,0,0.09);
          --border-focus: #007aff;
          --text-primary: #000000;
          --text-secondary: rgba(0,0,0,0.55);
          --text-tertiary: rgba(0,0,0,0.3);
          --accent: #007aff;
          --accent-hover: #0071e3;
          --accent-bg: rgba(0,122,255,0.1);
          --green: #34c759;
          --red: #ff3b30;
          --orange: #ff9500;
          --yellow: #ffcc00;
          --sidebar-bg: rgba(242,242,247,0.92);
          --sidebar-active: rgba(0,0,0,0.06);
          --header-bg: rgba(242,242,247,0.85);
          --modal-bg: #ffffff;
          --kanban-bg: rgba(242,242,247,0.7);
          --btn-secondary-bg: rgba(0,0,0,0.05);
          --scrollbar-thumb: rgba(0,0,0,0.18);
          --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 0 rgba(0,0,0,0.04);
          --shadow-float: 0 0 0 0.5px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.14);
        }`}
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html { font-family: var(--font-sans); background: var(--bg-primary); color: var(--text-primary); -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 10px; }
        input, textarea, select {
          font-family: var(--font-sans); font-size: 13px; color: var(--text-primary);
          background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 9px;
          padding: 9px 12px; outline: none; transition: border-color 0.15s, box-shadow 0.15s; width: 100%;
        }
        input:focus, textarea:focus, select:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--accent-bg); }
        select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; background-color: var(--bg-tertiary); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        @keyframes shimmer { to { background-position: -200% 0; } }
        .stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: default; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-float); }
        .project-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .project-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-float); }
        .kanban-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .kanban-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-float) !important; }
        .team-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .team-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-float); }
        .kanban-col-over { box-shadow: inset 0 0 0 1.5px var(--accent) !important; }
        @media (min-width: 768px) { .sidebar-desktop { display: block !important; } .main-wrap { margin-left: 220px !important; } }
        @media (max-width: 767px) { .mob-menu { display: flex !important; } }
      `}</style>

      <Sidebar view={view} setView={setView} dark={dark} setDark={setDark} projects={projects} mobOpen={mobOpen} setMobOpen={setMobOpen} onNewProject={() => setNewProjOpen(true)} />

      <div className="main-wrap" style={{ marginLeft: 0 }}>
        <Header title={t} sub={s} setMobOpen={setMobOpen}>
          <Btn onClick={() => openNew()} icon={Icons.plus({ size: 14 })}>New Task</Btn>
        </Header>

        {!loaded && (
        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 28 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 90, borderRadius: 12, background: "linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ height: 160, borderRadius: 12, background: "linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}
      {loaded && view === "dashboard" && <DashboardView projects={projects} tasks={tasks} activities={activities} onDeleteProject={deleteProject} />}
        {loaded && view === "kanban" && <KanbanView tasks={tasks} setTasks={setTasks} projects={projects} onTask={openTask} onNew={openNew} />}
        {loaded && view === "tasks" && <TaskListView tasks={tasks} projects={projects} onTask={openTask} />}
        {loaded && view === "team" && <TeamView tasks={tasks} members={members} onAdd={addMember} onDelete={deleteMember} />}
        {loaded && view === "timeline" && <TimelineView tasks={tasks} projects={projects} />}
        {loaded && view === "activity" && <ActivityView activities={activities} />}
      </div>

      <TaskDetail task={selTask} open={detailOpen} onClose={() => setDetailOpen(false)}
        comments={comments} projects={projects} members={members}
        onComment={(tid, c) => setComments((p) => [...p, { id: "c" + Date.now(), content: c, authorId: "u1", taskId: tid, createdAt: new Date().toISOString() }])}
        onUpdate={(t) => { setTasks((p) => p.map((x) => x.id === t.id ? { ...x, ...t } : x)); setSelTask(t); }} />
      <NewTaskModal open={newOpen} onClose={() => setNewOpen(false)} projects={projects} defaultStatus={newStatus} members={members}
        onSave={(t) => {
          setTasks((p) => [...p, t]);
          setActivities((p) => [{ id: "a" + Date.now(), type: "task_created", userId: "u1", projectId: t.projectId, taskId: t.id, meta: { title: t.title }, createdAt: new Date().toISOString() }, ...p]);
        }} />
      <NewProjectModal open={newProjOpen} onClose={() => setNewProjOpen(false)} members={members}
        onSave={(p) => {
          setProjects((prev) => [...prev, p]);
          setActivities((prev) => [{ id: "a" + Date.now(), type: "task_created", userId: "u1", projectId: p.id, taskId: null, meta: { title: p.name }, createdAt: new Date().toISOString() }, ...prev]);
        }} />
    </div>
  );
}
