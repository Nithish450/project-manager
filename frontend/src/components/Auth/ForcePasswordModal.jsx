import { useState } from "react";
import api from "../../services/api";
import { showSuccess, showError, showWarning } from "../../utils/swal";

function ForcePasswordModal({ user, onPasswordChanged }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!user || (!user.is_first_login && !user.must_change_password)) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showWarning("Mismatch", "New password and confirm password do not match.");
            return;
        }
        if (newPassword.length < 6) {
            showWarning("Password Too Short", "Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            await api.post("/auth/change-password", {
                current_password: currentPassword,
                new_password: newPassword,
            });
            showSuccess("Password Updated!", "Welcome to ProjectPulse.");
            if (onPasswordChanged) onPasswordChanged();
        } catch (err) {
            console.error(err);
            const detail = err.response?.data?.detail;
            showError("Update Failed", typeof detail === "string" ? detail : "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop" style={{ background: "rgba(15, 23, 42, 0.85)", zIndex: 9999 }}>
            <div className="modal-content" style={{ maxWidth: "440px", border: "2px solid var(--brand-primary)" }}>
                <div className="modal-header">
                    <h2>🔒 Mandatory Password Update</h2>
                </div>
                <div className="modal-body">
                    <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "16px" }}>
                        Hello <strong>{user.name}</strong>, this is your first login with temporary credentials.
                        Please set a new permanent password to secure your account.
                    </p>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Current / Temporary Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showCurrent ? "text" : "password"}
                                    className="form-input"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    style={{ paddingRight: "40px" }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    style={{
                                        position: "absolute",
                                        right: "10px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "16px"
                                    }}
                                >
                                    {showCurrent ? "🙈" : "👁️"}
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showNew ? "text" : "password"}
                                    className="form-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{ paddingRight: "40px" }}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    style={{
                                        position: "absolute",
                                        right: "10px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "16px"
                                    }}
                                >
                                    {showNew ? "🙈" : "👁️"}
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <input
                                type={showNew ? "text" : "password"}
                                className="form-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="form-actions" style={{ marginTop: "20px" }}>
                            <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
                                {loading ? "Updating..." : "Update Password & Continue"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ForcePasswordModal;
