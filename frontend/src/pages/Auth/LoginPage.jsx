import { useState } from "react";
import api from "../../services/api";

function LoginPage({ onLoginSuccess }) {
    const [mode, setMode] = useState("login"); // "login" | "forgot" | "reset"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Reset password state
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const res = await api.post("/auth/login", {
                email,
                password,
            });

            const { access_token, refresh_token } = res.data;
            if (access_token) {
                localStorage.setItem("access_token", access_token);
                if (refresh_token) {
                    localStorage.setItem("refresh_token", refresh_token);
                }
                if (onLoginSuccess) {
                    onLoginSuccess();
                }
            }
        } catch (err) {
            console.error("Login error:", err);
            const detail = err.response?.data?.detail;
            setErrorMsg(typeof detail === "string" ? detail : "Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const res = await api.post("/auth/forgot-password", { email });
            setSuccessMsg(res.data.message);
            if (res.data.reset_token) {
                setResetToken(res.data.reset_token);
            }
            setMode("reset");
        } catch (err) {
            console.error("Forgot password error:", err);
            const detail = err.response?.data?.detail;
            setErrorMsg(typeof detail === "string" ? detail : "Failed to generate reset code.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const res = await api.post("/auth/reset-password", {
                email,
                reset_token: resetToken,
                new_password: newPassword,
            });
            setSuccessMsg(res.data.message);
            setMode("login");
            setPassword("");
        } catch (err) {
            console.error("Reset password error:", err);
            const detail = err.response?.data?.detail;
            setErrorMsg(typeof detail === "string" ? detail : "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f1f5f9",
            padding: "20px"
        }}>
            <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
                border: "1px solid #e2e8f0",
                width: "100%",
                maxWidth: "420px",
                padding: "36px",
            }}>
                <div style={{ textAlign: "center", marginBottom: "28px" }}>
                    <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        margin: "0 auto 12px auto",
                    }}>
                        ⚡
                    </div>
                    <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>ProjectPulse</h1>
                    <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
                        {mode === "login" ? "Sign in to access your work portal" : mode === "forgot" ? "Reset your account password" : "Enter new password"}
                    </p>
                </div>

                {errorMsg && (
                    <div style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#dc2626",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        marginBottom: "18px"
                    }}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                {successMsg && (
                    <div style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        color: "#166534",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        marginBottom: "18px"
                    }}>
                        ✅ {successMsg}
                    </div>
                )}

                {/* LOGIN FORM */}
                {mode === "login" && (
                    <form onSubmit={handleLoginSubmit}>
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="admin@projectpulse.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <label className="form-label">Password</label>
                                <button
                                    type="button"
                                    onClick={() => { setMode("forgot"); setErrorMsg(""); setSuccessMsg(""); }}
                                    style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ paddingRight: "40px" }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
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
                                    title={showPassword ? "Hide Password" : "Show Password"}
                                >
                                    {showPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            style={{ width: "100%", padding: "12px", fontSize: "15px", fontWeight: "700", marginTop: "12px" }}
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign In to ProjectPulse"}
                        </button>
                    </form>
                )}

                {/* FORGOT PASSWORD FORM */}
                {mode === "forgot" && (
                    <form onSubmit={handleForgotSubmit}>
                        <div className="form-group" style={{ marginBottom: "20px" }}>
                            <label className="form-label">Registered Email Address</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: "700" }}
                            disabled={loading}
                        >
                            {loading ? "Sending..." : "Generate Reset Code"}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setMode("login"); setErrorMsg(""); setSuccessMsg(""); }}
                            style={{ width: "100%", background: "none", border: "none", color: "#64748b", marginTop: "14px", cursor: "pointer", fontSize: "13px" }}
                        >
                            ← Back to Login
                        </button>
                    </form>
                )}

                {/* RESET PASSWORD FORM */}
                {mode === "reset" && (
                    <form onSubmit={handleResetSubmit}>
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                            <label className="form-label">Reset Code</label>
                            <input
                                type="text"
                                className="form-input"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: "20px" }}>
                            <label className="form-label">New Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    className="form-input"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{ paddingRight: "40px" }}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
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
                                    {showNewPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: "700" }}
                            disabled={loading}
                        >
                            {loading ? "Resetting..." : "Set New Password & Login"}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setMode("login"); setErrorMsg(""); setSuccessMsg(""); }}
                            style={{ width: "100%", background: "none", border: "none", color: "#64748b", marginTop: "14px", cursor: "pointer", fontSize: "13px" }}
                        >
                            ← Back to Login
                        </button>
                    </form>
                )}

                <div style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
                    Default Admin Credentials: <br />
                    <strong>admin@projectpulse.com</strong> | Password: <strong>admin123</strong>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
