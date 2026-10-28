import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Bell, MessageSquare } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import Button from "./Button";
import Avatar from "./Avatar";
import logoIcon from "../styles/assets/bayanihan-logo-icon.png";
import "../styles/components/Header.css";

function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { getUnreadCount, getUnreadChats } = useApp();
  // useState: Controls kung bukas o sarado ang mobile/header menu.
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const isAdmin = user?.role === "barangay_admin";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const baseNav = isAuthenticated
    ? isAdmin
      ? [
          { to: "/admin/dashboard", label: "Admin Dashboard" },
          { to: "/admin/emergencies", label: "Emergencies" },
          { to: "/admin/appointments", label: "Appointments" },
          { to: "/admin/announcements", label: "Announcements" },
        ]
      : [
          { to: "/", label: "Home" },
          { to: "/dashboard", label: "Dashboard" },
          { to: "/jobs", label: "Jobs" },
          { to: "/lost-found", label: "Lost & Found" },
          { to: "/appointment-request", label: "Appointments" },
          { to: "/emergency", label: "Emergency" },
        ]
    : [
        { to: "/", label: "Home" },
        { to: "/login", label: "Login" },
        { to: "/register", label: "Register" },
      ];

  return (
    <header className="header">
      <div className="header-container">
        <Link to={isAdmin ? "/admin/dashboard" : "/"} className="header-logo">
          <img src={logoIcon} alt="Bayanihan Link" className="header-logo-img" />
          <span className="logo-text">BAYANIHAN <span>LINK</span></span>
        </Link>

        <nav className={`header-nav ${isMenuOpen ? "open" : ""}`}>
          {baseNav.map((item) => (
            <Link key={item.to} to={item.to} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-right">
          {isAuthenticated ? (
            <div className="header-auth">
              {!isAdmin && (
                <>
                  <Link to="/notifications" className="header-icon-btn">
                    <Bell size={20} />
                    {getUnreadCount(user) > 0 && (
                      <span className="badge-count">{getUnreadCount(user)}</span>
                    )}
                  </Link>

                  <Link to="/chat" className="header-icon-btn">
                    <MessageSquare size={20} />
                    {getUnreadChats(user) > 0 && (
                      <span className="badge-count">{getUnreadChats(user)}</span>
                    )}
                  </Link>
                </>
              )}

              <div className="header-user">
                <Avatar initials={user?.avatar || "U"} src={user?.profilePicture} alt={user?.name || "User"} size="sm" />
                <div className="user-menu">
                  <Link
                    to={isAdmin ? "/admin/settings" : "/settings"}
                    className="menu-item"
                  >
                    Settings
                  </Link>
                  {!isAdmin && (
                    <Link to="/profile" className="menu-item">
                      Profile
                    </Link>
                  )}
                  <button onClick={handleLogout} className="menu-item logout-btn">
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="header-buttons">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
}

export default Header;
