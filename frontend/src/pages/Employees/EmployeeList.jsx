import { useState, useEffect } from "react";
import api from "../../services/api";
import { showSuccess, showError, showConfirm } from "../../utils/swal";

function EmployeeList() {
    const [employees, setEmployees] = useState([]);
    const [departmentsMaster, setDepartmentsMaster] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [formData, setFormData] = useState({
        employee_code: "",
        name: "",
        email: "",
        phone: "",
        designation: "Software Engineer",
        department: "",
        status: "active",
    });

    const defaultDeptName = departmentsMaster.length > 0
        ? (typeof departmentsMaster[0] === "object" ? departmentsMaster[0].name : departmentsMaster[0])
        : "Engineering";

    // Fetch employees on page, limit change
    useEffect(() => {
        fetchEmployees();
    }, [page, limit]);

    // Debounce search fetching and reset to page 1
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) {
                fetchEmployees();
            } else {
                setPage(1); // will trigger the page change useEffect
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await api.get("/employees", {
                params: {
                    page,
                    limit,
                    search: searchTerm || undefined,
                }
            });
            setEmployees(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error("Failed to fetch employees:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get("/departments");
            setDepartmentsMaster(res.data.data || []);
        } catch (err) {
            console.error("Failed to fetch departments:", err);
        }
    };

    const handleOpenModal = (emp = null) => {
        if (emp) {
            setSelectedEmp(emp);
            setFormData({
                employee_code: emp.employee_code,
                name: emp.name,
                email: emp.email,
                phone: emp.phone || "",
                designation: emp.designation || "Software Engineer",
                department: emp.department || defaultDeptName,
                status: emp.status,
            });
        } else {
            setSelectedEmp(null);
            setFormData({
                employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                name: "",
                email: "",
                phone: "",
                designation: "Software Engineer",
                department: defaultDeptName,
                status: "active",
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedEmp) {
                await api.put(`/employees/${selectedEmp.id}`, formData);
                showSuccess("Updated!", "Employee updated successfully.");
            } else {
                await api.post("/employees", formData);
                showSuccess("Created!", "Employee created successfully. The credentials have been sent to their email.");
            }
            fetchEmployees();
            setIsModalOpen(false);
        } catch (err) {
            console.error("Employee Submit Error:", err);
            const detail = err.response?.data?.detail;
            const message = typeof detail === "string" ? detail : (detail ? JSON.stringify(detail) : "Failed to save employee.");
            showError("Error", message);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm("Delete Employee?", "Are you sure you want to delete this employee? This will also delete their login account.");
        if (!confirmed) return;
        try {
            await api.delete(`/employees/${id}`);
            fetchEmployees();
            showSuccess("Deleted!", "Employee has been deleted.");
        } catch (err) {
            console.error(err);
            showError("Error", "Delete failed.");
        }
    };

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startRange = (page - 1) * limit + 1;
    const endRange = Math.min(page * limit, total);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Employee Directory</h1>
                    <p className="page-subtitle">Manage employee profiles, department masters, and auto-generated user credentials</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    + Add Employee
                </button>
            </div>

            <div className="toolbar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by employee name, code, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container">
                <div className="table-wrapper">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                        Loading employees...
                                    </td>
                                </tr>
                            ) : employees.length > 0 ? (
                                employees.map((emp, idx) => (
                                    <tr key={emp.id}>
                                        <td>
                                            <span className="project-id-tag">{(page - 1) * limit + idx + 1}</span>
                                        </td>
                                        <td>
                                            <strong>{emp.employee_code}</strong>
                                        </td>
                                        <td>{emp.name}</td>
                                        <td>{emp.email}</td>
                                        <td>{emp.department}</td>
                                        <td>{emp.designation}</td>
                                        <td>
                                            <span className={`status-badge ${emp.status === "active" ? "active" : "inactive"}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <div className="card-actions" style={{ justifyContent: "flex-end" }}>
                                                <button className="btn-icon" onClick={() => handleOpenModal(emp)}>✏️</button>
                                                <button className="btn-icon delete" onClick={() => handleDelete(emp.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                        No employees found.
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
                            Showing <strong>{total > 0 ? startRange : 0}</strong> to <strong>{endRange}</strong> of <strong>{total}</strong> employees
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

            {/* Employee Modal */}
            {isModalOpen && (
                <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedEmp ? "Edit Employee" : "Add Employee"}</h2>
                            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Employee Code</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.employee_code}
                                        onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department (Master List)</label>
                                    <select
                                        className="form-select"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    >
                                        {departmentsMaster.map((dept, idx) => {
                                            const dName = typeof dept === "object" ? dept.name : dept;
                                            const dKey = typeof dept === "object" ? (dept.id || idx) : idx;
                                            return (
                                                <option key={dKey} value={dName}>
                                                    {dName}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Designation</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Save Employee</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmployeeList;
