import { useState, useEffect } from "react";
import api from "../../services/api";

function Navbar({ user, onLogout, setActiveTab }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/notifications");
            setNotifications(res.data.data || []);
            setUnreadCount(res.data.unread_count || 0);
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.patch("/notifications/read-all");
            fetchNotifications();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <header className="app-navbar">
            <div className="navbar-search">
                <span className="search-symbol">🔍</span>
                <input type="text" placeholder="Search work items, projects, clients..." />
            </div>

            <div className="navbar-right">
                {/* Notification Bell */}
                <div className="notif-wrapper">
                    <button
                        className="notif-bell-btn"
                        onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    >
                        🔔
                        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                    </button>

                    {showNotifDropdown && (
                        <div className="notif-dropdown">
                            <div className="notif-header">
                                <strong>Notifications</strong>
                                <button className="btn-link" onClick={handleMarkAllRead}>
                                    Mark all read
                                </button>
                            </div>
                            <div className="notif-list">
                                {notifications.length > 0 ? (
                                    notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`notif-item ${n.is_read ? "read" : "unread"}`}
                                        >
                                            <p className="notif-msg">{n.message}</p>
                                            <span className="notif-time">
                                                {new Date(n.created_at).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="notif-empty">No notifications yet</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Menu */}
                <div className="user-profile-menu">
                    <button className="user-avatar-btn" onClick={() => setActiveTab("profile")}>
                        <div className="user-avatar">{user?.name ? user.name[0].toUpperCase() : "U"}</div>
                        <span className="user-name">{user?.name || "Administrator"}</span>
                    </button>
                    {onLogout && (
                        <button className="btn-secondary" onClick={onLogout}>
                            Logout
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Navbar;
