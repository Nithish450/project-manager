import { useState, useEffect } from "react";
import api from "../../services/api";
import { showSuccess, showError, showConfirm } from "../../utils/swal";

function MasterManagement() {
    const [activeTab, setActiveTab] = useState("services");

    // Services state
    const [services, setServices] = useState([]);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [serviceFormData, setServiceFormData] = useState({ service_name: "", is_active: true });

    // Departments state
    const [departments, setDepartments] = useState([]);
    const [isDepModalOpen, setIsDepModalOpen] = useState(false);
    const [selectedDep, setSelectedDep] = useState(null);
    const [depFormData, setDepFormData] = useState({ name: "", description: "", is_active: true });

    useEffect(() => {
        fetchServices();
        fetchDepartments();
    }, []);

    const fetchServices = async () => {
        try {
            const res = await api.get("/services");
            setServices(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get("/departments");
            setDepartments(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    // Service handlers
    const handleOpenServiceModal = (srv = null) => {
        if (srv) {
            setSelectedService(srv);
            setServiceFormData({ service_name: srv.service_name, is_active: srv.is_active });
        } else {
            setSelectedService(null);
            setServiceFormData({ service_name: "", is_active: true });
        }
        setIsServiceModalOpen(true);
    };

    const handleServiceSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedService) {
                await api.put(`/services/${selectedService.id}`, serviceFormData);
                showSuccess("Updated!", "Service master updated successfully.");
            } else {
                await api.post("/services", serviceFormData);
                showSuccess("Created!", "Service master created successfully.");
            }
            fetchServices();
            setIsServiceModalOpen(false);
        } catch (err) {
            console.error(err);
            showError("Error", "Failed to save service master.");
        }
    };

    const handleServiceDelete = async (id) => {
        const confirmed = await showConfirm("Delete Service?", "Are you sure you want to delete this service master?");
        if (!confirmed) return;
        try {
            await api.delete(`/services/${id}`);
            fetchServices();
            showSuccess("Deleted!", "Service master has been deleted.");
        } catch (err) {
            console.error(err);
            showError("Error", "Delete failed.");
        }
    };

    // Department handlers
    const handleOpenDepModal = (dep = null) => {
        if (dep) {
            setSelectedDep(dep);
            setDepFormData({ name: dep.name, description: dep.description || "", is_active: dep.is_active });
        } else {
            setSelectedDep(null);
            setDepFormData({ name: "", description: "", is_active: true });
        }
        setIsDepModalOpen(true);
    };

    const handleDepSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedDep) {
                await api.put(`/departments/${selectedDep.id}`, depFormData);
                showSuccess("Updated!", "Department master updated successfully.");
            } else {
                await api.post("/departments", depFormData);
                showSuccess("Created!", "Department master created successfully.");
            }
            fetchDepartments();
            setIsDepModalOpen(false);
        } catch (err) {
            console.error(err);
            showError("Error", "Failed to save department master.");
        }
    };

    const handleDepDelete = async (id) => {
        const confirmed = await showConfirm("Delete Department?", "Are you sure you want to delete this department master?");
        if (!confirmed) return;
        try {
            await api.delete(`/departments/${id}`);
            fetchDepartments();
            showSuccess("Deleted!", "Department master has been deleted.");
        } catch (err) {
            console.error(err);
            showError("Error", "Delete failed.");
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Master Data Management</h1>
                    <p className="page-subtitle">Configure organization-wide Master Services and Master Departments</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => (activeTab === "services" ? handleOpenServiceModal() : handleOpenDepModal())}
                >
                    + Add New {activeTab === "services" ? "Service Master" : "Department Master"}
                </button>
            </div>

            <div className="toolbar">
                <div className="filter-tabs">
                    <button
                        className={`filter-btn ${activeTab === "services" ? "active" : ""}`}
                        onClick={() => setActiveTab("services")}
                    >
                        Services Master ({services.length})
                    </button>
                    <button
                        className={`filter-btn ${activeTab === "departments" ? "active" : ""}`}
                        onClick={() => setActiveTab("departments")}
                    >
                        Departments Master ({departments.length})
                    </button>
                </div>
            </div>

            {/* Services Master View */}
            {activeTab === "services" && (
                <div className="projects-grid">
                    {services.map((srv) => (
                        <div key={srv.id} className="project-card">
                            <div>
                                <div className="project-header">
                                    <h3 className="project-name">{srv.service_name}</h3>
                                    <span className={`status-badge ${srv.is_active ? "active" : "inactive"}`}>
                                        {srv.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                            </div>
                            <div className="project-footer">
                                <span className="project-id-tag">Service ID: #{srv.id}</span>
                                <div className="card-actions">
                                    <button className="btn-icon" onClick={() => handleOpenServiceModal(srv)}>✏️</button>
                                    <button className="btn-icon delete" onClick={() => handleServiceDelete(srv.id)}>🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Departments Master View */}
            {activeTab === "departments" && (
                <div className="projects-grid">
                    {departments.map((dep) => (
                        <div key={dep.id} className="project-card">
                            <div>
                                <div className="project-header">
                                    <h3 className="project-name">{dep.name}</h3>
                                    <span className={`status-badge ${dep.is_active ? "active" : "inactive"}`}>
                                        {dep.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <p className="project-desc">{dep.description || "Master Department Record"}</p>
                            </div>
                            <div className="project-footer">
                                <span className="project-id-tag">Dept ID: #{dep.id}</span>
                                <div className="card-actions">
                                    <button className="btn-icon" onClick={() => handleOpenDepModal(dep)}>✏️</button>
                                    <button className="btn-icon delete" onClick={() => handleDepDelete(dep.id)}>🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Service Modal */}
            {isServiceModalOpen && (
                <div className="modal-backdrop" onClick={() => setIsServiceModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedService ? "Edit Service Master" : "Add Service Master"}</h2>
                            <button className="modal-close-btn" onClick={() => setIsServiceModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleServiceSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Service Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={serviceFormData.service_name}
                                        onChange={(e) => setServiceFormData({ ...serviceFormData, service_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={serviceFormData.is_active}
                                            onChange={(e) => setServiceFormData({ ...serviceFormData, is_active: e.target.checked })}
                                        />
                                        Is Active
                                    </label>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setIsServiceModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Save Service</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Department Modal */}
            {isDepModalOpen && (
                <div className="modal-backdrop" onClick={() => setIsDepModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedDep ? "Edit Department Master" : "Add Department Master"}</h2>
                            <button className="modal-close-btn" onClick={() => setIsDepModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleDepSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Department Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={depFormData.name}
                                        onChange={(e) => setDepFormData({ ...depFormData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-textarea"
                                        value={depFormData.description}
                                        onChange={(e) => setDepFormData({ ...depFormData, description: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={depFormData.is_active}
                                            onChange={(e) => setDepFormData({ ...depFormData, is_active: e.target.checked })}
                                        />
                                        Is Active
                                    </label>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setIsDepModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Save Department</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MasterManagement;
