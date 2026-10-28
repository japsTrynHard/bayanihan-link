import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

export const Notifications = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!userData.email) {
      navigate('/login');
      return;
    }
    setUser(userData);

    // Mock notifications
    const mockNotifications = [
      {
        id: 1,
        type: 'message',
        title: 'New message from Juan Santos',
        description: 'Are you still interested in the construction job?',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: false,
        link: '/chat',
      },
      {
        id: 2,
        type: 'response',
        title: 'New response to your job post',
        description: 'Maria Garcia responded to your "Construction Worker Needed" post',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: false,
        link: '/post/1',
      },
      {
        id: 3,
        type: 'post',
        title: 'New job in your barangay',
        description: 'A new job opportunity has been posted in San Isidro',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        read: true,
        link: '/dashboard',
      },
      {
        id: 4,
        type: 'emergency',
        title: 'Emergency Alert',
        description: 'Emergency alert posted in your community',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        read: true,
        link: '/dashboard',
      },
      {
        id: 5,
        type: 'message',
        title: 'New message from Rosa Cruz',
        description: 'Thanks for helping me find a job!',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        read: true,
        link: '/chat',
      },
      {
        id: 6,
        type: 'post',
        title: 'Help request posted near you',
        description: 'Someone in Bagong Bayan is looking for medical assistance support',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        read: true,
        link: '/find-help',
      },
    ];
    setNotifications(mockNotifications);
  }, [navigate]);

  const handleNotificationClick = (notification) => {
    // Mark as read
    setNotifications(notifications.map(n =>
      n.id === notification.id ? { ...n, read: true } : n
    ));
    // Navigate to the link
    navigate(notification.link);
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'response':
        return '👥';
      case 'post':
        return '📝';
      case 'emergency':
        return '🚨';
      default:
        return '🔔';
    }
  };

  const getNotificationBadge = (type) => {
    switch (type) {
      case 'message':
        return 'info';
      case 'response':
        return 'secondary';
      case 'post':
        return 'default';
      case 'emergency':
        return 'danger';
      default:
        return 'default';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type === filter);

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 hover:opacity-80"
            >
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">BL</span>
              </div>
              <span className="hidden sm:inline font-bold text-lg text-foreground">Notifications</span>
            </button>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                  Mark all as read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground border border-border hover:bg-secondary'
            }`}
          >
            All
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
                filter === 'unread'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground border border-border hover:bg-secondary'
              }`}
            >
              Unread ({unreadCount})
            </button>
          )}
          <button
            onClick={() => setFilter('message')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'message'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground border border-border hover:bg-secondary'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setFilter('response')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'response'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground border border-border hover:bg-secondary'
            }`}
          >
            Responses
          </button>
          <button
            onClick={() => setFilter('emergency')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'emergency'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-card text-foreground border border-border hover:bg-secondary'
            }`}
          >
            Emergency
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map(notification => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-colors ${
                  !notification.read
                    ? 'border-primary bg-blue-50'
                    : 'hover:border-primary'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="text-3xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-foreground ${
                            !notification.read ? 'text-lg' : ''
                          }`}>
                            {notification.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mt-1">
                            {notification.description}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-3 h-3 bg-primary rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant={getNotificationBadge(notification.type)} className="text-xs">
                          {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground text-lg">
                  {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
