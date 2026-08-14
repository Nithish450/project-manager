import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import { showSuccess, showError } from "../../utils/swal";

function TaskDetailView({ taskId, onBack, projects, employees, services }) {
    const [task, setTask] = useState(null);
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [remarks, setRemarks] = useState("");
    const [liveTick, setLiveTick] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        if (taskId) {
            fetchTaskAndHistory();
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [taskId]);

    // Start/stop the live timer based on active attempt status
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        const activeAtt = history?.attempts?.find(
            (a) => a.status === "started" || a.status === "paused"
        );

        if (activeAtt && activeAtt.status === "started") {
            timerRef.current = setInterval(() => {
                setLiveTick((prev) => prev + 1);
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [history]);

    const fetchTaskAndHistory = async () => {
        setLoading(true);
        try {
            const [taskRes, historyRes] = await Promise.all([
                api.get(`/work-items/${taskId}`),
                api.get(`/tasks/${taskId}/attempts`)
            ]);
            setTask(taskRes.data);
            setHistory(historyRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoryOnly = async () => {
        try {
            const res = await api.get(`/tasks/${taskId}/attempts`);
            setHistory(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleTaskAction = async (action) => {
        setActionLoading(true);
        try {
            await api.post(`/tasks/${taskId}/${action}`, { remarks });
            showSuccess("Action Successful", `Task action "${action}" completed.`);
            setRemarks("");
            await fetchHistoryOnly();
            // Fetch task again to update status
            const taskRes = await api.get(`/work-items/${taskId}`);
            setTask(taskRes.data);
        } catch (err) {
            console.error(err);
            const detail = err.response?.data?.detail;
            showError("Action Failed", typeof detail === "string" ? detail : "Action failed.");
        } finally {
            setActionLoading(false);
        }
    };

    const formatSeconds = (secs) => {
        if (!secs || secs < 0) secs = 0;
        secs = Math.floor(secs);
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        return `${m}m ${s}s`;
    };

    const formatDigitalSeconds = (secs) => {
        if (!secs || secs < 0) secs = 0;
        secs = Math.floor(secs);
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        const pad = (num) => String(num).padStart(2, "0");
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    const parseLocalDate = (isoString) => {
        if (!isoString) return null;
        let str = String(isoString);
        str = str.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
        const parts = str.split("T");
        if (parts.length !== 2) return new Date(str);
        const [datePart, timePart] = parts;
        const [year, month, day] = datePart.split("-").map(Number);
        const timeParts = timePart.split(":");
        const hour = parseInt(timeParts[0]) || 0;
        const minute = parseInt(timeParts[1]) || 0;
        const secFloat = parseFloat(timeParts[2]) || 0;
        const sec = Math.floor(secFloat);
        const ms = Math.round((secFloat - sec) * 1000);
        return new Date(year, month - 1, day, hour, minute, sec, ms);
    };

    const formatLocalTime = (isoString) => {
        const d = parseLocalDate(isoString);
        if (!d || isNaN(d.getTime())) return "";
        return d.toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    };

    const computeLiveWorkingSeconds = (att) => {
        if (!att || !att.started_at) return 0;
        const start = parseLocalDate(att.started_at);
        if (!start || isNaN(start.getTime())) return 0;
        const nowMs = Date.now();
        const totalElapsed = Math.floor((nowMs - start.getTime()) / 1000);
        const breakSecs = att.break_duration_seconds || 0;
        return Math.max(0, totalElapsed - breakSecs);
    };

    const getEmployeeName = (empId) => {
        if (!empId) return "Unassigned";
        const emp = employees.find((e) => e.id === empId);
        return emp ? emp.name : `Employee #${empId}`;
    };

    const getProjectDetails = (projId) => {
        const proj = projects.find((p) => p.id === projId);
        if (!proj) return { projectName: `Project #${projId}`, serviceName: "N/A" };
        const srv = services.find((s) => s.id === proj.service_id);
        return {
            projectName: proj.name,
            serviceName: srv ? srv.service_name : "N/A"
        };
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "80px", color: "var(--text-muted)" }}>
                Loading task execution dashboard...
            </div>
        );
    }

    if (!task) {
        return (
            <div style={{ padding: "40px" }}>
                <button className="btn-secondary" onClick={onBack}>← Back to Work Items</button>
                <div style={{ marginTop: "24px", color: "var(--danger)" }}>Task not found or error loading.</div>
            </div>
        );
    }

    const { projectName, serviceName } = getProjectDetails(task.project_id);
    const initialLetter = task.title ? task.title.charAt(0).toUpperCase() : "T";

    const activeAttempt = history?.attempts?.find(
        (a) => a.status === "started" || a.status === "paused"
    );

    let headerWorkingSecs = 0;
    let headerStatus = task.status?.toUpperCase() || "PENDING";

    if (activeAttempt) {
        headerStatus = activeAttempt.status.toUpperCase();
        if (activeAttempt.status === "started") {
            headerWorkingSecs = computeLiveWorkingSeconds(activeAttempt);
        } else if (activeAttempt.status === "paused") {
            headerWorkingSecs = activeAttempt.working_duration_seconds || 0;
        }
    } else {
        const completedAttempts = history?.attempts?.filter((a) => a.status === "completed") || [];
        if (completedAttempts.length > 0) {
            const lastCompleted = completedAttempts[completedAttempts.length - 1];
            headerWorkingSecs = lastCompleted.working_duration_seconds || 0;
            headerStatus = "COMPLETED";
        }
    }

    const allCompleted = history?.attempts?.length > 0 && history.attempts.every((a) => a.status === "completed");
    const noAttempts = !history?.attempts?.length;
    const canStartNew = noAttempts || allCompleted;

    const getStatusClass = (statusStr) => {
        const s = String(statusStr).toLowerCase();
        if (s === "started" || s === "running" || s === "start" || s === "resume") return "running";
        if (s === "paused" || s === "pause") return "paused";
        if (s === "completed" || s === "complete") return "completed";
        return "pending";
    };

    return (
        <div style={{ margin: "-32px -32px -32px -32px", padding: "24px 32px", background: "var(--bg-main)", minHeight: "calc(100vh - 70px)", boxSizing: "border-box" }}>
            {/* Header / Breadcrumb */}
            <div style={{ marginBottom: "20px" }}>
                <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={onBack}>
                    ← Back to Work Items
                </button>
            </div>

            {/* Top Task Summary Banner Card (Unified 3-Column Dashboard) */}
            <div style={{ 
                background: "#ffffff", 
                border: "1px solid var(--border-color)", 
                borderRadius: "var(--radius-lg)", 
                padding: "24px", 
                boxShadow: "var(--shadow-sm)",
                marginBottom: "24px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "24px",
                alignItems: "stretch"
            }}>
                {/* Column 1: Task Identity */}
                <div style={{ display: "flex", gap: "16px", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                        <div style={{
                            width: "56px",
                            height: "56px",
                            background: "linear-gradient(135deg, var(--primary), #8b5cf6)",
                            color: "#fff",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "24px",
                            fontWeight: "800",
                            boxShadow: "0 4px 10px rgba(79, 70, 229, 0.15)",
                            flexShrink: 0
                        }}>
                            {initialLetter}
                        </div>
                        <div>
                            <span className="modern-project-id-tag">Task #{task.id}</span>
                            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)", margin: "4px 0 0 0" }}>{task.title}</h2>
                        </div>
                    </div>
                    
                    <div style={{ fontSize: "13.5px", color: "var(--text-muted)" }}>
                        Assigned To: <strong style={{ color: "var(--text-main)" }}>{getEmployeeName(task.assigned_employee_id)}</strong>
                    </div>

                    {task.description && (
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4", margin: 0, borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                            <strong>Description:</strong> {task.description}
                        </p>
                    )}
                </div>

                {/* Column 2: Active Session / Timer (Integrated) */}
                <div style={{
                    background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px 20px",
                    border: "1px solid rgba(79, 70, 229, 0.12)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <span style={{ fontSize: "10px", color: "#4f46e5", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>
                                {activeAttempt ? "Active Session" : "Session status"}
                            </span>
                            <div style={{ marginTop: "2px" }}>
                                <span className={`status-indicator-badge ${getStatusClass(headerStatus)}`} style={{ padding: "4px 8px", fontSize: "10px" }}>
                                    {getStatusClass(headerStatus) === "running" && <span className="pulse-dot" />}
                                    {headerStatus}
                                </span>
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: "10px", color: "#4f46e5", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>Duration</span>
                            <div className={`timer-digit ${getStatusClass(headerStatus)}`} style={{ fontSize: "28px", fontWeight: "800" }}>
                                {formatDigitalSeconds(headerWorkingSecs)}
                            </div>
                        </div>
                    </div>

                    {activeAttempt && (
                        <div style={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)", paddingTop: "8px" }}>
                            <textarea
                                className="remarks-textarea"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Context/remarks (optional)..."
                                style={{ height: "42px", padding: "6px 10px", fontSize: "12px", background: "#ffffff", border: "1px solid var(--border-color)" }}
                            />
                        </div>
                    )}

                    <div className="timer-actions-panel" style={{ marginTop: 0, gap: "8px" }}>
                        {canStartNew && (
                            <button className="btn-modern-action start" onClick={() => handleTaskAction("start")} disabled={actionLoading} style={{ padding: "8px 14px", fontSize: "12px", height: "34px" }}>
                                {allCompleted ? "🔄 Start New" : "▶️ Start Session"}
                            </button>
                        )}

                        {activeAttempt?.status === "started" && (
                            <button className="btn-modern-action pause" onClick={() => handleTaskAction("pause")} disabled={actionLoading} style={{ padding: "8px 14px", fontSize: "12px", height: "34px" }}>
                                ⏸️ Pause
                            </button>
                        )}

                        {activeAttempt?.status === "paused" && (
                            <button className="btn-modern-action resume" onClick={() => handleTaskAction("resume")} disabled={actionLoading} style={{ padding: "8px 14px", fontSize: "12px", height: "34px" }}>
                                ▶️ Resume
                            </button>
                        )}

                        {activeAttempt && (
                            <button className="btn-modern-action complete" onClick={() => handleTaskAction("complete")} disabled={actionLoading} style={{ padding: "8px 14px", fontSize: "12px", height: "34px" }}>
                                ✅ Complete
                            </button>
                        )}
                    </div>
                </div>

                {/* Column 3: Metadata Details */}
                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 1fr", 
                    gap: "10px 16px", 
                    fontSize: "12.5px",
                    background: "#f8fafc",
                    padding: "16px 20px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    justifyContent: "space-between"
                }}>
                    <div style={{ gridColumn: "span 2" }}>
                        <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "var(--text-dim)", display: "block" }}>Project & Service</span>
                        <strong style={{ color: "var(--text-main)", fontSize: "13px" }}>{projectName}</strong>
                        <div style={{ fontSize: "11px", color: "var(--primary)", marginTop: "2px", fontWeight: "500" }}>{serviceName}</div>
                    </div>
                    <div>
                        <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "var(--text-dim)", display: "block" }}>Priority</span>
                        <strong style={{ color: "var(--text-main)", textTransform: "capitalize" }}>{task.priority}</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "var(--text-dim)", display: "block" }}>Estimated Time</span>
                        <strong style={{ color: "var(--text-main)" }}>{task.estimated_hours ? `${task.estimated_hours} hrs` : "0.0 hrs"}</strong>
                    </div>
                    {task.due_date && (
                        <div style={{ gridColumn: "span 2" }}>
                            <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "var(--text-dim)", display: "block" }}>Due Date</span>
                            <strong style={{ color: "var(--text-main)" }}>{task.due_date}</strong>
                        </div>
                    )}
                </div>
            </div>

            {/* Attempt History Table Card (Placed below/down) */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "24px", boxShadow: "var(--shadow-sm)", marginTop: "24px" }}>
                <h3 className="section-title">
                    Attempt History <span className="section-title-badge">{history?.attempt_count || 0}</span>
                </h3>
                {history?.attempts?.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                        <table className="premium-table" style={{ width: "100%", fontSize: "13px" }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: "700", textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>Attempt</th>
                                    <th style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: "700", textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>Start Time</th>
                                    <th style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: "700", textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>End Time</th>
                                    <th style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: "700", textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>Working Time</th>
                                    <th style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: "700", textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>Break Time</th>
                                    <th style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: "700", textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>Total Time</th>
                                    <th style={{ padding: "10px 12px", background: "#f8fafc", fontWeight: "700", textTransform: "uppercase", fontSize: "11px", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)", width: "120px" }}>Work/Break Ratio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.attempts.map((att) => {
                                    let displayWorking = att.working_duration_seconds || 0;
                                    if (att.status === "started") {
                                        displayWorking = computeLiveWorkingSeconds(att);
                                    }
                                    const breakDuration = att.break_duration_seconds || 0;
                                    const totalDuration = att.total_duration_seconds || (displayWorking + breakDuration);

                                    const workPct = totalDuration > 0 ? (displayWorking / totalDuration) * 100 : 0;
                                    const breakPct = totalDuration > 0 ? (breakDuration / totalDuration) * 100 : 0;

                                    return (
                                        <tr key={att.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "12px 10px", fontWeight: "600" }}>
                                                Attempt #{att.attempt_number}
                                                <div style={{ marginTop: "4px" }}>
                                                    <span className={`status-indicator-badge ${getStatusClass(att.status)}`} style={{ fontSize: "9px", padding: "2px 6px" }}>
                                                        {att.status === "started" ? "🟢 Running" : att.status === "paused" ? "⏸ Paused" : att.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                {formatLocalTime(att.started_at)}
                                            </td>
                                            <td style={{ padding: "12px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                {att.ended_at ? formatLocalTime(att.ended_at) : (
                                                    <span style={{ fontStyle: "italic", color: "var(--primary)", fontWeight: "500" }}>Active Now</span>
                                                )}
                                            </td>
                                            <td style={{ padding: "12px 10px", color: att.status === "started" ? "#10b981" : "var(--text-main)", fontWeight: att.status === "started" ? "600" : "normal" }}>
                                                {formatSeconds(displayWorking)}
                                            </td>
                                            <td style={{ padding: "12px 10px" }}>{formatSeconds(breakDuration)}</td>
                                            <td style={{ padding: "12px 10px", fontWeight: "600" }}>{formatSeconds(totalDuration)}</td>
                                            <td style={{ padding: "12px 10px", verticalAlign: "middle" }}>
                                                <div className="attempt-bar-container" style={{ margin: 0, width: "100px", height: "8px" }}>
                                                    <div className="attempt-bar-work" style={{ width: `${workPct}%` }} title={`Working: ${formatSeconds(displayWorking)} (${Math.round(workPct)}%)`} />
                                                    <div className="attempt-bar-break" style={{ width: `${breakPct}%` }} title={`Break: ${formatSeconds(breakDuration)} (${Math.round(breakPct)}%)`} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="modern-empty-state">No attempts recorded yet. Click Start to begin session timing.</div>
                )}
            </div>

            {/* Embedded page styles to isolate style layout */}
            <style>{`
                .task-dashboard-grid {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 24px;
                    align-items: start;
                }

                @media (max-width: 900px) {
                    .task-dashboard-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* Timer card container */
                .timer-card {
                    background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 28px;
                    color: #0f172a;
                    box-shadow: 0 12px 30px -10px rgba(79, 70, 229, 0.1);
                    border: 1px solid rgba(79, 70, 229, 0.15);
                    position: relative;
                    overflow: hidden;
                }

                .timer-card::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -50%;
                    width: 200px;
                    height: 200px;
                    background: radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%);
                    pointer-events: none;
                }

                .timer-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .timer-title {
                    font-size: 11px;
                    color: #4f46e5;
                    text-transform: uppercase;
                    font-weight: 700;
                    letter-spacing: 1px;
                    display: block;
                }

                .timer-digit {
                    font-size: 38px;
                    font-weight: 800;
                    font-family: Menlo, Monaco, Consolas, "Fira Code", monospace;
                    font-feature-settings: 'tnum';
                    letter-spacing: 0.5px;
                    line-height: 1.1;
                    transition: text-shadow 0.3s ease, color 0.3s ease;
                }

                .timer-digit.running {
                    color: #059669;
                    text-shadow: 0 0 10px rgba(5, 150, 105, 0.15);
                }

                .timer-digit.paused {
                    color: #d97706;
                    text-shadow: 0 0 10px rgba(217, 119, 6, 0.15);
                }

                .timer-digit.completed {
                    color: #475569;
                }

                .status-indicator-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: rgba(15, 23, 42, 0.05);
                    color: #475569;
                }

                .status-indicator-badge.running {
                    color: #059669;
                    background: rgba(5, 150, 105, 0.12);
                    border: 1px solid rgba(5, 150, 105, 0.2);
                }

                .status-indicator-badge.paused {
                    color: #d97706;
                    background: rgba(217, 119, 6, 0.12);
                    border: 1px solid rgba(217, 119, 6, 0.2);
                }

                .status-indicator-badge.completed {
                    color: #64748b;
                    background: rgba(15, 23, 42, 0.05);
                    border: 1px solid rgba(15, 23, 42, 0.1);
                }

                .status-indicator-badge.pending {
                    color: #475569;
                    background: rgba(15, 23, 42, 0.05);
                }

                .pulse-dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: currentColor;
                    animation: pulseGlow 1.5s infinite;
                }

                @keyframes pulseGlow {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.3); }
                    100% { opacity: 1; transform: scale(1); }
                }

                /* Remarks block inside timer card */
                .card-remarks-section {
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(15, 23, 42, 0.08);
                }

                .remarks-textarea {
                    width: 100%;
                    height: 64px;
                    background: #ffffff;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    padding: 10px 14px;
                    font-size: 13px;
                    color: #0f172a;
                    font-family: inherit;
                    resize: none;
                    transition: all 0.25s ease;
                }

                .remarks-textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    background: #ffffff;
                }

                .remarks-textarea::placeholder {
                    color: var(--text-dim);
                }

                /* Actions panel */
                .timer-actions-panel {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-top: 18px;
                }

                .btn-modern-action {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 20px;
                    font-size: 13px;
                    font-weight: 600;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    border: none;
                    outline: none;
                }

                .btn-modern-action:hover {
                    transform: translateY(-2px);
                }

                .btn-modern-action:active {
                    transform: translateY(0);
                }

                .btn-modern-action:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .btn-modern-action.start {
                    background: linear-gradient(135deg, var(--primary), #6366f1);
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
                }

                .btn-modern-action.start:hover {
                    opacity: 0.95;
                }

                .btn-modern-action.pause {
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                    border: 1px solid rgba(245, 158, 11, 0.3);
                }

                .btn-modern-action.pause:hover {
                    background: rgba(245, 158, 11, 0.25);
                }

                .btn-modern-action.resume {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }

                .btn-modern-action.resume:hover {
                    background: rgba(16, 185, 129, 0.25);
                }

                .btn-modern-action.complete {
                    background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
                }

                .btn-modern-action.complete:hover {
                    opacity: 0.95;
                    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
                }

                /* Sections titles */
                .section-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #0f172a;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .section-title-badge {
                    background: #eff6ff;
                    color: #3b82f6;
                    padding: 2px 8px;
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 700;
                }

                /* Attempt list */
                .attempts-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 28px;
                }

                .attempt-card {
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 16px;
                    background: #ffffff;
                    transition: all 0.25s ease;
                }

                .attempt-card:hover {
                    border-color: #cbd5e1;
                    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
                }

                .attempt-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .attempt-card-title {
                    font-size: 13.5px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .attempt-badge {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 9999px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .attempt-badge.running {
                    background: #dcfce7;
                    color: #15803d;
                }

                .attempt-badge.paused {
                    background: #fef3c7;
                    color: #b45309;
                }

                .attempt-badge.completed {
                    background: #f1f5f9;
                    color: #475569;
                }

                .attempt-bar-container {
                    display: flex;
                    height: 8px;
                    background: #f1f5f9;
                    border-radius: 999px;
                    overflow: hidden;
                    margin: 12px 0 10px 0;
                }

                .attempt-bar-work {
                    background: #10b981;
                    border-radius: 999px 0 0 999px;
                }

                .attempt-bar-break {
                    background: #f59e0b;
                    border-radius: 0 999px 999px 0;
                }

                .attempt-stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 8px;
                    font-size: 12px;
                    color: #64748b;
                }

                .attempt-stat-item strong {
                    color: #0f172a;
                }

                .modern-empty-state {
                    font-size: 13px;
                    color: #64748b;
                    padding: 20px;
                    background: #f8fafc;
                    border-radius: 12px;
                    text-align: center;
                    border: 1px dashed #e2e8f0;
                }

                /* Timeline logs */
                .timeline-container {
                    position: relative;
                    padding-left: 20px;
                    border-left: 2px solid #f1f5f9;
                    margin-left: 10px;
                    margin-top: 10px;
                }

                .timeline-event {
                    position: relative;
                    margin-bottom: 24px;
                }

                .timeline-event:last-child {
                    margin-bottom: 0;
                }

                .timeline-dot {
                    position: absolute;
                    left: -26px;
                    top: 4px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #cbd5e1;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 0 2px #cbd5e1;
                }

                .timeline-dot.start, .timeline-dot.resume {
                    background: #10b981;
                    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
                }

                .timeline-dot.pause {
                    background: #f59e0b;
                    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
                }

                .timeline-dot.complete {
                    background: #6366f1;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
                }

                .timeline-event-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .timeline-event-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #0f172a;
                    text-transform: uppercase;
                }

                .timeline-event-time {
                    font-size: 11px;
                    color: #94a3b8;
                }

                .timeline-event-remarks {
                    font-size: 12.5px;
                    color: #475569;
                    background: #f8fafc;
                    padding: 8px 12px;
                    border-radius: 8px;
                    margin-top: 6px;
                    font-style: italic;
                    border-left: 3px solid #cbd5e1;
                }
            `}</style>
        </div>
    );
}

export default TaskDetailView;
