import { useState, useEffect } from "react";
import api from "../../services/api";
import { showSuccess, showError } from "../../utils/swal";

function SettingsPage() {
    const [settings, setSettings] = useState({
        company_name: "ProjectPulse Inc.",
        theme: "light",
        email_notifications_enabled: true,
        in_app_notifications_enabled: true,
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get("/settings");
            if (res.data) setSettings(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await api.put("/settings", settings);
            showSuccess("Success", "Settings updated successfully");
        } catch (err) {
            console.error(err);
            showError("Error", "Failed to update settings.");
        }
    };

    return (
        <div>
            <h1 className="page-title">Application Settings</h1>
            <p className="page-subtitle">Configure organization details, preferences, and notification toggles</p>

            <div className="project-card" style={{ maxWidth: "600px", marginTop: "24px" }}>
                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input
                            className="form-input"
                            value={settings.company_name}
                            onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={settings.email_notifications_enabled}
                                onChange={(e) => setSettings({ ...settings, email_notifications_enabled: e.target.checked })}
                            />
                            Email Notifications Enabled
                        </label>
                    </div>

                    <div className="form-group">
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={settings.in_app_notifications_enabled}
                                onChange={(e) => setSettings({ ...settings, in_app_notifications_enabled: e.target.checked })}
                            />
                            In-App Notifications Enabled
                        </label>
                    </div>

                    <button type="submit" className="btn-primary">Save Settings</button>
                </form>
            </div>
        </div>
    );
}

export default SettingsPage;
