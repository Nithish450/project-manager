import { useState, useEffect } from "react";
import api from "../../services/api";
import TaskDetailView from "./TaskDetailView";
import { showSuccess, showError, showConfirm } from "../../utils/swal";

function WorkItemList({ currentUser }) {
    const [workItems, setWorkItems] = useState([]);
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [services, setServices] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    // Filter states
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [selectedServiceId, setSelectedServiceId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [formData, setFormData] = useState({
        project_id: "",
        assigned_employee_id: "",
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        due_date: "",
        estimated_hours: 0,
    });

    // Task Execution Detail Page state
    const [viewingTaskId, setViewingTaskId] = useState(null);

    const isEmployeeRole = currentUser?.role === "employee";

    // Fetch work items on page, limit, statusFilter, or other filters changes
    useEffect(() => {
        if (currentUser) {
            fetchWorkItems();
        }
    }, [page, limit, statusFilter, selectedProjectId, selectedEmployeeId, selectedServiceId, startDate, endDate, currentUser]);

    // Debounce search fetching and reset to page 1
    useEffect(() => {
        if (currentUser) {
            const timer = setTimeout(() => {
                if (page === 1) {
                    fetchWorkItems();
                } else {
                    setPage(1); // will trigger the fetch in page change useEffect
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchTerm, currentUser]);

    useEffect(() => {
        fetchProjects();
        fetchEmployees();
        fetchServices();
    }, []);

    const fetchWorkItems = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            let empId = undefined;
            // For employee portal, resolve the employee's ID using their login email
            if (isEmployeeRole && currentUser?.email) {
                const empRes = await api.get("/employees", { params: { search: currentUser.email } });
                const matchedEmp = empRes.data.data?.find((e) => e.email === currentUser.email);
                if (matchedEmp) {
                    empId = matchedEmp.id;
                }
            } else if (selectedEmployeeId) {
                empId = parseInt(selectedEmployeeId);
            }

            const res = await api.get("/work-items", {
                params: {
                    page,
                    limit,
                    search: searchTerm || undefined,
                    status: statusFilter === "All" ? undefined : statusFilter,
                    assigned_employee_id: empId,
                    project_id: selectedProjectId || undefined,
                    service_id: selectedServiceId || undefined,
                    due_start: startDate || undefined,
                    due_end: endDate || undefined,
                }
            });
            setWorkItems(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await api.get("/projects");
            setProjects(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get("/employees");
            setEmployees(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchServices = async () => {
        try {
            const res = await api.get("/services");
            setServices(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setSelectedItem(item);
            setFormData({
                project_id: item.project_id || "",
                assigned_employee_id: item.assigned_employee_id || "",
                title: item.title,
                description: item.description || "",
                status: item.status,
                priority: item.priority || "medium",
                due_date: item.due_date || "",
                estimated_hours: item.estimated_hours || 0,
            });
        } else {
            setSelectedItem(null);
            setFormData({
                project_id: projects[0]?.id || "",
                assigned_employee_id: "",
                title: "",
                description: "",
                status: "pending",
                priority: "medium",
                due_date: "",
                estimated_hours: 0,
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                project_id: formData.project_id ? parseInt(formData.project_id) : null,
                assigned_employee_id: formData.assigned_employee_id ? parseInt(formData.assigned_employee_id) : null,
                estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : 0,
            };
            if (selectedItem) {
                await api.put(`/work-items/${selectedItem.id}`, payload);
                showSuccess("Updated!", "Work item updated successfully.");
            } else {
                await api.post("/work-items", payload);
                showSuccess("Created!", "Work item created successfully.");
            }
            fetchWorkItems();
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            showError("Error", "Action failed.");
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm("Delete Work Item?", "Are you sure you want to delete this work item?");
        if (!confirmed) return;
        try {
            await api.delete(`/work-items/${id}`);
            fetchWorkItems();
            showSuccess("Deleted!", "Work item has been deleted.");
        } catch (err) {
            console.error(err);
            showError("Error", "Delete failed.");
        }
    };

    const handleOpenTaskDetails = (task) => {
        setViewingTaskId(task.id);
    };

    const getProjectName = (projId) => {
        const proj = projects.find((p) => p.id === projId);
        return proj ? proj.name : `Project #${projId}`;
    };

    const getProjectServiceAndName = (projId) => {
        const proj = projects.find((p) => p.id === projId);
        if (!proj) return { projectName: `Project #${projId}`, serviceName: "" };
        const srv = services.find((s) => s.id === proj.service_id);
        return {
            projectName: proj.name,
            serviceName: srv ? srv.service_name : ""
        };
    };

    const getEmployeeName = (empId) => {
        if (!empId) return "Unassigned";
        const emp = employees.find((e) => e.id === empId);
        return emp ? emp.name : `Employee #${empId}`;
    };

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startRange = (page - 1) * limit + 1;
    const endRange = Math.min(page * limit, total);

    if (viewingTaskId) {
        return (
            <TaskDetailView
                taskId={viewingTaskId}
                onBack={() => { setViewingTaskId(null); fetchWorkItems(); }}
                projects={projects}
                employees={employees}
                services={services}
            />
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isEmployeeRole ? "My Assigned Tasks" : "Work Items & Task Execution"}</h1>
                    <p className="page-subtitle">Track deliverables, manage work session timing, and record attempt histories</p>
                </div>
                {!isEmployeeRole && (
                    <button className="btn-primary" onClick={() => handleOpenModal()}>
                        + New Work Item
                    </button>
                )}
            </div>

            <div className="toolbar" style={{ flexDirection: "column", gap: "16px", alignItems: "stretch" }}>
                <div className="search-filter-group" style={{ display: "flex", gap: "16px", width: "100%", flexWrap: "wrap", alignItems: "center" }}>
                    <div className="search-box" style={{ flex: "1", minWidth: "250px" }}>
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search work items by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: "100%" }}
                        />
                    </div>
                    <div className="filter-tabs" style={{ flexShrink: 0 }}>
                        {["All", "Pending", "In_Progress", "Completed", "Overdue"].map((st) => (
                            <button
                                key={st}
                                className={`filter-btn ${statusFilter === st ? "active" : ""}`}
                                onClick={() => { setStatusFilter(st); setPage(1); }}
                            >
                                {st.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "12px",
                    background: "#ffffff",
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-sm)"
                }}>
                    <div>
                        <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Project</label>
                        <select
                            className="form-select"
                            value={selectedProjectId}
                            onChange={(e) => { setSelectedProjectId(e.target.value); setPage(1); }}
                            style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                        >
                            <option value="">All Projects</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {!isEmployeeRole && (
                        <div>
                            <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Employee</label>
                            <select
                                className="form-select"
                                value={selectedEmployeeId}
                                onChange={(e) => { setSelectedEmployeeId(e.target.value); setPage(1); }}
                                style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                            >
                                <option value="">All Employees</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Service</label>
                        <select
                            className="form-select"
                            value={selectedServiceId}
                            onChange={(e) => { setSelectedServiceId(e.target.value); setPage(1); }}
                            style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                        >
                            <option value="">All Services</option>
                            {services.map((srv) => (
                                <option key={srv.id} value={srv.id}>{srv.service_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Due From</label>
                        <input
                            type="date"
                            className="form-input"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Due To</label>
                        <input
                            type="date"
                            className="form-input"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            style={{ padding: "8px 12px", fontSize: "13px", height: "38px" }}
                        />
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                setSelectedProjectId("");
                                setSelectedEmployeeId("");
                                setSelectedServiceId("");
                                setStartDate("");
                                setEndDate("");
                                setSearchTerm("");
                                setStatusFilter("All");
                                setPage(1);
                            }}
                            style={{ width: "100%", padding: "9px 12px", fontSize: "13px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                        >
                            🧹 Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-wrapper">
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
                                <th>Timer</th>
                                {!isEmployeeRole && <th style={{ textAlign: "right" }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={isEmployeeRole ? "8" : "9"} style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                        Loading work items...
                                    </td>
                                </tr>
                            ) : workItems.length > 0 ? (
                                workItems.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td>
                                            <span className="project-id-tag">{(page - 1) * limit + idx + 1}</span>
                                        </td>
                                        <td>
                                            <strong>{item.title}</strong>
                                            {item.description && (
                                                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {item.description}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {item.project_id ? (
                                                (() => {
                                                    const { projectName, serviceName } = getProjectServiceAndName(item.project_id);
                                                    return (
                                                        <div>
                                                            <div style={{ fontWeight: "600" }}>{projectName}</div>
                                                            {serviceName && (
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
                                                                    {serviceName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            ) : "N/A"}
                                        </td>
                                        <td>{getEmployeeName(item.assigned_employee_id)}</td>
                                        <td>
                                            <span style={{ textTransform: "capitalize", fontWeight: "600", fontSize: "13px" }}>
                                                {item.priority}
                                            </span>
                                        </td>
                                        <td>{item.due_date || "N/A"}</td>
                                        <td>
                                            <span className={`status-badge ${item.status === "completed" ? "active" : "inactive"}`}>
                                                {item.status?.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: "12px" }} onClick={() => handleOpenTaskDetails(item)}>
                                                ⏱️ Sessions
                                            </button>
                                        </td>
                                        {!isEmployeeRole && (
                                            <td style={{ textAlign: "right" }}>
                                                <div className="card-actions" style={{ justifyContent: "flex-end" }}>
                                                    <button className="btn-icon" onClick={() => handleOpenModal(item)}>✏️</button>
                                                    <button className="btn-icon delete" onClick={() => handleDelete(item.id)}>🗑️</button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isEmployeeRole ? "8" : "9"} style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                        No work items found.
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
                            Showing <strong>{total > 0 ? startRange : 0}</strong> to <strong>{endRange}</strong> of <strong>{total}</strong> work items
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



            {/* Work Item Admin Form Modal */}
            {isModalOpen && (
                <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedItem ? "Edit Work Item" : "Create Work Item"}</h2>
                            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Project</label>
                                    <select
                                        className="form-select"
                                        value={formData.project_id}
                                        onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Project</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Title</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
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

                                <div className="form-group">
                                    <label className="form-label">Assigned Employee</label>
                                    <select
                                        className="form-select"
                                        value={formData.assigned_employee_id}
                                        onChange={(e) => setFormData({ ...formData, assigned_employee_id: e.target.value })}
                                    >
                                        <option value="">Unassigned</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select
                                            className="form-select"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Estimated Hours</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            className="form-input"
                                            value={formData.estimated_hours}
                                            onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Save Work Item</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkItemList;
