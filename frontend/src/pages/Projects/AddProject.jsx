import { useEffect, useState } from "react";
import api from "../../services/api";
import { showSuccess, showError } from "../../utils/swal";

function AddProject({ selectedProject, refreshProjects, clearSelection }) {

    const [project, setProject] = useState({
        name: "",
        description: "",
        status: "Active",
    });

    useEffect(() => {

        if (selectedProject) {

            setProject({
                name: selectedProject.name,
                description: selectedProject.description,
                status: selectedProject.status,
            });

        }

    }, [selectedProject]);

    const handleChange = (e) => {

        setProject({
            ...project,
            [e.target.name]: e.target.value,
        });

    };

    const saveProject = async (e) => {

        e.preventDefault();

        try {

            if (selectedProject) {

                await api.put(`/projects/${selectedProject.id}`, project);

                showSuccess("Updated!", "Project Updated Successfully");

                clearSelection();

            } else {

                await api.post("/projects", project);

                showSuccess("Created!", "Project Added Successfully");

            }

            setProject({
                name: "",
                description: "",
                status: "Active",
            });

            refreshProjects();

        } catch (error) {

            console.log(error);
            showError("Error", "Failed to save project.");

        }

    };

    return (
        <div>

            <h2>{selectedProject ? "Update Project" : "Add Project"}</h2>

            <form onSubmit={saveProject}>

                <div>
                    <label>Project Name</label><br />
                    <input
                        type="text"
                        name="name"
                        value={project.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <br />

                <div>
                    <label>Description</label><br />
                    <textarea
                        name="description"
                        value={project.description}
                        onChange={handleChange}
                        required
                    />
                </div>

                <br />

                <div>
                    <label>Status</label><br />
                    <select
                        name="status"
                        value={project.status}
                        onChange={handleChange}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                <br />

                <button type="submit">

                    {selectedProject ? "Update Project" : "Save Project"}

                </button>

            </form>

        </div>
    );
}

export default AddProject;