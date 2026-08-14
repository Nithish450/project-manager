function Sidebar({ activeTab, setActiveTab, user }) {
    const isEmployee = user?.role === "employee";

    const allNavItems = [
        { id: "dashboard", label: "Dashboard", icon: "📊" },
        { id: "clients", label: "Client Management", icon: "🏢", adminOnly: true },
        { id: "employees", label: "Employee Directory", icon: "👥", adminOnly: true },
        { id: "projects", label: "Project Management", icon: "📁" },
        { id: "work-items", label: isEmployee ? "My Tasks & Timer" : "Work Items & Tasks", icon: "✅" },
        { id: "masters", label: "Master Management", icon: "🛠️", adminOnly: true },
        { id: "reports", label: "Reports & Analytics", icon: "📈" },
        { id: "profile", label: "My Profile", icon: "👤" },
        { id: "settings", label: "Settings", icon: "⚙️", adminOnly: true },
    ];

    const visibleNavItems = allNavItems.filter((item) => !isEmployee || !item.adminOnly);

    return (
        <aside className="app-sidebar">
            <div className="sidebar-brand">
                <div className="brand-icon">⚡</div>
                <div>
                    <div className="brand-name">ProjectPulse</div>
                    <div className="brand-tag">{isEmployee ? "Employee Portal" : "Work Management"}</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {visibleNavItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                        onClick={() => setActiveTab(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;
