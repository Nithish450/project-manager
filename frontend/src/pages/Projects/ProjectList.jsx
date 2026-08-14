import { useState, useEffect } from "react";
import api from "../../services/api";
import ProjectDetailView from "./ProjectDetailView";
import { showSuccess, showError, showConfirm } from "../../utils/swal";

function ProjectList() {
    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [managers, setManagers] = useState([]);
    const [servicesList, setServicesList] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);

    // Viewing dashboard sub-view state
    const [viewingProjectId, setViewingProjectId] = useState(null);

    // Advanced search & filters state
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterServiceId, setFilterServiceId] = useState("");
    const [filterPriority, setFilterPriority] = useState("");
    
    // Date range filters
    const [filterStartDateFrom, setFilterStartDateFrom] = useState("");
    const [filterStartDateTo, setFilterStartDateTo] = useState("");
    const [filterEndDateFrom, setFilterEndDateFrom] = useState("");
    const [filterEndDateTo, setFilterEndDateTo] = useState("");

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        client_id: "",
        service_id: "",
        project_manager_id: "",
        status: "initiated",
        priority: "medium",
        start_date: "",
        end_date: "",
    });

    // Fetch projects when page, limit, status, service, priority, or dates change
    useEffect(() => {
        if (!viewingProjectId) {
            fetchProjects();
        }
    }, [
        page, 
        limit, 
        filterStatus, 
        filterServiceId, 
        filterPriority, 
        filterStartDateFrom, 
        filterStartDateTo, 
        filterEndDateFrom, 
        filterEndDateTo,
        viewingProjectId
    ]);

    // Debounce search fetching and reset to page 1
    useEffect(() => {
        if (!viewingProjectId) {
            const timer = setTimeout(() => {
                if (page === 1) {
                    fetchProjects();
                } else {
                    setPage(1); // will trigger the fetch
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchTerm]);

    useEffect(() => {
        fetchClients();
        fetchManagers();
        fetchServices();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await api.get("/projects", {
                params: {
                    page,
                    limit,
                    search: searchTerm || undefined,
                    status: filterStatus === "All" ? undefined : filterStatus,
                    service_id: filterServiceId || undefined,
                    priority: filterPriority || undefined,
                    start_date_from: filterStartDateFrom || undefined,
                    start_date_to: filterStartDateTo || undefined,
                    end_date_from: filterEndDateFrom || undefined,
                    end_date_to: filterEndDateTo || undefined,
                }
            });
            setProjects(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error("Fetch projects error:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await api.get("/clients");
            setClients(res.data.data || []);
        } catch (err) {
            console.error("Fetch clients error:", err);
        }
    };

    const fetchManagers = async () => {
        try {
            const res = await api.get("/employees");
            setManagers(res.data.data || []);
        } catch (err) {
            console.error("Fetch managers error:", err);
        }
    };

    const fetchServices = async () => {
        try {
            const res = await api.get("/services");
            setServicesList(res.data.data || []);
        } catch (err) {
            console.error("Fetch services error:", err);
        }
    };

    const fetchClientServices = async (clientId) => {
        if (!clientId) {
            setAvailableServices([]);
            return;
        }
        try {
            const res = await api.get(`/clients/${clientId}/services`);
            setAvailableServices(res.data.data || []);
        } catch (err) {
            console.error("Fetch client services error:", err);
            setAvailableServices([]);
        }
    };

    const handleClientChange = (clientId) => {
        setFormData((prev) => ({
            ...prev,
            client_id: clientId,
            service_id: "",
        }));
        fetchClientServices(clientId);
    };

    const handleOpenModal = (project = null) => {
        if (project) {
            setSelectedProject(project);
            setFormData({
                name: project.name || "",
                description: project.description || "",
                client_id: project.client_id || "",
                service_id: project.service_id || "",
                project_manager_id: project.project_manager_id || "",
                status: project.status || "initiated",
                priority: project.priority || "medium",
                start_date: project.start_date || "",
                end_date: project.end_date || "",
            });
            if (project.client_id) {
                fetchClientServices(project.client_id);
            }
        } else {
            setSelectedProject(null);
            setFormData({
                name: "",
                description: "",
                client_id: "",
                service_id: "",
                project_manager_id: "",
                status: "initiated",
                priority: "medium",
                start_date: "",
                end_date: "",
            });
            setAvailableServices([]);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                description: formData.description || null,
                client_id: formData.client_id ? parseInt(formData.client_id) : null,
                service_id: formData.service_id ? parseInt(formData.service_id) : null,
                project_manager_id: formData.project_manager_id ? parseInt(formData.project_manager_id) : null,
                status: formData.status || "initiated",
                priority: formData.priority || "medium",
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
            };

            if (selectedProject) {
                await api.put(`/projects/${selectedProject.id}`, payload);
                showSuccess("Updated!", "Project updated successfully.");
            } else {
                await api.post("/projects", payload);
                showSuccess("Created!", "Project created successfully.");
            }

            fetchProjects();
            setIsModalOpen(false);
        } catch (err) {
            console.error("Save project error:", err);
            showError("Error", err.response?.data?.detail || "Failed to save project");
        }
    };

    const handleStatusChangeInline = async (projectId, newStatus) => {
        try {
            await api.put(`/projects/${projectId}`, { status: newStatus });
            fetchProjects();
            showSuccess("Updated!", `Project status updated to ${newStatus}.`);
        } catch (err) {
            console.error("Inline status update failed:", err);
            showError("Error", "Failed to update status inline.");
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm("Delete Project?", "Are you sure you want to delete this project? This will delete all work items and task histories associated with it.");
        if (!confirmed) return;
        try {
            await api.delete(`/projects/${id}`);
            fetchProjects();
            showSuccess("Deleted!", "Project has been deleted.");
        } catch (err) {
            console.error("Delete project error:", err);
            showError("Error", "Delete failed.");
        }
    };

    const getClientName = (clientId) => {
        const client = clients.find((c) => c.id === clientId);
        return client ? client.company_name : `Client #${clientId}`;
    };

    const getManagerName = (managerId) => {
        const mgr = managers.find((m) => m.id === managerId);
        return mgr ? mgr.name : `Manager #${managerId}`;
    };

    const clearAllFilters = () => {
        setSearchTerm("");
        setFilterStatus("All");
        setFilterServiceId("");
        setFilterPriority("");
        setFilterStartDateFrom("");
        setFilterStartDateTo("");
        setFilterEndDateFrom("");
        setFilterEndDateTo("");
        setPage(1);
    };

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startRange = (page - 1) * limit + 1;
    const endRange = Math.min(page * limit, total);

    // If detail view dashboard is active
    if (viewingProjectId) {
        return (
            <ProjectDetailView 
                projectId={viewingProjectId} 
                onBack={() => setViewingProjectId(null)} 
            />
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Project Management</h1>
                    <p className="page-subtitle">Track project lifecycles, client services, and team leads</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    + New Project
                </button>
            </div>

            {/* Advanced Filters Toolbar */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "24px", boxShadow: "var(--shadow-sm)" }}>
                
                {/* Search & Status Filters */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
                    <div className="search-box" style={{ width: "100%" }}>
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search projects by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div style={{ display: "flex", gap: "8px" }}>
                        <select
                            className="form-select"
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                            style={{ minWidth: "160px" }}
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
                            value={filterPriority}
                            onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
                            style={{ minWidth: "140px" }}
                        >
                            <option value="">All Priorities</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    
                    <button className="btn-secondary" style={{ padding: "10px 14px" }} onClick={clearAllFilters}>
                        🧹 Clear Filters
                    </button>
                </div>

                {/* Sub-Filters: Date Range & Service wise */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                    
                    {/* Service wise */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Filter by Subscribed Service</label>
                        <select
                            className="form-select"
                            value={filterServiceId}
                            onChange={(e) => { setFilterServiceId(e.target.value); setPage(1); }}
                        >
                            <option value="">All Services</option>
                            {servicesList.map((s) => (
                                <option key={s.id} value={s.id}>{s.service_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start Date Range */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Project Start Date Range</label>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                                type="date"
                                className="form-input"
                                value={filterStartDateFrom}
                                onChange={(e) => { setFilterStartDateFrom(e.target.value); setPage(1); }}
                            />
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>to</span>
                            <input
                                type="date"
                                className="form-input"
                                value={filterStartDateTo}
                                onChange={(e) => { setFilterStartDateTo(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>

                    {/* End/Due Date Range */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px" }}>Project Due Date Range</label>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input
                                type="date"
                                className="form-input"
                                value={filterEndDateFrom}
                                onChange={(e) => { setFilterEndDateFrom(e.target.value); setPage(1); }}
                            />
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>to</span>
                            <input
                                type="date"
                                className="form-input"
                                value={filterEndDateTo}
                                onChange={(e) => { setFilterEndDateTo(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Table layout display */}
            <div className="table-container">
                <div className="table-wrapper">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Project Name</th>
                                <th>Client</th>
                                <th>Project Manager</th>
                                <th>Priority</th>
                                <th style={{ width: "160px" }}>Completion Percentage</th>
                                <th style={{ width: "180px" }}>Status</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                        Loading projects...
                                    </td>
                                </tr>
                            ) : projects.length > 0 ? (
                                projects.map((project, idx) => {
                                    const progress = project.completion_percentage || 0;
                                    return (
                                        <tr key={project.id}>
                                            <td>
                                                <span className="project-id-tag">{(page - 1) * limit + idx + 1}</span>
                                            </td>
                                            <td>
                                                <a 
                                                    href="#" 
                                                    onClick={(e) => { e.preventDefault(); setViewingProjectId(project.id); }}
                                                    style={{ textDecoration: "none", color: "var(--primary)", fontWeight: "700" }}
                                                >
                                                    {project.name}
                                                </a>
                                                {project.description && (
                                                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {project.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{project.client_id ? getClientName(project.client_id) : "N/A"}</td>
                                            <td>{project.project_manager_id ? getManagerName(project.project_manager_id) : "N/A"}</td>
                                            <td>
                                                <span style={{ textTransform: "capitalize", fontWeight: "600", fontSize: "13px" }}>
                                                    {project.priority || "Medium"}
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
                                                <select
                                                    value={project.status}
                                                    onChange={(e) => handleStatusChangeInline(project.id, e.target.value)}
                                                    className="form-select"
                                                    style={{
                                                        padding: "4px 8px",
                                                        fontSize: "13px",
                                                        height: "auto",
                                                        width: "auto",
                                                        background: "#fff",
                                                        border: "1px solid var(--border-color)",
                                                        borderRadius: "var(--radius-sm)",
                                                        fontWeight: "600",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <option value="initiated">Initiated</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="waiting_for_review">Waiting for Review</option>
                                                    <option value="hold">Hold</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <div className="card-actions" style={{ justifyContent: "flex-end" }}>
                                                    <button 
                                                        className="btn-icon" 
                                                        title="View Project Dashboard" 
                                                        onClick={() => setViewingProjectId(project.id)}
                                                    >
                                                        👁️
                                                    </button>
                                                    <button 
                                                        className="btn-icon" 
                                                        title="Edit Project" 
                                                        onClick={() => handleOpenModal(project)}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button 
                                                        className="btn-icon delete" 
                                                        title="Delete Project" 
                                                        onClick={() => handleDelete(project.id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                        No projects found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="pagination-bar">
                    <div className="pagination-left">
                        <span>
                            Showing <strong>{total > 0 ? startRange : 0}</strong> to <strong>{endRange}</strong> of <strong>{total}</strong> projects
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

            {/* Create / Edit Project Modal */}
            {isModalOpen && (
                <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedProject ? "Edit Project" : "Create New Project"}</h2>
                            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Project Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-textarea"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div className="form-group">
                                        <label className="form-label">Client</label>
                                        <select
                                            className="form-select"
                                            value={formData.client_id}
                                            onChange={(e) => handleClientChange(e.target.value)}
                                        >
                                            <option value="">Select Client</option>
                                            {clients.map((c) => (
                                                <option key={c.id} value={c.id}>{c.company_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Service (Client's Subscribed)</label>
                                        <select
                                            className="form-select"
                                            value={formData.service_id}
                                            onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                                            disabled={!formData.client_id}
                                        >
                                            <option value="">
                                                {formData.client_id ? "Select Subscribed Service" : "Select Client First"}
                                            </option>
                                            {availableServices.map((s) => (
                                                <option key={s.id} value={s.id}>{s.service_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div className="form-group">
                                        <label className="form-label">Project Manager</label>
                                        <select
                                            className="form-select"
                                            value={formData.project_manager_id}
                                            onChange={(e) => setFormData({ ...formData, project_manager_id: e.target.value })}
                                        >
                                            <option value="">Select Manager</option>
                                            {managers.map((m) => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Priority</label>
                                        <select
                                            className="form-select"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Start Date & Due Date Optional Fields */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div className="form-group">
                                        <label className="form-label">Start Date (Optional)</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Due Date (Optional)</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        className="form-select"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="initiated">Initiated</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="waiting_for_review">Waiting for Review</option>
                                        <option value="hold">Hold</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary">{selectedProject ? "Update Project" : "Create Project"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProjectList;