import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  FileText as FileCheck,
  Users,
  Briefcase,
  Search,
  Shield,
  Megaphone,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import Avatar from "./Avatar";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { getFirstName } from "../utils/userDisplay";
import logoIcon from "../styles/assets/bayanihan-logo-icon.png";
import "../styles/components/LayoutShell.css";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/analytics", label: "Activity Summary", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/emergencies", label: "Emergency Reports", icon: AlertTriangle },
      { to: "/admin/appointments", label: "Appointment Management", icon: FileCheck },
      { to: "/admin/users", label: "User Management", icon: Users },
    ],
  },
  {
    label: "Moderation",
    items: [
      { to: "/admin/jobs", label: "Job Monitoring", icon: Briefcase },
      { to: "/admin/lost-found", label: "Lost & Found Monitoring", icon: Search },
      { to: "/admin/reports", label: "Reports & Complaints", icon: Shield },
      { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

function AdminLayout({ title, subtitle, actions, children }) {
  // useState: Controls kung bukas o sarado ang admin sidebar sa mobile/small screens.
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { emergencies, appointments, reports, announcements, getUnreadCount } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = useState(() => navGroups.find((group) => group.items.some((item) => item.to === window.location.pathname))?.label || "Overview");

  const displayFirstName = getFirstName(user, "Admin");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const counts = useMemo(
    () => ({
      "/admin/analytics": emergencies.filter((item) => item.barangay === user?.barangay && !["Resolved", "False Report", "Removed"].includes(item.status)).length + reports.filter((item) => item.barangay === user?.barangay && ["Pending", "Under Review"].includes(item.status)).length,
      "/admin/emergencies": emergencies.filter((item) => item.barangay === user?.barangay && !["Resolved", "False Report", "Removed", "Cancelled"].includes(item.status)).length,
      "/admin/appointments": appointments.filter((item) => item.barangay === user?.barangay && item.status === "Pending").length,
      "/admin/reports": reports.filter((item) => item.barangay === user?.barangay && item.status === "Pending").length,
      "/admin/announcements": announcements.filter((item) => item.barangay === user?.barangay).length,
      "/admin/notifications": getUnreadCount(user),
    }),
    [announcements, appointments, emergencies, reports, getUnreadCount, user],
  );


  useEffect(() => {
    const activeGroup = navGroups.find((group) => group.items.some((item) => item.to === location.pathname));
    if (activeGroup) setOpenGroup(activeGroup.label);
  }, [location.pathname]);

  const getGroupCount = (group) => group.items.reduce((sum, item) => sum + Number(counts[item.to] || 0), 0);

  return (
    <div className="dashboard-layout dashboard-layout--admin official-admin-layout">
      <button className="dashboard-mobile-toggle" onClick={() => setIsOpen(true)}>
        <Menu size={20} />
        <span>Admin Menu</span>
      </button>

      <aside className={`dashboard-sidebar dashboard-sidebar--admin official-sidebar ${isOpen ? "open" : ""}`}>
        <div className="dashboard-sidebar__top">
          <Link to="/admin/dashboard" className="dashboard-brand" onClick={() => setIsOpen(false)}>
            <img src={logoIcon} alt="Bayanihan Link" className="brand-logo-img dashboard-brand__logo" />
            <div>
              <strong>BARANGAY OPS</strong>
              <small>Official Admin Portal</small>
            </div>
          </Link>

          <button className="dashboard-close-btn" onClick={() => setIsOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="dashboard-user-card admin-user-card">
          <Avatar initials={user?.avatar || "A"} src={user?.profilePicture} alt={user?.name || "Admin"} size="lg" />
          <div>
            <strong>{displayFirstName}</strong>
            <small>{user?.barangay || "San Miguel"}</small>
          </div>
        </div>

        <div className="admin-command-card">
          <div className="admin-command-card__row">
            <span className="admin-command-card__label"><Shield size={14} /> Assigned role</span>
            <strong>Barangay Official</strong>
          </div>
          <div className="admin-command-card__row">
            <span className="admin-command-card__label"><AlertTriangle size={14} /> Active emergencies</span>
            <strong>{counts["/admin/emergencies"]}</strong>
          </div>
          <div className="admin-command-card__row">
            <span className="admin-command-card__label"><FileCheck size={14} /> Pending requests</span>
            <strong>{counts["/admin/appointments"]}</strong>
          </div>
        </div>

        <div className="dashboard-nav-accordion" aria-label="Admin sidebar navigation">
          {navGroups.map((group) => {
            const isExpanded = openGroup === group.label;
            const groupCount = getGroupCount(group);
            return (
              <div key={group.label} className={`dashboard-nav-group ${isExpanded ? "expanded" : "collapsed"}`}>
                <button
                  type="button"
                  className="dashboard-nav-group__toggle"
                  onClick={() => setOpenGroup(isExpanded ? "" : group.label)}
                  aria-expanded={isExpanded}
                >
                  <span>{group.label}</span>
                  <span className="dashboard-nav-group__meta">
                    {groupCount ? <span className="dashboard-nav__count">{groupCount}</span> : null}
                    <ChevronDown size={16} />
                  </span>
                </button>
                {isExpanded ? (
                  <nav className="dashboard-nav">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.to;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`dashboard-nav__link admin-nav-link ${isActive ? "active" : ""}`}
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="dashboard-nav__label">
                            <Icon size={18} />
                            {item.label}
                          </span>
                          {counts[item.to] ? <span className="dashboard-nav__count">{counts[item.to]}</span> : null}
                        </Link>
                      );
                    })}
                  </nav>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="dashboard-sidebar__footer">
          <button className="dashboard-logout-btn admin-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {isOpen ? <div className="dashboard-overlay" onClick={() => setIsOpen(false)} /> : null}

      <section className="dashboard-content">
        <div className="dashboard-page-head admin-page-head">
          <div>
            <div className="admin-page-head__eyebrow">Barangay operations dashboard</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="dashboard-page-head__actions">
            <NotificationBell mode="admin" />
            {actions}
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

export default AdminLayout;
