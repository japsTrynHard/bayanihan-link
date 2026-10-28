import React from "react";
import { Link } from "react-router-dom";
import { Bell, AlertTriangle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { getNotificationSummary } from "../utils/notificationAutomation";
import "../styles/components/NotificationBell.css";

function NotificationBell({ mode = "resident" }) {
  const { user } = useAuth();
  const { getVisibleNotifications } = useApp();
  const notifications = getVisibleNotifications(user);
  const summary = getNotificationSummary(notifications);
  const unread = summary.unread || 0;
  const urgent = summary.urgent || 0;
  const to = user?.role === "barangay_admin" || mode === "admin" ? "/admin/notifications" : "/notifications";
  const label = unread
    ? `${unread} unread notification${unread === 1 ? "" : "s"}`
    : "Open notifications";

  return (
    <Link className={`top-notification-bell top-notification-bell--${mode}`} to={to} aria-label={label} title={label}>
      <span className="top-notification-bell__icon">
        {urgent ? <AlertTriangle size={18} /> : <Bell size={18} />}
      </span>
      <span className="top-notification-bell__text">Notifications</span>
      {unread ? <span className="top-notification-bell__count">{unread > 99 ? "99+" : unread}</span> : null}
      {urgent ? <span className="top-notification-bell__urgent">Urgent</span> : null}
    </Link>
  );
}

export default NotificationBell;
