import { useState, useEffect } from "react";
import api from "../../services/api";
import { showSuccess, showError } from "../../utils/swal";

function ProfilePage({ user }) {
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await api.put("/profile", { name, email });
            showSuccess("Success", "Profile updated successfully");
        } catch (err) {
            console.error(err);
            showError("Error", "Failed to update profile.");
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            await api.post("/profile/change-password", { current_password: currentPassword, new_password: newPassword });
            showSuccess("Success", "Password changed successfully");
            setCurrentPassword("");
            setNewPassword("");
        } catch (err) {
            console.error(err);
            showError("Error", "Failed to change password.");
        }
    };

    return (
        <div>
            <h1 className="page-title">My Account Profile</h1>
            <p className="page-subtitle">Update personal credentials and account details</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
                <div className="project-card">
                    <h3>Profile Information</h3>
                    <form onSubmit={handleUpdateProfile} style={{ marginTop: "16px" }}>
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn-primary">Update Profile</button>
                    </form>
                </div>

                <div className="project-card">
                    <h3>Change Password</h3>
                    <form onSubmit={handleChangePassword} style={{ marginTop: "16px" }}>
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input className="form-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn-primary">Change Password</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
