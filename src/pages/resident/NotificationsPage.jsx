import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  Briefcase,
  CalendarDays,
  Check,
  ExternalLink,
  FileText,
  Megaphone,
  MessageSquare,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import ResidentLayout from "../../components/ResidentLayout";
import Card, { CardContent } from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import {
  getNotificationBadgeVariant,
  getNotificationPriorityLabel,
  getNotificationSummary,
  sortNotificationsSmart,
} from "../../utils/notificationAutomation";
import "../../styles/pages/Notifications.css";

const typeOptions = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "emergency", label: "Emergency" },
  { value: "appointment", label: "Appointments" },
  { value: "chat", label: "Messages" },
  { value: "announcement", label: "Announcements" },
  { value: "post", label: "Posts" },
  { value: "moderation", label: "Moderation" },
  { value: "report", label: "Reports" },
];

const iconMap = {
  emergency: AlertCircle,
  appointment: CalendarDays,
  chat: MessageSquare,
  announcement: Megaphone,
  post: Briefcase,
  moderation: Shield,
  report: FileText,
  system: Bell,
};

function Notifications() {
  const navigate = useNavigate();
  const {
    getVisibleNotifications,
    markNotificationRead,
    markAllVisibleNotificationsRead,
    deleteNotification,
    deleteNotificationsByIds,
    getNotificationPath,
    startChatFromNotification,
  } = useApp();
  const { user } = useAuth();
  const [activeType, setActiveType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState("");

  const visibleNotifications = useMemo(
    () => sortNotificationsSmart(getVisibleNotifications(user)),
    [getVisibleNotifications, user],
  );

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return visibleNotifications.filter((notification) => {
      const matchesType =
        activeType === "all" ||
        (activeType === "unread" ? !notification.read : notification.type === activeType);
      const searchable = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
      return matchesType && (!query || searchable.includes(query));
    });
  }, [activeType, searchQuery, visibleNotifications]);

  const notificationSummary = getNotificationSummary(visibleNotifications);
  const unreadCount = notificationSummary.unread;
  const highPriorityCount = notificationSummary.urgent;

  const showResult = (count, label) => {
    setNotice(count ? `${count} notification${count === 1 ? "" : "s"} deleted.` : `No ${label} notifications to delete.`);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const handleDeleteNotification = (notificationId) => {
    if (!window.confirm("Delete this notification from your notification center?")) return;
    const removed = deleteNotification(notificationId, user);
    showResult(removed, "selected");
  };

  const handleDeleteRead = () => {
    const readIds = filteredNotifications.filter((notification) => notification.read).map((notification) => notification.id);
    if (!readIds.length) return showResult(0, "read");
    if (!window.confirm(`Delete ${readIds.length} read notification${readIds.length === 1 ? "" : "s"} from this view?`)) return;
    showResult(deleteNotificationsByIds(readIds, user), "read");
  };

  const handleDeleteFiltered = () => {
    const ids = filteredNotifications.map((notification) => notification.id).filter(Boolean);
    if (!ids.length) return showResult(0, "shown");
    if (!window.confirm(`Delete ${ids.length} notification${ids.length === 1 ? "" : "s"} currently shown?`)) return;
    showResult(deleteNotificationsByIds(ids, user), "shown");
  };

  const handleDeleteAllActive = () => {
    const ids = visibleNotifications.map((notification) => notification.id).filter(Boolean);
    if (!ids.length) return showResult(0, "total")
    if (!window.confirm(`Delete all ${ids.length} notification${ids.length === 1 ? "" : "s"} from your notification center?`)) return;
    showResult(deleteNotificationsByIds(ids, user), "total");
  };

  const handleOpenNotification = (notification) => {
    markNotificationRead(notification.id, user);
    navigate(getNotificationPath(notification, user));
  };

  const handleChatNow = async (notification) => {
    markNotificationRead(notification.id, user);
    const chat = await startChatFromNotification?.(user, notification)?.catch((error) => { window.alert(error.message || "Unable to open chat. Please try again."); return null; });
    if (chat?.id) {
      navigate(`/chat?chat=${chat.id}`);
    } else {
      setNotice("Chat is not available for this notification yet. Open the related case first.");
      window.setTimeout(() => setNotice(""), 3500);
    }
  };

  return (
    <ResidentLayout>
      <div className="notifications-page notifications-page--fixed">
        <section className="notifications-hero">
          <div>
            <span className="notif-eyebrow"><Bell size={16} /> Resident notification center</span>
            <h1>Notifications</h1>
            <p>Track updates about posts, appointments, chat messages, emergency alerts, announcements, and moderation notices.</p>
          </div>
          <div className="notif-hero-actions">
            <Badge variant={unreadCount ? "danger" : "secondary"}>{unreadCount} unread</Badge>
            {highPriorityCount ? <Badge variant="danger">{highPriorityCount} urgent</Badge> : null}
            {unreadCount > 0 ? (
              <Button variant="secondary" onClick={() => markAllVisibleNotificationsRead(user)}>
                <Check size={16} /> Mark all read
              </Button>
            ) : null}
            <Button variant="outline" onClick={handleDeleteRead}>
              <Trash2 size={16} /> Delete read
            </Button>
            <Button variant="outline" onClick={handleDeleteFiltered}>
              <Trash2 size={16} /> Delete filtered
            </Button>
            <Button variant="danger" onClick={handleDeleteAllActive}>
              <Trash2 size={16} /> Delete all
            </Button>
          </div>
        </section>

        {notice ? <div className="notification-action-notice">{notice}</div> : null}

        <section className="notification-summary-grid">
          <Card elevated><CardContent><strong>{notificationSummary.total}</strong><span>Total notifications</span></CardContent></Card>
          <Card elevated><CardContent><strong>{notificationSummary.unread}</strong><span>Unread</span></CardContent></Card>
          <Card elevated><CardContent><strong>{notificationSummary.urgent}</strong><span>Urgent</span></CardContent></Card>
          <Card elevated><CardContent><strong>{notificationSummary.byType.chat || 0}</strong><span>Messages</span></CardContent></Card>
        </section>

        <section className="notification-controls">
          <div className="notification-search">
            <Search size={18} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
            />
          </div>
          <div className="notification-filter-row">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                className={activeType === option.value ? "active" : ""}
                onClick={() => setActiveType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {filteredNotifications.length > 0 ? (
          <div className="notif-list rich-notif-list">
            {filteredNotifications.map((notification) => {
              const Icon = iconMap[notification.type] || Bell;
              return (
                <Card key={notification.id} elevated hoverable className={!notification.read ? "unread" : ""}>
                  <CardContent>
                    <div className="notif-row rich-notif-row">
                      <div className={`notif-icon notif-icon--${notification.type || "system"}`}>
                        <Icon size={20} />
                      </div>
                      <div className="notif-text">
                        <div className="notif-title-row">
                          <h3>{notification.title || "Notification"}</h3>
                          <Badge variant={getNotificationBadgeVariant(notification)} size="sm">
                            {notification.read ? getNotificationPriorityLabel(notification) : `Unread • ${getNotificationPriorityLabel(notification)}`}
                          </Badge>
                        </div>
                        <p className="notif-message">{notification.message}</p>
                        <p className="notif-time">{notification.timestamp}</p>
                      </div>
                      <div className="notif-item-actions">
                        {!notification.read ? (
                          <button
                            className="mark-read-btn"
                            onClick={() => markNotificationRead(notification.id, user)}
                            title="Mark as read"
                          >
                            <Check size={18} />
                          </button>
                        ) : null}
                        {notification.actionChatUserId ? (
                          <button
                            className="open-notification-btn chat-now-notification-btn"
                            onClick={() => handleChatNow(notification)}
                            title="Chat now"
                          >
                            <MessageSquare size={18} /><span className="notif-action-label">{notification.actionLabel || "Chat Now"}</span>
                          </button>
                        ) : null}
                        <button
                          className="open-notification-btn"
                          onClick={() => handleOpenNotification(notification)}
                          title="View exact details"
                        >
                          <ExternalLink size={18} /><span className="notif-action-label">View Details</span>
                        </button>
                        <button
                          className="delete-notification-btn"
                          onClick={() => handleDeleteNotification(notification.id)}
                          title="Delete notification"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="empty-notif">
              <Bell size={48} />
              <p>No notifications found for this filter.</p>
            </div>
          </Card>
        )}
      </div>
    </ResidentLayout>
  );
}

export default Notifications;
