import { useState, useEffect } from "react";
import api from "../../services/api";

function Reports() {
    const [activeReportTab, setActiveReportTab] = useState("projects");
    const [reportsData, setReportsData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [loading, setLoading] = useState(false);

    // Dropdown filters lists
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [services, setServices] = useState([]);
    const [clients, setClients] = useState([]);

    // Project filters
    const [projSearch, setProjSearch] = useState("");
    const [projStatus, setProjStatus] = useState("All");
    const [projPriority, setProjPriority] = useState("");
    const [projClientId, setProjClientId] = useState("");
    const [projServiceId, setProjServiceId] = useState("");
    const [projStartDateFrom, setProjStartDateFrom] = useState("");
    const [projStartDateTo, setProjStartDateTo] = useState("");
    const [projEndDateFrom, setProjEndDateFrom] = useState("");
    const [projEndDateTo, setProjEndDateTo] = useState("");

    // Work Item filters
    const [wiSearch, setWiSearch] = useState("");
    const [wiStatus, setWiStatus] = useState("All");
    const [wiPriority, setWiPriority] = useState("");
    const [wiProjectId, setWiProjectId] = useState("");
    const [wiEmployeeId, setWiEmployeeId] = useState("");
    const [wiServiceId, setWiServiceId] = useState("");
    const [wiDueStart, setWiDueStart] = useState("");
    const [wiDueEnd, setWiDueEnd] = useState("");

    // Load filter dropdown datasets on mount
    useEffect(() => {
        const loadFilterData = async () => {
            try {
                const [projRes, empRes, srvRes, cliRes] = await Promise.all([
                    api.get("/projects?limit=1000"),
                    api.get("/employees?limit=1000"),
                    api.get("/services?limit=1000"),
                    api.get("/clients?limit=1000"),
                ]);
                setProjects(projRes.data.data || []);
                setEmployees(empRes.data.data || []);
                setServices(srvRes.data.data || []);
                setClients(cliRes.data.data || []);
            } catch (err) {
                console.error("Failed to load filter datasets:", err);
            }
        };
        loadFilterData();
    }, []);

    // Load reports data
    useEffect(() => {
        fetchReportsData();
    }, [
        activeReportTab, page, limit,
        projSearch, projStatus, projPriority, projClientId, projServiceId, projStartDateFrom, projStartDateTo, projEndDateFrom, projEndDateTo,
        wiSearch, wiStatus, wiPriority, wiProjectId, wiEmployeeId, wiServiceId, wiDueStart, wiDueEnd
    ]);

    const fetchReportsData = async () => {
        setLoading(true);
        try {
            if (activeReportTab === "projects") {
                const res = await api.get("/reports/projects", {
                    params: {
                        search: projSearch || undefined,
                        status: projStatus === "All" ? undefined : projStatus,
                        priority: projPriority || undefined,
                        client_id: projClientId || undefined,
                        service_id: projServiceId || undefined,
                        start_date_from: projStartDateFrom || undefined,
                        start_date_to: projStartDateTo || undefined,
                        end_date_from: projEndDateFrom || undefined,
                        end_date_to: projEndDateTo || undefined,
                        page,
                        limit,
                    }
                });
                setReportsData(res.data.data || []);
                setTotal(res.data.count || 0);
            } else {
                const res = await api.get("/reports/work-items", {
                    params: {
                        search: wiSearch || undefined,
                        status: wiStatus === "All" ? undefined : wiStatus,
                        priority: wiPriority || undefined,
                        project_id: wiProjectId || undefined,
                        assigned_employee_id: wiEmployeeId || undefined,
                        service_id: wiServiceId || undefined,
                        due_start: wiDueStart || undefined,
                        due_end: wiDueEnd || undefined,
                        page,
                        limit,
                    }
                });
                setReportsData(res.data.data || []);
                setTotal(res.data.count || 0);
            }
        } catch (err) {
            console.error("Failed to load report:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleClearProjFilters = () => {
        setProjSearch("");
        setProjStatus("All");
        setProjPriority("");
        setProjClientId("");
        setProjServiceId("");
        setProjStartDateFrom("");
        setProjStartDateTo("");
        setProjEndDateFrom("");
        setProjEndDateTo("");
        setPage(1);
    };

    const handleClearWiFilters = () => {
        setWiSearch("");
        setWiStatus("All");
        setWiPriority("");
        setWiProjectId("");
        setWiEmployeeId("");
        setWiServiceId("");
        setWiDueStart("");
        setWiDueEnd("");
        setPage(1);
    };

    const handleExportCSV = () => {
        let url = `http://127.0.0.1:8000/reports/${activeReportTab}?export=csv`;
        const params = {};

        if (activeReportTab === "projects") {
            if (projSearch) params.search = projSearch;
            if (projStatus !== "All") params.status = projStatus;
            if (projPriority) params.priority = projPriority;
            if (projClientId) params.client_id = projClientId;
            if (projServiceId) params.service_id = projServiceId;
            if (projStartDateFrom) params.start_date_from = projStartDateFrom;
            if (projStartDateTo) params.start_date_to = projStartDateTo;
            if (projEndDateFrom) params.end_date_from = projEndDateFrom;
            if (projEndDateTo) params.end_date_to = projEndDateTo;
        } else {
            if (wiSearch) params.search = wiSearch;
            if (wiStatus !== "All") params.status = wiStatus;
            if (wiPriority) params.priority = wiPriority;
            if (wiProjectId) params.project_id = wiProjectId;
            if (wiEmployeeId) params.assigned_employee_id = wiEmployeeId;
            if (wiServiceId) params.service_id = wiServiceId;
            if (wiDueStart) params.due_start = wiDueStart;
            if (wiDueEnd) params.due_end = wiDueEnd;
        }

        const queryStr = new URLSearchParams(params).toString();
        if (queryStr) {
            url += `&${queryStr}`;
        }
        window.open(url, "_blank");
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startRange = (page - 1) * limit + 1;
    const endRange = Math.min(page * limit, total);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reports & Analytics</h1>
                    <p className="page-subtitle">Export comprehensive organization data in CSV / Excel formats</p>
                </div>
                <button className="btn-primary" onClick={handleExportCSV}>
                    📥 Export CSV / Excel
                </button>
            </div>

            <div className="toolbar" style={{ marginBottom: "16px" }}>
                <div className="filter-tabs">
                    <button
                        className={`filter-btn ${activeReportTab === "projects" ? "active" : ""}`}
                        onClick={() => { setActiveReportTab("projects"); setPage(1); }}
                    >
                        Project Reports
                    </button>
                    <button
                        className={`filter-btn ${activeReportTab === "work-items" ? "active" : ""}`}
                        onClick={() => { setActiveReportTab("work-items"); setPage(1); }}
                    >
                        Work Item Reports
                    </button>
                </div>
            </div>

            {/* Advanced Filters Panel */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "24px", boxShadow: "var(--shadow-sm)" }}>
                {activeReportTab === "projects" ? (
                    <div>
                        {/* Search & Main Selects */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
                            <div className="search-box" style={{ width: "100%" }}>
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search projects by name..."
                                    value={projSearch}
                                    onChange={(e) => { setProjSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                            <select
                                className="form-select"
                                value={projStatus}
                                onChange={(e) => { setProjStatus(e.target.value); setPage(1); }}
                                style={{ minWidth: "160px", padding: "8px 12px", fontSize: "13px", height: "38px" }}
                            >
                                <option value="All">All Statuses</option>
                                <option value="initiated">Initiated</option>
                                <option value="in_progress">In Progress</option>
                                <option value="waiting_for_review">Waiting for Review</option>
                                <option value="hold">Hold</option>
                                <option value="completed">Completed</option>
                            </select>
                            <select
                                className="form-select"
                                value={projPriority}
                                onChange={(e) => { setProjPriority(e.target.value); setPage(1); }}
                                style={{ minWidth: "140px", padding: "8px 12px", fontSize: "13px", height: "38px" }}
                            >
                                <option value="">All Priorities</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                            <button className="btn-secondary" style={{ padding: "10px 14px", height: "38px" }} onClick={handleClearProjFilters}>
                                🧹 Clear Filters
                            </button>
                        </div>

                        {/* Date selectors & lookup selectors */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                            <div>
                                <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Client</label>
                                <select
                                    className="form-select"
                                    value={projClientId}
                                    onChange={(e) => { setProjClientId(e.target.value); setPage(1); }}
                                    style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                >
                                    <option value="">All Clients</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.company_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Subscribed Service</label>
                                <select
                                    className="form-select"
                                    value={projServiceId}
                                    onChange={(e) => { setProjServiceId(e.target.value); setPage(1); }}
                                    style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                >
                                    <option value="">All Services</option>
                                    {services.map((s) => (
                                        <option key={s.id} value={s.id}>{s.service_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Start Date Range</label>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={projStartDateFrom}
                                        onChange={(e) => { setProjStartDateFrom(e.target.value); setPage(1); }}
                                        style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                    />
                                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>to</span>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={projStartDateTo}
                                        onChange={(e) => { setProjStartDateTo(e.target.value); setPage(1); }}
                                        style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Due Date Range</label>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={projEndDateFrom}
                                        onChange={(e) => { setProjEndDateFrom(e.target.value); setPage(1); }}
                                        style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                    />
                                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>to</span>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={projEndDateTo}
                                        onChange={(e) => { setProjEndDateTo(e.target.value); setPage(1); }}
                                        style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Search & Main Selects */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
                            <div className="search-box" style={{ width: "100%" }}>
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search work items by title, project or employee..."
                                    value={wiSearch}
                                    onChange={(e) => { setWiSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                            <select
                                className="form-select"
                                value={wiStatus}
                                onChange={(e) => { setWiStatus(e.target.value); setPage(1); }}
                                style={{ minWidth: "160px", padding: "8px 12px", fontSize: "13px", height: "38px" }}
                            >
                                <option value="All">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="overdue">Overdue</option>
                            </select>
                            <select
                                className="form-select"
                                value={wiPriority}
                                onChange={(e) => { setWiPriority(e.target.value); setPage(1); }}
                                style={{ minWidth: "140px", padding: "8px 12px", fontSize: "13px", height: "38px" }}
                            >
                                <option value="">All Priorities</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                            <button className="btn-secondary" style={{ padding: "10px 14px", height: "38px" }} onClick={handleClearWiFilters}>
                                🧹 Clear Filters
                            </button>
                        </div>

                        {/* Date selectors & lookup selectors */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                            <div>
                                <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Project</label>
                                <select
                                    className="form-select"
                                    value={wiProjectId}
                                    onChange={(e) => { setWiProjectId(e.target.value); setPage(1); }}
                                    style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                >
                                    <option value="">All Projects</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Employee</label>
                                <select
                                    className="form-select"
                                    value={wiEmployeeId}
                                    onChange={(e) => { setWiEmployeeId(e.target.value); setPage(1); }}
                                    style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                >
                                    <option value="">All Employees</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Service</label>
                                <select
                                    className="form-select"
                                    value={wiServiceId}
                                    onChange={(e) => { setWiServiceId(e.target.value); setPage(1); }}
                                    style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                >
                                    <option value="">All Services</option>
                                    {services.map((s) => (
                                        <option key={s.id} value={s.id}>{s.service_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Due Date Range</label>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={wiDueStart}
                                        onChange={(e) => { setWiDueStart(e.target.value); setPage(1); }}
                                        style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                    />
                                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>to</span>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={wiDueEnd}
                                        onChange={(e) => { setWiDueEnd(e.target.value); setPage(1); }}
                                        style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Reports Tables */}
            <div className="table-container">
                <div className="table-wrapper">
                    {activeReportTab === "projects" ? (
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Project Name</th>
                                    <th>Client</th>
                                    <th>Project Manager</th>
                                    <th>Priority</th>
                                    <th style={{ width: "160px" }}>Completion Percentage</th>
                                    <th style={{ width: "160px" }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                            Loading project reports...
                                        </td>
                                    </tr>
                                ) : reportsData.length > 0 ? (
                                    reportsData.map((p, idx) => {
                                        const progress = p["Completion Percentage"] || 0;
                                        return (
                                            <tr key={p.ID || idx}>
                                                <td>
                                                    <span className="project-id-tag">{(page - 1) * limit + idx + 1}</span>
                                                </td>
                                                <td>
                                                    <strong>{p.Name}</strong>
                                                    {p.Description && (
                                                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                            {p.Description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{p.Client || "N/A"}</td>
                                                <td>{p.Manager || "N/A"}</td>
                                                <td>
                                                    <span style={{ textTransform: "capitalize", fontWeight: "600", fontSize: "13px" }}>
                                                        {p.Priority || "Medium"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <div style={{ width: "100%", background: "#e2e8f0", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                                                            <div style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--primary), #8b5cf6)", height: "100%" }}></div>
                                                        </div>
                                                        <strong style={{ fontSize: "12px", minWidth: "30px" }}>{progress}%</strong>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${p.Status === "completed" ? "active" : "inactive"}`}>
                                                        {p.Status?.replace("_", " ")}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                            No project reports found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Title</th>
                                    <th>Project</th>
                                    <th>Assigned Employee</th>
                                    <th>Priority</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                            Loading work item reports...
                                        </td>
                                    </tr>
                                ) : reportsData.length > 0 ? (
                                    reportsData.map((w, idx) => (
                                        <tr key={w.ID || idx}>
                                            <td>
                                                <span className="project-id-tag">{(page - 1) * limit + idx + 1}</span>
                                            </td>
                                            <td>
                                                <strong>{w.Title}</strong>
                                                {w.Description && (
                                                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {w.Description}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div>
                                                    <div style={{ fontWeight: "600" }}>{w["Project Name"]}</div>
                                                    {w["Service Name"] && (
                                                        <span style={{ 
                                                            fontSize: "11px", 
                                                            background: "rgba(79, 70, 229, 0.08)", 
                                                            color: "var(--primary)", 
                                                            padding: "2px 6px", 
                                                            borderRadius: "4px", 
                                                            marginTop: "4px",
                                                            display: "inline-block",
                                                            fontWeight: "500"
                                                        }}>
                                                            {w["Service Name"]}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{w["Assigned Employee"]}</td>
                                            <td>
                                                <span style={{ textTransform: "capitalize", fontWeight: "600", fontSize: "13px" }}>
                                                    {w.Priority}
                                                </span>
                                            </td>
                                            <td>{w["Due Date"] || "N/A"}</td>
                                            <td>
                                                <span className={`status-badge ${w.Status === "completed" ? "active" : "inactive"}`}>
                                                    {w.Status?.replace("_", " ")}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                            No work item reports found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                <div className="pagination-bar" style={{ borderTop: "1px solid var(--border-color)", padding: "16px 24px" }}>
                    <div className="pagination-left">
                        <span>
                            Showing <strong>{total > 0 ? startRange : 0}</strong> to <strong>{endRange}</strong> of <strong>{total}</strong> reports
                        </span>
                        <div className="pagination-limit">
                            <label>Rows per page:</label>
                            <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}>
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                            </select>
                        </div>
                    </div>
                    <div className="pagination-right">
                        <button
                            className="pagination-btn"
                            onClick={() => setPage(1)}
                            disabled={page === 1}
                        >
                            «
                        </button>
                        <button
                            className="pagination-btn"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            ‹
                        </button>
                        <button className="pagination-btn active">{page}</button>
                        <button
                            className="pagination-btn"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            ›
                        </button>
                        <button
                            className="pagination-btn"
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages}
                        >
                            »
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Reports;
