import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, MoonStar, Palette, RotateCcw, Shield, Sun, Monitor } from "lucide-react";
import Card, { CardContent, CardHeader, CardTitle } from "../../components/Card";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { resetStorageToDemo } from "../../utils/storage";
import { isLocalModuleResetEnabled, getBuildLabel } from "../../utils/appMode";
import ResidentLayout from "../../components/ResidentLayout";
import "../../styles/pages/Settings.css";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun, description: "Bright mode for daytime use." },
  { value: "dark", label: "Dark", icon: MoonStar, description: "Low-light mode with readable contrast." },
  { value: "system", label: "System", icon: Monitor, description: "Follow your device setting." },
];

const defaultPreferences = {
  jobPostings: true,
  lostAndFound: true,
  emergency: true,
  messages: true,
  appointments: true,
  announcements: true,
  moderation: true,
};

const preferenceLabels = {
  jobPostings: "Job postings and responses",
  lostAndFound: "Lost and found matches",
  emergency: "Emergency alerts",
  messages: "Chat messages",
  appointments: "Appointment updates",
  announcements: "Barangay announcements",
  moderation: "Post moderation updates",
};

function getStoredPreferences(userId, firestorePrefs = {}) {
  if (firestorePrefs && Object.keys(firestorePrefs).length) {
    return { ...defaultPreferences, ...firestorePrefs };
  }
  if (!userId) return defaultPreferences;
  try {
    const saved = JSON.parse(localStorage.getItem(`residentNotificationPrefs:${userId}`) || "null");
    return { ...defaultPreferences, ...(saved || {}) };
  } catch (error) {
    console.warn("Invalid resident notification preferences reset.", error);
    return defaultPreferences;
  }
}

function Settings() {
  const localResetEnabled = isLocalModuleResetEnabled();
  const buildLabel = getBuildLabel();
  const { user, logout, updateProfile } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  // useState: Hawak ang on/off notification preferences ng resident habang nasa settings page.
  const [notifications, setNotifications] = useState(() => getStoredPreferences(user?.id, user?.notificationPreferences));
  // useState: Success message kapag nasave ang local resident preferences.
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    setNotifications(getStoredPreferences(user?.id, user?.notificationPreferences));
  }, [user?.id, user?.notificationPreferences]);

  const handlePreferenceChange = (key, checked) => {
    setNotifications((current) => ({ ...current, [key]: checked }));
    setSavedMessage("");
  };

  const savePreferences = async () => {
    localStorage.setItem(`residentNotificationPrefs:${user?.id}`, JSON.stringify(notifications));
    const result = await updateProfile({ notificationPreferences: notifications });
    setSavedMessage(result?.error || "Notification preferences saved.");
    window.setTimeout(() => setSavedMessage(""), 2200);
  };

  const resetPreferences = async () => {
    setNotifications(defaultPreferences);
    localStorage.setItem(`residentNotificationPrefs:${user?.id}`, JSON.stringify(defaultPreferences));
    const result = await updateProfile({ notificationPreferences: defaultPreferences });
    setSavedMessage(result?.error || "Notification preferences reset to default.");
    window.setTimeout(() => setSavedMessage(""), 2200);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleResetDemoData = async () => {
    resetStorageToDemo();
    localStorage.removeItem("currentUser");
    await logout();
    navigate("/login");
    window.location.reload();
  };

  return (
    <ResidentLayout>
      <div className="settings-page-shell">
        <div className="settings-container">
          <div className="page-hero settings-hero-card">
            <div className="hero-text">
              <div className="pill-row" style={{ marginBottom: "0.75rem" }}>
                <Badge variant="secondary">Resident Settings</Badge>
                <Badge variant="success">{resolvedTheme} mode active</Badge>
              </div>
              <h1>Settings</h1>
              <p>Manage appearance, notification preferences, and resident session controls.</p>
            </div>
          </div>

          <div className="settings-grid-layout">
            <Card elevated className="settings-card settings-card-wide">
              <CardHeader><CardTitle><Palette size={18} /> Appearance Mode</CardTitle></CardHeader>
              <CardContent>
                <div className="note-box settings-status-box">
                  <strong>Selected mode:</strong> {theme}<br />
                  <strong>Currently applied:</strong> {resolvedTheme}<br />
                  <span>Dark mode colors are adjusted for readable cards, text, buttons, and icons.</span>
                </div>
                <div className="theme-option-grid">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`theme-option-card ${theme === option.value ? "active" : ""}`}
                        onClick={() => setTheme(option.value)}
                      >
                        <Icon size={22} />
                        <strong>{option.label}</strong>
                        <span>{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card elevated className="settings-card">
              <CardHeader><CardTitle><Shield size={18} /> Account Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="profile-info-list compact">
                  <div><strong>Name</strong><span>{user?.name}</span></div>
                  <div><strong>Email</strong><span>{user?.email}</span></div>
                  <div><strong>Barangay</strong><span>{user?.barangay}</span></div>
                  <div><strong>Status</strong><span>{user?.status || "Active"}</span></div>
                  <div><strong>Role</strong><span>Resident</span></div>
                  <div><strong>Build</strong><span>{buildLabel}</span></div>
                </div>
                <div className="note-box" style={{ marginTop: "1rem" }}>Email and password can be changed from the Profile page. Barangay stays locked to keep dashboard filters and admin scope accurate.</div>
              </CardContent>
            </Card>
          </div>

          <Card elevated className="settings-card">
            <CardHeader><CardTitle><Bell size={18} /> Notification Preferences</CardTitle></CardHeader>
            <CardContent>
              <div className="notification-settings">
                {Object.entries(notifications).map(([key, value]) => (
                  <label key={key} className="notif-toggle">
                    <input type="checkbox" checked={value} onChange={(e) => handlePreferenceChange(key, e.target.checked)} />
                    <span className="toggle-label">{preferenceLabels[key] || key.replace(/([A-Z])/g, " $1").trim()}</span>
                  </label>
                ))}
              </div>
              <div className="settings-save-row">
                <span className="save-message">{savedMessage}</span>
                <div className="inline-actions">
                  <Button variant="outline" onClick={resetPreferences}><RotateCcw size={16} />Reset</Button>
                  <Button variant="primary" onClick={savePreferences}><Bell size={16} />Save Preferences</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {localResetEnabled && (
            <Card elevated className="settings-card">
              <CardHeader><CardTitle><RotateCcw size={18} /> Local Module Reset</CardTitle></CardHeader>
              <CardContent>
                <p style={{ color: "var(--foreground-muted)" }}>Use this only when you want to restore prepared local module records. This control is hidden in the normal final build.</p>
                <Button variant="outline" onClick={handleResetDemoData}><RotateCcw size={18} />Reset Local Module Data</Button>
              </CardContent>
            </Card>
          )}

          <Card elevated className="settings-card danger-zone">
            <CardHeader><CardTitle>Session</CardTitle></CardHeader>
            <CardContent>
              <p className="danger-text">Logging out will end your current resident session on this browser.</p>
              <Button variant="danger" onClick={handleLogout}><LogOut size={18} />Logout</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResidentLayout>
  );
}

export default Settings;
