import { useState, useEffect } from "react";
import api from "../services/api";
import { showSuccess, showError } from "../utils/swal";

function ProjectModal({ isOpen, onClose, selectedProject, refreshProjects }) {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "Active",
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (selectedProject) {
            setFormData({
                name: selectedProject.name || "",
                description: selectedProject.description || "",
                status: selectedProject.status || "Active",
            });
        } else {
            setFormData({
                name: "",
                description: "",
                status: "Active",
            });
        }
    }, [selectedProject, isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (selectedProject) {
                await api.put(`/projects/${selectedProject.id}`, formData);
                showSuccess("Updated!", "Project updated successfully.");
            } else {
                await api.post("/projects", formData);
                showSuccess("Created!", "Project created successfully.");
            }
            refreshProjects();
            onClose();
        } catch (error) {
            console.error("Error saving project:", error);
            showError("Error", "Failed to save project. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {selectedProject ? "Edit Project" : "Create New Project"}
                    </h2>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Project Name</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                placeholder="e.g. Mobile App Redesign"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                name="description"
                                className="form-textarea"
                                placeholder="Describe the scope, objectives, and tech stack..."
                                value={formData.description}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                name="status"
                                className="form-select"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={onClose}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? "Saving..." : selectedProject ? "Update Project" : "Create Project"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ProjectModal;
