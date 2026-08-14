import { useState, useEffect } from "react";
import api from "../../services/api";

function Dashboard() {
    const [stats, setStats] = useState({});
    const [charts, setCharts] = useState({});
    const [widgets, setWidgets] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [sRes, cRes, wRes] = await Promise.all([
                api.get("/dashboard/stats"),
                api.get("/dashboard/charts"),
                api.get("/dashboard/widgets"),
            ]);
            setStats(sRes.data || {});
            setCharts(cRes.data || {});
            setWidgets(wRes.data || {});
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                <div>Loading Executive Metrics & Charts...</div>
            </div>
        );
    }

    // --- Chart Data Calculations ---

    // 1. Projects by Status (Donut Chart)
    const projectStatusData = charts.project_status_distribution || {};
    const totalProjects = Object.values(projectStatusData).reduce((sum, val) => sum + val, 0);
    const projStatuses = Object.keys(projectStatusData);
    const statusLabels = {
        initiated: "Initiated",
        in_progress: "In Progress",
        waiting_for_review: "Waiting for Review",
        hold: "On Hold",
        completed: "Completed"
    };
    const statusColors = {
        initiated: "#3b82f6",
        in_progress: "#f59e0b",
        waiting_for_review: "#8b5cf6",
        hold: "#ef4444",
        completed: "#10b981"
    };

    const radius = 36;
    const circum = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    // 2. Task Completion (Bar Chart)
    const taskStatusData = charts.work_item_status_distribution || {};
    const taskStatuses = ["pending", "in_progress", "completed", "overdue"];
    const taskStatusLabels = {
        pending: "Pending",
        in_progress: "In Progress",
        completed: "Completed",
        overdue: "Overdue"
    };
    const taskStatusColors = {
        pending: "#64748b",
        in_progress: "#3b82f6",
        completed: "#10b981",
        overdue: "#ef4444"
    };
    const maxTaskVal = Math.max(1, ...Object.values(taskStatusData));

    // 3. Employee Productivity
    const empProdData = charts.employee_productivity || [];
    const maxHours = Math.max(1, ...empProdData.map(e => e.working_hours));

    // 4. Monthly Projects
    const monthlyProjData = charts.monthly_projects || [];
    const maxMonthlyVal = Math.max(1, ...monthlyProjData.map(m => m.count));

    // 5. Weekly Work Hours (SVG Line/Area Chart)
    const weeklyHoursData = charts.weekly_work_hours || [];
    const maxWeeklyVal = Math.max(1, ...weeklyHoursData.map(w => w.hours));
    const width = 300;
    const height = 120;
    const paddingX = 25;
    const paddingY = 15;

    const points = weeklyHoursData.map((w, idx) => {
        const x = paddingX + (idx * (width - 2 * paddingX)) / Math.max(1, weeklyHoursData.length - 1);
        const y = height - paddingY - (w.hours / maxWeeklyVal) * (height - 2 * paddingY);
        return { x, y, label: w.day, val: w.hours };
    });

    const linePath = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = points.length > 0
        ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
        : "";

    return (
        <div className="dashboard-container">
            <h1 className="page-title">Executive Dashboard</h1>
            <p className="page-subtitle">Real-time organizational performance & work item tracking</p>

            {/* Metric Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: "24px" }}>
                <div className="stat-card">
                    <div className="stat-icon total">📁</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.total_projects || 0}</div>
                        <div className="stat-label">Total Projects</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon active">⚡</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.active_projects || 0}</div>
                        <div className="stat-label">Active Projects</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon total">🏢</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.total_clients || 0}</div>
                        <div className="stat-label">Clients</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon active">👥</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.total_employees || 0}</div>
                        <div className="stat-label">Employees</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon total">✅</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.total_work_items || 0}</div>
                        <div className="stat-label">Work Items</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon inactive">⏳</div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.overdue_work_items || 0}</div>
                        <div className="stat-label">Overdue Items</div>
                    </div>
                </div>
            </div>

            {/* Executive Analytics Charts Grid */}
            <div className="dashboard-charts-grid">
                
                {/* 1. Projects by Status */}
                <div className="chart-card">
                    <h3 className="chart-title">Projects by Status</h3>
                    <div style={{ display: "flex", gap: "16px", alignItems: "center", height: "160px" }}>
                        <div style={{ position: "relative", width: "120px", height: "120px" }}>
                            <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
                                {/* Base background circle */}
                                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                                {projStatuses.map((status) => {
                                    const val = projectStatusData[status];
                                    const pct = totalProjects > 0 ? (val / totalProjects) * 100 : 0;
                                    const strokeDash = `${(pct / 100) * circum} ${circum}`;
                                    const strokeOffset = circum - (accumulatedPercent / 100) * circum;
                                    accumulatedPercent += pct;
                                    if (pct === 0) return null;
                                    return (
                                        <circle
                                            key={status}
                                            cx="50"
                                            cy="50"
                                            r={radius}
                                            fill="transparent"
                                            stroke={statusColors[status] || "#cbd5e1"}
                                            strokeWidth="10"
                                            strokeDasharray={strokeDash}
                                            strokeDashoffset={strokeOffset}
                                            transform="rotate(-90 50 50)"
                                            style={{ transition: "stroke-dashoffset 0.5s ease" }}
                                        />
                                    );
                                })}
                            </svg>
                            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                                <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)" }}>{totalProjects}</div>
                                <div style={{ fontSize: "8px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Total</div>
                            </div>
                        </div>

                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                            {projStatuses.map((status) => {
                                const count = projectStatusData[status] || 0;
                                return (
                                    <div key={status} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusColors[status] }} />
                                            <span style={{ color: "var(--text-main)", fontWeight: "500" }}>{statusLabels[status]}</span>
                                        </div>
                                        <strong style={{ color: "var(--text-main)" }}>{count}</strong>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 2. Task Completion */}
                <div className="chart-card">
                    <h3 className="chart-title">Task Completion</h3>
                    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: "160px", padding: "10px 0" }}>
                        {taskStatuses.map((st) => {
                            const val = taskStatusData[st] || 0;
                            const heightPct = (val / maxTaskVal) * 100;
                            return (
                                <div key={st} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                                    <div style={{ fontSize: "11px", fontWeight: "700", marginBottom: "4px", color: taskStatusColors[st] }}>
                                        {val}
                                    </div>
                                    <div style={{
                                        width: "24px",
                                        height: `${Math.max(4, (heightPct / 100) * 100)}px`,
                                        background: taskStatusColors[st],
                                        borderRadius: "6px 6px 0 0",
                                        transition: "height 0.4s ease-out",
                                        boxShadow: "0 4px 6px rgba(0,0,0,0.03)"
                                    }} />
                                    <div style={{ fontSize: "10px", fontWeight: "600", color: "var(--text-muted)", marginTop: "8px", textAlign: "center", whiteSpace: "nowrap" }}>
                                        {taskStatusLabels[st]}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Employee Productivity */}
                <div className="chart-card">
                    <h3 className="chart-title">Employee Productivity</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "160px", justifyContent: "center" }}>
                        {empProdData.slice(0, 4).map((e) => {
                            const pct = (e.working_hours / maxHours) * 100;
                            return (
                                <div key={e.employee_name}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "3px" }}>
                                        <strong style={{ color: "var(--text-main)" }}>{e.employee_name}</strong>
                                        <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{e.working_hours} hrs</span>
                                    </div>
                                    <div style={{ width: "100%", background: "#f1f5f9", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                                        <div style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #6366f1)", height: "100%", borderRadius: "3px", transition: "width 0.4s ease-out" }} />
                                    </div>
                                </div>
                            );
                        })}
                        {empProdData.length === 0 && (
                            <div className="modern-empty-state" style={{ padding: "20px" }}>No working session logs recorded yet.</div>
                        )}
                    </div>
                </div>

                {/* 4. Monthly Projects */}
                <div className="chart-card">
                    <h3 className="chart-title">Monthly Projects</h3>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "160px", padding: "10px 0" }}>
                        {monthlyProjData.map((m) => {
                            const val = m.count || 0;
                            const heightPct = (val / maxMonthlyVal) * 100;
                            const dateObj = new Date(m.month + "-02");
                            const monthLabel = dateObj.toLocaleDateString("en-US", { month: "short" });

                            return (
                                <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                                    <div style={{ fontSize: "11px", fontWeight: "700", marginBottom: "4px", color: "var(--primary)" }}>
                                        {val}
                                    </div>
                                    <div style={{
                                        width: "20px",
                                        height: `${Math.max(4, (heightPct / 100) * 100)}px`,
                                        background: "linear-gradient(180deg, var(--primary) 0%, #a5b4fc 100%)",
                                        borderRadius: "6px 6px 0 0",
                                        transition: "height 0.4s ease-out"
                                    }} />
                                    <div style={{ fontSize: "10px", fontWeight: "600", color: "var(--text-muted)", marginTop: "8px" }}>
                                        {monthLabel}
                                    </div>
                                </div>
                            );
                        })}
                        {monthlyProjData.length === 0 && (
                            <div className="modern-empty-state" style={{ padding: "20px", width: "100%" }}>No projects created in recent months.</div>
                        )}
                    </div>
                </div>

                {/* 5. Weekly Work Hours */}
                <div className="chart-card">
                    <h3 className="chart-title">Weekly Work Hours</h3>
                    <div style={{ position: "relative", width: "100%", height: "160px", display: "flex", alignItems: "center" }}>
                        {points.length > 0 ? (
                            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
                                    </linearGradient>
                                </defs>
                                {/* Grid lines */}
                                <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#f1f5f9" strokeWidth="1.5" />
                                <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#f8fafc" strokeWidth="1" strokeDasharray="4" />

                                {/* Shaded Area */}
                                <path d={areaPath} fill="url(#areaGrad)" />

                                {/* Line Path */}
                                <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Vertices (Dots) */}
                                {points.map((p, idx) => (
                                    <g key={idx}>
                                        <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="var(--primary)" strokeWidth="2" />
                                        <text x={p.x} y={p.y - 7} fontSize="8.5px" fontWeight="700" textAnchor="middle" fill="var(--text-main)">
                                            {p.val > 0 ? `${p.val}h` : ""}
                                        </text>
                                        <text x={p.x} y={height} fontSize="8.5px" fontWeight="600" textAnchor="middle" fill="var(--text-muted)">
                                            {p.label}
                                        </text>
                                    </g>
                                ))}
                            </svg>
                        ) : (
                            <div className="modern-empty-state" style={{ padding: "20px", width: "100%" }}>No working hours logged in past week.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Dashboard Widgets Row */}
            <div className="dashboard-widgets-grid">
                {/* Recent Projects Widget */}
                <div className="widget-card">
                    <h3 className="widget-title">Recent Projects</h3>
                    <div className="widget-list">
                        {(widgets.recent_projects || []).map((p) => (
                            <div key={p.id} className="widget-item">
                                <div>
                                    <strong>{p.name}</strong>
                                    <div className="widget-sub">Status: {p.status}</div>
                                </div>
                                <span className="status-badge active">{p.priority || "Medium"}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Deadlines Widget */}
                <div className="widget-card">
                    <h3 className="widget-title">Upcoming Deadlines</h3>
                    <div className="widget-list">
                        {(widgets.upcoming_deadlines || []).map((w) => (
                            <div key={w.id} className="widget-item">
                                <div>
                                    <strong>{w.title}</strong>
                                    <div className="widget-sub">Due: {w.due_date}</div>
                                </div>
                                <span className="status-badge inactive">{w.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Local isolated dashboard chart styles */}
            <style>{`
                .dashboard-charts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                    margin-bottom: 32px;
                }

                .chart-card {
                    background: #ffffff;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 24px;
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .chart-title {
                    font-size: 14.5px;
                    font-weight: 700;
                    color: var(--text-main);
                    margin-top: 0;
                    margin-bottom: 16px;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 10px;
                }
            `}</style>
        </div>
    );
}

export default Dashboard;
