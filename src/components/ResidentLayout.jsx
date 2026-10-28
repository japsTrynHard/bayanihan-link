import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Briefcase,
  MapPin,
  CalendarDays,
  AlertCircle,
  MessageSquare,
  Bell,
  ClipboardList,
  Megaphone,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Shield as Sparkles,
  Check as BadgeCheck,
  Briefcase as Layers3,
  ChevronDown,
} from "lucide-react";
import Avatar from "./Avatar";
import NotificationBell from "./NotificationBell";
import AccountStatusNotice from "./AccountStatusNotice";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { getFirstName } from "../utils/userDisplay";
import { USER_STATUS } from "../utils/storage";
import logoIcon from "../styles/assets/bayanihan-logo-icon.png";
import "../styles/components/LayoutShell.css";

const navGroups = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: Home }],
  },
  {
    label: "Community",
    items: [
      { to: "/jobs", label: "Jobs", icon: Briefcase },
      { to: "/lost-found", label: "Lost & Found", icon: MapPin },
      { to: "/appointment-request", label: "Appointments", icon: CalendarDays },
      { to: "/emergency", label: "Emergency", icon: AlertCircle },
      { to: "/my-posts", label: "My Posts", icon: ClipboardList },
      { to: "/chat", label: "Messages", icon: MessageSquare },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/profile", label: "Profile", icon: User },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function ResidentLayout({ children }) {
  // useState: Controls kung bukas o sarado ang resident sidebar sa mobile/small screens.
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { getUnreadCount, getUnreadChats, allPosts, appointments } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroup, setOpenGroup] = useState(() => navGroups.find((group) => group.items.some((item) => item.to === window.location.pathname))?.label || "Overview");

  const displayFirstName = getFirstName(user, "Resident");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const countMap = {
    "/chat": getUnreadChats(user),
    "/notifications": getUnreadCount(user),
  };


  useEffect(() => {
    const activeGroup = navGroups.find((group) => group.items.some((item) => item.to === location.pathname));
    if (activeGroup) setOpenGroup(activeGroup.label);
  }, [location.pathname]);

  const getGroupCount = (group) => group.items.reduce((sum, item) => sum + Number(countMap[item.to] || 0), 0);

  const residentMetrics = useMemo(
    () => ({
      posts: allPosts.filter((post) => post.author?.id === user?.id || post.author?.uid === user?.uid || post.author?.email === user?.email).length,
      appointments: appointments.filter((item) => item.userId === user?.id && item.status === "Pending").length,
      messages: getUnreadChats(user),
    }),
    [allPosts, appointments, getUnreadChats, user],
  );

  const isSuspended = user?.status === USER_STATUS.SUSPENDED;
  const isWarned = user?.status === USER_STATUS.WARNED;
  const accountStatusLabel = isSuspended
    ? "Suspended Account"
    : isWarned
      ? "Warned Account"
      : "Verified Account";

  return (
    <div className="dashboard-layout resident-layout-shell">
      <button className="dashboard-mobile-toggle" onClick={() => setIsOpen(true)}>
        <Menu size={20} />
        <span>Menu</span>
      </button>

      <aside className={`dashboard-sidebar resident-sidebar ${isOpen ? "open" : ""}`}>
        <div className="dashboard-sidebar__top">
          <Link to="/dashboard" className="dashboard-brand" onClick={() => setIsOpen(false)}>
            <img src={logoIcon} alt="Bayanihan Link" className="brand-logo-img dashboard-brand__logo" />
            <div>
              <strong>BAYANIHAN LINK</strong>
              <small>Resident Portal</small>
            </div>
          </Link>

          <button className="dashboard-close-btn" onClick={() => setIsOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="dashboard-user-card resident-user-card">
          <Avatar initials={user?.avatar || "U"} src={user?.profilePicture} alt={user?.name || "Resident"} size="lg" />
          <div>
            <strong>{displayFirstName}</strong>
            <small>{user?.barangay || "San Miguel"}</small>
          </div>
        </div>

        <div className="dashboard-sidebar-badge">Community access • Resident features</div>

        <div className="resident-command-card">
          <div className="resident-command-card__row">
            <span className="resident-command-card__label"><BadgeCheck size={14} /> Resident status</span>
            <strong>{accountStatusLabel}</strong>
          </div>
          <div className="resident-command-card__row">
            <span className="resident-command-card__label"><Layers3 size={14} /> My posts</span>
            <strong>{residentMetrics.posts}</strong>
          </div>
          <div className="resident-command-card__row">
            <span className="resident-command-card__label"><Sparkles size={14} /> Pending requests</span>
            <strong>{residentMetrics.appointments}</strong>
          </div>
        </div>

        <div className="dashboard-nav-accordion" aria-label="Resident sidebar navigation">
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
                          className={`dashboard-nav__link resident-nav-link ${isActive ? "active" : ""}`}
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="dashboard-nav__label">
                            <Icon size={18} />
                            {item.label}
                          </span>
                          {countMap[item.to] ? <span className="dashboard-nav__count">{countMap[item.to]}</span> : null}
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
          <button className="dashboard-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {isOpen ? <div className="dashboard-overlay" onClick={() => setIsOpen(false)} /> : null}

      <section className="dashboard-content">
        <div className="dashboard-content__topbar">
          <NotificationBell mode="resident" />
        </div>
        <AccountStatusNotice user={user} />
        {children}
      </section>
    </div>
  );
}

export default ResidentLayout;
