import { useState, useEffect } from "react";
import api from "../../services/api";
import { showSuccess, showError, showConfirm } from "../../utils/swal";

function ProjectDetailView({ projectId, onBack }) {
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState("performance");

    // Sub-tab 2: Tasks list state
    const [tasks, setTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [taskPage, setTaskPage] = useState(1);
    const [taskLimit] = useState(10);
    const [taskTotal, setTaskTotal] = useState(0);
    const [taskSearch, setTaskSearch] = useState("");
    const [taskStatusFilter, setTaskStatusFilter] = useState("All");
    const [taskEmployeeFilter, setTaskEmployeeFilter] = useState("");
    const [taskDueDate, setTaskDueDate] = useState("");

    // Sub-tab 3: Team Users state
    const [assignedEmployees, setAssignedEmployees] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [teamLoading, setTeamLoading] = useState(false);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [isAssigning, setIsAssigning] = useState(false);

    // Sub-tab 4: Attachments state
    const [attachments, setAttachments] = useState([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (projectId) {
            fetchProjectDetails();
            fetchTeamData();
        }
    }, [projectId]);

    useEffect(() => {
        if (activeSubTab === "tasks") {
            fetchProjectTasks();
        } else if (activeSubTab === "users") {
            fetchTeamData();
        } else if (activeSubTab === "attachments") {
            fetchAttachments();
        }
    }, [activeSubTab, taskPage, taskStatusFilter, taskEmployeeFilter, taskDueDate]);

    // Debounce search tasks
    useEffect(() => {
        if (activeSubTab === "tasks") {
            const timer = setTimeout(() => {
                if (taskPage === 1) {
                    fetchProjectTasks();
                } else {
                    setTaskPage(1);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [taskSearch]);

    const fetchProjectDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/projects/${projectId}`);
            setProject(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjectTasks = async () => {
        setTasksLoading(true);
        try {
            const res = await api.get("/work-items", {
                params: {
                    project_id: projectId,
                    page: taskPage,
                    limit: taskLimit,
                    search: taskSearch || undefined,
                    status: taskStatusFilter === "All" ? undefined : taskStatusFilter,
                    assigned_employee_id: taskEmployeeFilter || undefined,
                    due_before: taskDueDate || undefined,
                }
            });
            setTasks(res.data.data || []);
            setTaskTotal(res.data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setTasksLoading(false);
        }
    };

    const fetchTeamData = async () => {
        setTeamLoading(true);
        try {
            const [assignedRes, allRes] = await Promise.all([
                api.get(`/projects/${projectId}/employees`),
                api.get("/employees")
            ]);
            const assignedList = assignedRes.data.data || [];
            setAssignedEmployees(assignedList);
            setAllEmployees(allRes.data.data || []);
            setSelectedEmployeeIds(assignedList.map((e) => e.id));
        } catch (err) {
            console.error(err);
        } finally {
            setTeamLoading(false);
        }
    };

    const handleAssignTeam = async (e) => {
        e.preventDefault();
        setIsAssigning(true);
        try {
            await api.post(`/projects/${projectId}/employees`, {
                employee_ids: selectedEmployeeIds.map(Number)
            });
            showSuccess("Success!", "Team assignment updated successfully.");
            fetchTeamData();
            fetchProjectDetails(); // refresh stats
        } catch (err) {
            console.error(err);
            showError("Error", "Failed to update team assignment.");
        } finally {
            setIsAssigning(false);
        }
    };

    const fetchAttachments = async () => {
        setAttachmentsLoading(true);
        try {
            const res = await api.get("/attachments", {
                params: {
                    attachable_type: "project",
                    attachable_id: projectId,
                }
            });
            setAttachments(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setAttachmentsLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("attachable_type", "project");
        formData.append("attachable_id", projectId);

        try {
            await api.post("/attachments/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            showSuccess("Success", "File uploaded successfully.");
            fetchAttachments();
        } catch (err) {
            console.error(err);
            showError("Error", err.response?.data?.detail || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAttachment = async (id) => {
        const confirmed = await showConfirm("Delete file?", "Are you sure you want to delete this file?");
        if (!confirmed) return;
        try {
            await api.delete(`/attachments/${id}`);
            fetchAttachments();
            showSuccess("Deleted!", "File has been deleted.");
        } catch (err) {
            console.error(err);
            showError("Error", "Delete failed.");
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "80px", color: "var(--text-muted)" }}>
                Loading project dashboard...
            </div>
        );
    }

    if (!project) {
        return (
            <div style={{ padding: "40px" }}>
                <button className="btn-secondary" onClick={onBack}>← Back to Projects</button>
                <div style={{ marginTop: "24px", color: "var(--danger)" }}>Project not found or error loading.</div>
            </div>
        );
    }

    const { stats } = project;
    const initialLetter = project.name ? project.name.charAt(0).toUpperCase() : "P";

    // SVG Donut chart components helper
    const R = 40;
    const C = 2 * Math.PI * R; // ~251.3
    const taskOverviewData = [
        { label: "Completed", value: stats.completed_tasks, color: "#22c55e" },
        { label: "In Progress", value: stats.in_progress_tasks, color: "#3b82f6" },
        { label: "Pending", value: stats.pending_tasks, color: "#e2e8f0" },
        { label: "Overdue", value: stats.overdue_tasks, color: "#ef4444" },
    ];

    const taskPriorityData = [
        { label: "Low", value: stats.priority_low || 0, color: "#10b981" },
        { label: "Medium", value: stats.priority_medium || 0, color: "#3b82f6" },
        { label: "High", value: stats.priority_high || 0, color: "#f59e0b" },
        { label: "Urgent", value: stats.priority_urgent || 0, color: "#ef4444" },
    ];

    const totalPriority = (stats.priority_low || 0) + (stats.priority_medium || 0) + (stats.priority_high || 0) + (stats.priority_urgent || 0);

    // Find max value for employee stats scaling
    const maxTasks = Math.max(...(stats.employee_stats || []).map((e) => e.tasks_count), 1);
    const maxHours = Math.max(...(stats.employee_stats || []).map((e) => e.working_hours), 1);

    const completedSorted = stats.employee_stats ? [...stats.employee_stats].sort((a, b) => b.completed_count - a.completed_count) : [];
    const overdueSorted = stats.employee_stats ? [...stats.employee_stats].sort((a, b) => b.overdue_count - a.overdue_count) : [];
    const hoursSorted = stats.employee_stats ? [...stats.employee_stats].sort((a, b) => b.working_hours - a.working_hours) : [];

    return (
        <div style={{ margin: "-32px -32px -32px -32px", padding: "24px 32px", background: "var(--bg-main)", minHeight: "calc(100vh - 70px)", boxSizing: "border-box" }}>
            {/* Header / Breadcrumb */}
            <div style={{ marginBottom: "20px" }}>
                <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={onBack}>
                    ← Back to Projects
                </button>
            </div>

            {/* Top Project Summary Banner Card */}
            <div style={{ 
                background: "#ffffff", 
                border: "1px solid var(--border-color)", 
                borderRadius: "var(--radius-lg)", 
                padding: "24px", 
                boxShadow: "var(--shadow-sm)",
                marginBottom: "24px",
                display: "flex",
                gap: "24px",
                alignItems: "center",
                flexWrap: "wrap"
            }}>
                {/* 1. Large Letter Badge */}
                <div style={{
                    width: "70px",
                    height: "70px",
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    color: "#fff",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "30px",
                    fontWeight: "800",
                    boxShadow: "0 4px 12px rgba(234, 88, 12, 0.2)",
                    flexShrink: 0
                }}>
                    {initialLetter}
                </div>

                {/* 2. Project Name, Company, Status, Description */}
                <div style={{ flex: "1 1 300px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-main)", margin: 0 }}>{project.name}</h2>
                        <span className={`status-badge active`} style={{ fontSize: "11px", padding: "2px 8px" }}>
                            {project.status?.replace("_", " ")}
                        </span>
                    </div>
                    
                    <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>
                        Company/Client: <strong style={{ color: "var(--text-main)" }}>{project.client_name}</strong>
                    </div>

                    {project.description && (
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4", margin: 0, borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                            <strong>Description:</strong> {project.description}
                        </p>
                    )}
                </div>

                {/* 3. Metadata Grid (Right-aligned) */}
                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(2, minmax(160px, 1fr))", 
                    gap: "12px 24px", 
                    fontSize: "13px",
                    background: "#f8fafc",
                    padding: "16px 20px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    flex: "1 1 360px"
                }}>
                    <div>
                        <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "700", color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Project Manager</span>
                        <strong style={{ color: "var(--text-main)" }}>{project.manager_name}</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "700", color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Subscribed Service</span>
                        <strong style={{ color: "var(--text-main)" }}>{project.service_name}</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "700", color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Priority</span>
                        <strong style={{ color: "var(--text-main)", textTransform: "capitalize" }}>{project.priority}</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "700", color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Project Users</span>
                        <strong style={{ color: "var(--text-main)" }}>{(stats.employee_stats || []).length} assigned</strong>
                    </div>
                    {project.start_date && (
                        <div style={{ gridColumn: "span 2" }}>
                            <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "700", color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Timeline</span>
                            <strong style={{ color: "var(--text-main)" }}>{project.start_date} to {project.end_date || "Open"}</strong>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Tabs (Full Width) */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", marginBottom: "20px", background: "#ffffff", padding: "6px 16px 0", borderRadius: "12px 12px 0 0", boxShadow: "var(--shadow-sm)" }}>
                {[
                    { id: "performance", label: "Project Performance" },
                    { id: "tasks", label: "Task List" },
                    { id: "users", label: "Team / Users" },
                    { id: "attachments", label: "Attachments" }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        style={{
                            border: "none",
                            background: "transparent",
                            padding: "12px 20px",
                            fontSize: "14px",
                            fontWeight: "700",
                            cursor: "pointer",
                            color: activeSubTab === tab.id ? "var(--primary)" : "var(--text-muted)",
                            borderBottom: activeSubTab === tab.id ? "3px solid var(--primary)" : "3px solid transparent",
                            transition: "all 0.2s ease"
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Views */}
            {activeSubTab === "performance" && (
                <div>
                    {/* Summary Rows cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
                        {[
                            { label: "Total Tasks", val: stats.total_tasks, color: "var(--text-main)" },
                            { label: "Completed", val: stats.completed_tasks, color: "#22c55e" },
                            { label: "In Progress", val: stats.in_progress_tasks, color: "#3b82f6" },
                            { label: "Overdue", val: stats.overdue_tasks, color: "#ef4444" }
                        ].map((card, idx) => (
                            <div key={idx} style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "16px", textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>{card.label}</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: card.color }}>{card.val}</div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                        
                        {/* Donut Chart 1: Task Status */}
                        <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", marginBottom: "16px" }}>Task Status Overview</h3>
                            <DonutChart data={taskOverviewData} total={stats.total_tasks} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "16px", fontSize: "12px" }}>
                                {taskOverviewData.map((item, idx) => (
                                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color }}></span>
                                        <span style={{ color: "var(--text-muted)" }}>{item.label}: <strong>{item.value}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Donut Chart 2: Task Priority Distribution */}
                        <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", marginBottom: "16px" }}>Task Priority Distribution</h3>
                            <DonutChart data={taskPriorityData} total={totalPriority} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "16px", fontSize: "12px" }}>
                                {taskPriorityData.map((item, idx) => (
                                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color }}></span>
                                        <span style={{ color: "var(--text-muted)" }}>{item.label}: <strong>{item.value}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Weekly Productivity Trend Line Chart */}
                    <WeeklyTrendChart data={stats.weekly_trend || []} />

                    {/* Employee Leaderboards Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
                        
                        {/* 1. Most Tasks Completed */}
                        <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", marginBottom: "16px" }}>Most Tasks Completed</h3>
                            {completedSorted.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                    {completedSorted.map((emp, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: "10px" }}>
                                            <div style={{
                                                width: "28px", height: "28px", borderRadius: "50%", background: idx === 0 ? "linear-gradient(135deg, #fcd34d, #f59e0b)" : "#f1f5f9",
                                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800", color: idx === 0 ? "#fff" : "var(--text-muted)"
                                            }}>{idx + 1}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                                                    <strong>{emp.employee_name}</strong>
                                                    <span style={{ color: "#22c55e", fontWeight: "700" }}>{emp.completed_count} completed</span>
                                                </div>
                                                <div style={{ background: "#e2e8f0", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                                                    <div style={{ width: `${(emp.completed_count / (emp.tasks_count || 1)) * 100}%`, background: "#22c55e", height: "100%" }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-dim)", fontSize: "13px" }}>No employee stats available.</div>
                            )}
                        </div>

                        {/* 2. Most Overdue Tasks */}
                        <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", marginBottom: "16px" }}>Overdue Tasks by Employee</h3>
                            {overdueSorted.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                    {overdueSorted.map((emp, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: "10px" }}>
                                            <div style={{
                                                width: "28px", height: "28px", borderRadius: "50%", background: emp.overdue_count > 0 ? "rgba(239, 68, 68, 0.1)" : "#f1f5f9",
                                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800", color: emp.overdue_count > 0 ? "#ef4444" : "var(--text-muted)"
                                            }}>{idx + 1}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                                    <strong>{emp.employee_name}</strong>
                                                    <span style={{ 
                                                        color: emp.overdue_count > 0 ? "#ef4444" : "var(--text-muted)", 
                                                        fontWeight: emp.overdue_count > 0 ? "700" : "500",
                                                        background: emp.overdue_count > 0 ? "rgba(239, 68, 68, 0.08)" : "transparent",
                                                        padding: "2px 6px",
                                                        borderRadius: "4px"
                                                    }}>
                                                        {emp.overdue_count} overdue
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-dim)", fontSize: "13px" }}>No employee stats available.</div>
                            )}
                        </div>

                        {/* 3. Logged Working Hours */}
                        <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", marginBottom: "16px" }}>Hours Logged per Employee</h3>
                            {hoursSorted.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                    {hoursSorted.map((emp, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: "10px" }}>
                                            <div style={{
                                                width: "28px", height: "28px", borderRadius: "50%", background: "#f1f5f9",
                                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800", color: "var(--text-muted)"
                                            }}>{idx + 1}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                                                    <strong>{emp.employee_name}</strong>
                                                    <span style={{ color: "#3b82f6", fontWeight: "700" }}>{emp.working_hours} hrs</span>
                                                </div>
                                                <div style={{ background: "#e2e8f0", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                                                    <div style={{ width: `${(emp.working_hours / maxHours) * 100}%`, background: "#3b82f6", height: "100%" }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-dim)", fontSize: "13px" }}>No employee stats available.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === "tasks" && (
                <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>Project Tasks</h3>
                    
                    {/* Toolbar inside detail */}
                    <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                        <input
                            type="text"
                            className="form-input"
                            style={{ maxWidth: "200px" }}
                            placeholder="Search project tasks..."
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.target.value)}
                        />
                        <select
                            className="form-select"
                            style={{ maxWidth: "150px" }}
                            value={taskStatusFilter}
                            onChange={(e) => setTaskStatusFilter(e.target.value)}
                        >
                            <option value="All">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                        </select>

                        <select
                            className="form-select"
                            style={{ maxWidth: "180px" }}
                            value={taskEmployeeFilter}
                            onChange={(e) => setTaskEmployeeFilter(e.target.value)}
                        >
                            <option value="">All Employees</option>
                            {allEmployees.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "700" }}>Due Before:</span>
                            <input
                                type="date"
                                className="form-input"
                                style={{ width: "150px" }}
                                value={taskDueDate}
                                onChange={(e) => setTaskDueDate(e.target.value)}
                            />
                            {taskDueDate && (
                                <button
                                    className="btn-secondary"
                                    style={{ padding: "6px 12px", fontSize: "12px" }}
                                    onClick={() => setTaskDueDate("")}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="table-wrapper">
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Title</th>
                                    <th>Assigned Employee</th>
                                    <th>Priority</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasksLoading ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>Loading tasks...</td>
                                    </tr>
                                ) : tasks.length > 0 ? (
                                    tasks.map((t, idx) => (
                                        <tr key={t.id}>
                                            <td>{(taskPage - 1) * taskLimit + idx + 1}</td>
                                            <td>
                                                <strong>{t.title}</strong>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: "600", color: "var(--text-main)" }}>
                                                    {t.assigned_employee_name || "Unassigned"}
                                                </span>
                                            </td>
                                            <td><span style={{ textTransform: "capitalize" }}>{t.priority}</span></td>
                                            <td>{t.due_date || "N/A"}</td>
                                            <td>
                                                <span className={`status-badge ${t.status === "completed" ? "active" : "inactive"}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>No tasks found for this project.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Premium Tasks Pagination Footer */}
                    {taskTotal > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", flexWrap: "wrap", gap: "12px" }}>
                            <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "600" }}>
                                Showing {(taskPage - 1) * taskLimit + 1} to {Math.min(taskPage * taskLimit, taskTotal)} of {taskTotal} tasks
                            </span>
                            <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                    className="pagination-btn"
                                    onClick={() => setTaskPage(1)}
                                    disabled={taskPage === 1}
                                >
                                    « First
                                </button>
                                <button
                                    className="pagination-btn"
                                    onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                                    disabled={taskPage === 1}
                                >
                                    ‹ Prev
                                </button>
                                {Array.from({ length: Math.ceil(taskTotal / taskLimit) }, (_, i) => i + 1)
                                    .filter((p) => p >= taskPage - 2 && p <= taskPage + 2)
                                    .map((p) => (
                                        <button
                                            key={p}
                                            className={`pagination-btn ${taskPage === p ? "active" : ""}`}
                                            style={{
                                                background: taskPage === p ? "var(--primary)" : "#ffffff",
                                                color: taskPage === p ? "#ffffff" : "var(--text-main)",
                                                borderColor: taskPage === p ? "var(--primary)" : "var(--border-color)"
                                            }}
                                            onClick={() => setTaskPage(p)}
                                        >
                                            {p}
                                        </button>
                                    ))
                                }
                                <button
                                    className="pagination-btn"
                                    onClick={() => setTaskPage((p) => Math.min(Math.ceil(taskTotal / taskLimit), p + 1))}
                                    disabled={taskPage === Math.ceil(taskTotal / taskLimit) || taskTotal === 0}
                                >
                                    Next ›
                                </button>
                                <button
                                    className="pagination-btn"
                                    onClick={() => setTaskPage(Math.ceil(taskTotal / taskLimit))}
                                    disabled={taskPage === Math.ceil(taskTotal / taskLimit) || taskTotal === 0}
                                >
                                    Last »
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeSubTab === "users" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "24px" }}>
                    
                    {/* Left column: Assigned team list */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>Assigned Project Members</h3>
                        {teamLoading ? (
                            <div style={{ color: "var(--text-muted)" }}>Loading team data...</div>
                        ) : assignedEmployees.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {assignedEmployees.map((emp) => (
                                    <div key={emp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                                        <div>
                                            <strong style={{ color: "var(--text-main)", fontSize: "14px" }}>{emp.name}</strong>
                                            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{emp.designation} | {emp.department}</div>
                                        </div>
                                        <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Code: {emp.employee_code}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ color: "var(--text-dim)", fontSize: "13px" }}>No members assigned to this project yet. Use the right form to assign.</div>
                        )}
                    </div>

                    {/* Right column: Manage project employees */}
                    <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                        <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px" }}>Assign Team Members</h3>
                        <form onSubmit={handleAssignTeam}>
                            <div style={{ maxHeight: "280px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: "10px", background: "#f8fafc", marginBottom: "16px" }}>
                                {allEmployees.map((emp) => (
                                    <label key={emp.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", cursor: "pointer", fontSize: "13px" }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployeeIds.includes(emp.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                                                } else {
                                                    setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== emp.id));
                                                }
                                            }}
                                        />
                                        {emp.name}
                                    </label>
                                ))}
                            </div>
                            <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={isAssigning}>
                                {isAssigning ? "Saving..." : "Save Assignments"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeSubTab === "attachments" && (
                <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Project Attachments</h3>
                        <label className="btn-primary" style={{ cursor: "pointer", fontSize: "13px", padding: "6px 14px", display: "inline-flex", alignItems: "center" }}>
                            {uploading ? "Uploading..." : "📂 Upload File"}
                            <input type="file" style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    </div>

                    {attachmentsLoading ? (
                        <div style={{ color: "var(--text-muted)" }}>Loading files...</div>
                    ) : attachments.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            {attachments.map((file) => (
                                <div key={file.id} style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                                        <strong style={{ fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }} title={file.file_name}>
                                            {file.file_name}
                                        </strong>
                                        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                                            {formatBytes(file.file_size)} | {file.file_type?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        <a href={`${api.defaults.baseURL}/attachments/${file.id}/download`} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }} title="Download">
                                            ⬇️
                                        </a>
                                        <button className="btn-icon delete" onClick={() => handleDeleteAttachment(file.id)} title="Delete">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontSize: "13px" }}>No attachments uploaded yet. Feel free to upload project docs.</div>
                    )}
                </div>
            )}
        </div>
    );
}

