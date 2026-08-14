import { useState, useEffect } from "react";
import api from "./services/api";
import Sidebar from "./components/Layout/Sidebar";
import Navbar from "./components/Layout/Navbar";
import Dashboard from "./pages/Dashboard/Dashboard";
import ClientList from "./pages/Clients/ClientList";
import EmployeeList from "./pages/Employees/EmployeeList";
import ProjectList from "./pages/Projects/ProjectList";
import WorkItemList from "./pages/WorkItems/WorkItemList";
import MasterManagement from "./pages/Masters/MasterManagement";
import Reports from "./pages/Reports/Reports";
import ProfilePage from "./pages/Profile/ProfilePage";
import SettingsPage from "./pages/Settings/SettingsPage";
import ForcePasswordModal from "./components/Auth/ForcePasswordModal";
import LoginPage from "./pages/Auth/LoginPage";

function App() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token) {
            fetchCurrentUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchCurrentUser = async () => {
        setLoading(true);
        try {
            const res = await api.get("/auth/me");
            setUser(res.data);
        } catch (err) {
            console.error("Auth check failed:", err);
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            const refreshToken = localStorage.getItem("refresh_token");
            if (refreshToken) {
                await api.post("/auth/logout", { refresh_token: refreshToken });
            }
        } catch (err) {
            console.error("Logout api error:", err);
        } finally {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            setUser(null);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b" }}>
                <div>Loading ProjectPulse...</div>
            </div>
        );
    }

    const token = localStorage.getItem("access_token");
    if (!token || !user) {
        return <LoginPage onLoginSuccess={fetchCurrentUser} />;
    }

    const renderActiveView = () => {
        switch (activeTab) {
            case "dashboard":
                return <Dashboard currentUser={user} />;
            case "clients":
                return <ClientList />;
            case "employees":
                return <EmployeeList />;
            case "projects":
                return <ProjectList />;
            case "work-items":
                return <WorkItemList currentUser={user} />;
            case "masters":
                return <MasterManagement />;
            case "reports":
                return <Reports />;
            case "profile":
                return <ProfilePage user={user} />;
            case "settings":
                return <SettingsPage />;
            default:
                return <Dashboard currentUser={user} />;
        }
    };

    return (
        <div className="app-container">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
            <div className="app-main-layout">
                <Navbar user={user} onLogout={handleLogout} setActiveTab={setActiveTab} />
                <main className="app-content">{renderActiveView()}</main>
            </div>
            <ForcePasswordModal user={user} onPasswordChanged={fetchCurrentUser} />
        </div>
    );
}

export default App;