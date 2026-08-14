import { useState, useEffect } from "react";
import api from "../../services/api";
import { showSuccess, showError, showConfirm } from "../../utils/swal";

function ClientList() {
    const [clients, setClients] = useState([]);
    const [servicesMaster, setServicesMaster] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [formData, setFormData] = useState({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        status: "active",
        service_ids: [],
    });

    // Fetch clients on page, limit change
    useEffect(() => {
        fetchClients();
    }, [page, limit]);

    // Debounce search fetching and reset to page 1
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) {
                fetchClients();
            } else {
                setPage(1); // will trigger the page change useEffect
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await api.get("/clients", {
                params: {
                    page,
                    limit,
                    search: searchTerm || undefined,
                }
            });
            setClients(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            const res = await api.get("/services");
            setServicesMaster(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenModal = (client = null) => {
        if (client) {
            setSelectedClient(client);
            setFormData({
                company_name: client.company_name,
                contact_person: client.contact_person,
                email: client.email,
                phone: client.phone,
                address: client.address || "",
                status: client.status,
                service_ids: (client.services || []).map((s) => s.id),
            });
        } else {
            setSelectedClient(null);
            setFormData({
                company_name: "",
                contact_person: "",
                email: "",
                phone: "",
                address: "",
                status: "active",
                service_ids: [],
            });
        }
        setIsModalOpen(true);
    };

    const handleServiceToggle = (serviceId) => {
        setFormData((prev) => {
            const currentIds = prev.service_ids || [];
            if (currentIds.includes(serviceId)) {
                return { ...prev, service_ids: currentIds.filter((id) => id !== serviceId) };
            } else {
                return { ...prev, service_ids: [...currentIds, serviceId] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedClient) {
                await api.put(`/clients/${selectedClient.id}`, formData);
                showSuccess("Updated!", "Client updated successfully.");
            } else {
                await api.post("/clients", formData);
                showSuccess("Created!", "Client created successfully.");
            }
            fetchClients();
            setIsModalOpen(false);
        } catch (err) {
            console.error("Client Submit Error:", err);
            const detail = err.response?.data?.detail;
            const message = typeof detail === "string" ? detail : (detail ? JSON.stringify(detail) : "Failed to save client.");
            showError("Error", message);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm("Delete Client?", "Are you sure you want to delete this client? This will delete all mapped services.");
        if (!confirmed) return;
        try {
            await api.delete(`/clients/${id}`);
            fetchClients();
            showSuccess("Deleted!", "Client has been deleted.");
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
                    <h1 className="page-title">Client Management</h1>
                    <p className="page-subtitle">Manage client profiles and master subscribed services</p>
                </div>
                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    + Add Client
                </button>
            </div>

            <div className="toolbar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search clients by company name or contact..."
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
                                <th>Company Name</th>
                                <th>Contact Person</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Subscribed Services</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                        Loading clients...
                                    </td>
                                </tr>
                            ) : clients.length > 0 ? (
                                clients.map((client, idx) => (
                                    <tr key={client.id}>
                                        <td>
                                            <span className="project-id-tag">{(page - 1) * limit + idx + 1}</span>
                                        </td>
                                        <td>
                                            <strong>{client.company_name}</strong>
                                        </td>
                                        <td>{client.contact_person}</td>
                                        <td>{client.email}</td>
                                        <td>{client.phone}</td>
                                        <td>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                                {(client.services && client.services.length > 0) ? (
                                                    client.services.map((s) => (
                                                        <span key={s.id} style={{ background: "#e0e7ff", color: "#4338ca", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "700" }}>
                                                            {s.service_name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${client.status === "active" ? "active" : "inactive"}`}>
                                                {client.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <div className="card-actions" style={{ justifyContent: "flex-end" }}>
                                                <button className="btn-icon" onClick={() => handleOpenModal(client)}>✏️</button>
                                                <button className="btn-icon delete" onClick={() => handleDelete(client.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: "center", py: 40, color: "var(--text-muted)" }}>
                                        No clients found.
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
                            Showing <strong>{total > 0 ? startRange : 0}</strong> to <strong>{endRange}</strong> of <strong>{total}</strong> clients
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

            {/* Client Modal */}
            {isModalOpen && (
                <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: "580px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedClient ? "Edit Client" : "Add Client"}</h2>
                            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Company Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.company_name}
                                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contact Person</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.contact_person}
                                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
                                        <label className="form-label">Phone</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Select Subscribed Services (Masters)</label>
                                    <div style={{ maxHeight: "160px", overflowY: "auto", background: "#f8fafc", border: "1px solid var(--border-color)", padding: "12px", borderRadius: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                        {servicesMaster.map((srv) => (
                                            <label key={srv.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={(formData.service_ids || []).includes(srv.id)}
                                                    onChange={() => handleServiceToggle(srv.id)}
                                                />
                                                {srv.service_name}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary">Save Client</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClientList;