// Inner Donut Chart subcomponent
function DonutChart({ data, total }) {
    const R = 40;
    const C = 2 * Math.PI * R; // ~251.3
    let currentOffset = 0;

    if (!total || total === 0) {
        return (
            <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto" }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={R} fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "12px", fontWeight: "700", color: "#94a3b8" }}>No Tasks</div>
            </div>
        );
    }

    return (
        <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto" }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                {data.map((item, idx) => {
                    const percentage = item.value / total;
                    const strokeLength = percentage * C;
                    const strokeOffset = C - strokeLength + currentOffset;
                    currentOffset -= strokeLength;
                    if (item.value === 0) return null;
                    return (
                        <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r={R}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="8"
                            strokeDasharray={C}
                            strokeDashoffset={strokeOffset}
                            strokeLinecap="round"
                            style={{ transition: "stroke-dashoffset 0.8s ease" }}
                        />
                    );
                })}
            </svg>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)" }}>{total}</div>
                <div style={{ fontSize: "9px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "700" }}>Total</div>
            </div>
        </div>
    );
}

// Inner Weekly Productivity Trend Line Chart subcomponent
function WeeklyTrendChart({ data }) {
    const height = 180;
    const width = 700; // SVG viewBox dimensions
    const maxVal = Math.max(...data.map((d) => d.working_hours), 12);
    
    // Compute points
    const points = data.map((d, index) => {
        const x = 50 + (index / 6) * (width - 100);
        const y = height - 35 - (d.working_hours / maxVal) * (height - 70);
        return { x, y, label: d.label, hours: d.working_hours };
    });

    // Helper for smooth Bezier curve path
    const getBezierPath = (pts) => {
        if (pts.length === 0) return "";
        let path = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i];
            const p1 = pts[i+1];
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            const cp1y = p0.y;
            const cp2x = p0.x + (p1.x - p0.x) / 2;
            const cp2y = p1.y;
            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
        }
        return path;
    };

    const pathD = getBezierPath(points);

    return (
        <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "24px", boxShadow: "var(--shadow-sm)", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>Weekly Time Log Summary</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)", fontWeight: "700" }}>
                    <span style={{ display: "inline-block", width: "24px", height: "10px", border: "2px solid #007bff", background: "rgba(0, 123, 255, 0.15)", borderRadius: "2px" }}></span>
                    Logged Hours
                </div>
            </div>
            
            <div style={{ width: "100%", overflowX: "auto" }}>
                <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: "visible" }}>
                    <defs>
                        <linearGradient id="weekly-blue-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#007bff" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#007bff" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Vertical Gridlines */}
                    {points.map((p, idx) => (
                        <line 
                            key={`v-grid-${idx}`} 
                            x1={p.x} 
                            y1={30} 
                            x2={p.x} 
                            y2={height - 35} 
                            stroke="#e2e8f0" 
                            strokeWidth="0.75" 
                        />
                    ))}

                    {/* Horizontal Gridlines */}
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((p, idx) => {
                        const y = height - 35 - p * (height - 70);
                        const valLabel = Math.round(p * maxVal);
                        return (
                            <g key={idx}>
                                <line 
                                    x1="45" 
                                    y1={y} 
                                    x2={width - 45} 
                                    y2={y} 
                                    stroke="#e2e8f0" 
                                    strokeWidth="0.75" 
                                />
                                <text 
                                    x="35" 
                                    y={y + 3} 
                                    fill="#64748b" 
                                    fontSize="11" 
                                    fontWeight="600" 
                                    textAnchor="end"
                                >
                                    {valLabel}
                                </text>
                            </g>
                        );
                    })}

                    {/* Area fill under curve */}
                    {points.length > 0 && (
                        <path
                            d={`${pathD} L ${points[points.length - 1].x} ${height - 35} L ${points[0].x} ${height - 35} Z`}
                            fill="url(#weekly-blue-gradient)"
                        />
                    )}

                    {/* Bezier Trend Line */}
                    {points.length > 0 && (
                        <path
                            d={pathD}
                            fill="none"
                            stroke="#007bff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Dots, Hours & Labels */}
                    {points.map((p, idx) => (
                        <g key={idx}>
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                fill="#ffffff"
                                stroke="#007bff"
                                strokeWidth="2.5"
                            />
                            {p.hours > 0 && (
                                <text
                                    x={p.x}
                                    y={p.y - 12}
                                    textAnchor="middle"
                                    fill="var(--text-main)"
                                    fontSize="10"
                                    fontWeight="800"
                                >
                                    {p.hours}h
                                </text>
                            )}
                            <text
                                x={p.x}
                                y={height - 12}
                                textAnchor="middle"
                                fill="#64748b"
                                fontSize="11"
                                fontWeight="700"
                            >
                                {p.label}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}

export default ProjectDetailView;
