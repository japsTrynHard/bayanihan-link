import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Briefcase,
  CalendarDays,
  MapPin,
  AlertCircle,
  MessageSquare,
  Bell,
  ClipboardList,
  Megaphone,
  User,
  Settings,
  Menu,
  X,
} from "lucide-react";
import "../styles/components/Sidebar.css";

function Sidebar() {
  // Controls the sidebar visibility on smaller screens.
  // useState: Controls kung bukas o sarado ang collapsible sidebar.
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/jobs", label: "Jobs", icon: Briefcase },
    { path: "/lost-found", label: "Lost & Found", icon: MapPin },
    { path: "/appointment-request", label: "Appointments", icon: CalendarDays },
    { path: "/emergency", label: "Emergency", icon: AlertCircle },
    { path: "/my-posts", label: "My Posts", icon: ClipboardList },
    { path: "/chat", label: "Messages", icon: MessageSquare },
    { path: "/notifications", label: "Notifications", icon: Bell },
    { path: "/announcements", label: "Announcements", icon: Megaphone },
    { path: "/profile", label: "Profile", icon: User },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive(item.path) ? "active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}
    </>
  );
}

export default Sidebar;
