import React, { useEffect, useState } from "react";
import { Bell, Calendar, Mail, MapPin, MoonStar, Phone, RotateCcw, Save, Shield, Sun, Monitor, UserCog, Lock } from "lucide-react";
import Card, { CardContent } from "../../components/Card";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Avatar from "../../components/Avatar";
import ImageUploader from "../../components/ImageUploader";
import Badge from "../../components/Badge";
import AdminLayout from "../../components/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { resetStorageToDemo } from "../../utils/storage";
import { isLocalModuleResetEnabled, getBuildLabel } from "../../utils/appMode";
import { CLOUDINARY_FOLDERS } from "../../services/cloudinaryService";
import "../../styles/pages/Settings.css";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: MoonStar },
  { value: "system", label: "System", icon: Monitor },
];

const defaultAdminPreferences = {
  emergencyAlerts: true,
  appointmentRequests: true,
  reports: true,
  announcements: true,
  moderationResults: true,
};

const adminPreferenceLabels = {
  emergencyAlerts: "Emergency reports",
  appointmentRequests: "Appointment requests",
  reports: "Reports and complaints",
  announcements: "Announcement activity",
  moderationResults: "Moderation results",
};

function getStoredAdminPreferences(userId, firestorePrefs = {}) {
  if (firestorePrefs && Object.keys(firestorePrefs).length) {
    return { ...defaultAdminPreferences, ...firestorePrefs };
  }
  if (!userId) return defaultAdminPreferences;
  try {
    const saved = JSON.parse(localStorage.getItem(`adminNotificationPrefs:${userId}`) || "null");
    return { ...defaultAdminPreferences, ...(saved || {}) };
  } catch (error) {
    console.warn("Invalid admin notification preferences reset.", error);
    return defaultAdminPreferences;
  }
}

const getImageValue = (imageValue) => {
  const selected = Array.isArray(imageValue) ? imageValue[0] : imageValue;
  if (!selected) return { url: "", publicId: "" };
  if (typeof selected === "string") return { url: selected, publicId: "" };
  return {
    url: selected.url || selected.secure_url || selected.previewUrl || "",
    publicId: selected.publicId || selected.public_id || "",
  };
};

function AdminSettingsPage() {
  const localResetEnabled = isLocalModuleResetEnabled();
  const buildLabel = getBuildLabel();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  // useState: Hawak ang values ng admin profile form habang ine-edit.
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    barangay: user?.barangay || "",
    bio: user?.bio || "",
    profilePicture: user?.profilePicture || user?.avatarUrl || "",
    avatarPublicId: user?.avatarPublicId || "",
  });
  // useState: Success/error message state pagkatapos ma-save ang admin settings.
  const [saved, setSaved] = useState("");
  // useState: Loading state habang nagsa-save ng admin profile.
  const [isSaving, setIsSaving] = useState(false);
  // useState: Admin password form values for deployed Firebase admin accounts.
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaved, setPasswordSaved] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  // useState: Admin notification preferences now mirrored to Firestore profile.
  const [preferences, setPreferences] = useState(() => getStoredAdminPreferences(user?.id, user?.notificationPreferences));

  useEffect(() => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      barangay: user?.barangay || "",
      bio: user?.bio || "",
      profilePicture: user?.profilePicture || user?.avatarUrl || "",
      avatarPublicId: user?.avatarPublicId || "",
    });
    setPreferences(getStoredAdminPreferences(user?.id, user?.notificationPreferences));
  }, [user?.id, user?.firstName, user?.lastName, user?.email, user?.phone, user?.barangay, user?.bio, user?.profilePicture, user?.avatarUrl, user?.avatarPublicId, user?.notificationPreferences]);

  const fullName = `${formData.firstName} ${formData.lastName}`.trim() || user?.name || "Barangay Admin";

  const handleImageSelect = (imageValue) => {
    const selected = getImageValue(imageValue);
    setFormData((current) => ({
      ...current,
      profilePicture: selected.url,
      avatarPublicId: selected.publicId,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved("");

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();

    if (!firstName || !lastName) {
      setSaved("First name and last name are required.");
      setIsSaving(false);
      return;
    }

    const result = await updateProfile({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      // Official admin email stays locked for account security.
      phone: formData.phone.trim(),
      barangay: user?.barangay || formData.barangay,
      bio: formData.bio.trim(),
      profilePicture: formData.profilePicture,
      avatarPublicId: formData.avatarPublicId,
      notificationPreferences: preferences,
    });

    setIsSaving(false);

    if (result?.error) {
      setSaved(result.error);
      return;
    }

    setSaved("Admin profile updated.");
    window.setTimeout(() => setSaved(""), 2500);
  };

  const handleSavePreferences = async () => {
    localStorage.setItem(`adminNotificationPrefs:${user?.id}`, JSON.stringify(preferences));
    const result = await updateProfile({ notificationPreferences: preferences });
    setSaved(result?.error || "Admin preferences saved.");
    window.setTimeout(() => setSaved(""), 2500);
  };

  const handleResetPreferences = async () => {
    setPreferences(defaultAdminPreferences);
    localStorage.setItem(`adminNotificationPrefs:${user?.id}`, JSON.stringify(defaultAdminPreferences));
    const result = await updateProfile({ notificationPreferences: defaultAdminPreferences });
    setSaved(result?.error || "Admin preferences reset.");
    window.setTimeout(() => setSaved(""), 2500);
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordSaved("");
    setIsPasswordSaving(true);

    const result = await changePassword(passwordData);
    setIsPasswordSaving(false);

    if (result?.error) {
      setPasswordSaved(result.error);
      return;
    }

    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordSaved(result?.message || "Admin password updated successfully.");
    window.setTimeout(() => setPasswordSaved(""), 3000);
  };

  const updatePasswordField = (field, value) => {
    setPasswordData((current) => ({ ...current, [field]: value }));
    setPasswordSaved("");
  };

  const handleResetDemoData = async () => {
    resetStorageToDemo();
    localStorage.removeItem("currentUser");
    await logout();
    window.location.href = "/login";
  };

  return (
    <AdminLayout title="Admin Settings" subtitle="Manage the official profile, assigned barangay display, theme mode, and admin preferences.">
      <div className="settings-page-shell admin-settings-shell">
        <div className="settings-container settings-container-wide">
          <div className="split-grid profile-settings-grid">
            <div className="list-stack">
              <Card elevated className="profile-summary-card">
                <CardContent>
                  <div className="profile-summary-head">
                    <Avatar initials={user?.avatar || "A"} src={formData.profilePicture || user?.profilePicture} alt={fullName} size="xl" />
                    <div>
                      <h2>{fullName}</h2>
                      <p>Barangay official - {user?.barangay || "Assigned barangay"}</p>
                      <div className="pill-row">
                        <Badge variant="success">Official Admin</Badge>
                        <Badge variant="secondary">{user?.status || "Active"}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="profile-info-list">
                    <div><Mail size={16} /><span>{user?.email || "Preset barangay admin email"}</span></div>
                    <div><Phone size={16} /><span>{formData.phone || "No phone number saved"}</span></div>
                    <div><MapPin size={16} /><span>{user?.barangay || "No barangay assigned"}</span></div>
                    <div><Calendar size={16} /><span>Admin since {user?.joinedDate || "registered account"}</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card elevated>
                <CardContent>
                  <h3 className="card-section-title"><Shield size={18} /> Admin Scope</h3>
                  <p style={{ color: "var(--foreground-muted)" }}>The assigned barangay is locked so this admin only manages residents, posts, reports, appointments, and emergency reports from the correct barangay.</p>
                  <div className="note-box"><strong>Assigned barangay:</strong> {user?.barangay || "Not assigned"}<br /><strong>Build:</strong> {buildLabel}</div>
                </CardContent>
              </Card>

              <Card elevated>
                <CardContent>
                  <h3 className="card-section-title"><Lock size={18} /> Credential Policy</h3>
                  <p style={{ color: "var(--foreground-muted)" }}>The assigned username and barangay scope stay fixed. In deployed Firebase accounts, the admin can update the password from the security form.</p>
                  <div className="note-box">Do not share admin credentials with residents. Profile changes are saved to the account and mirrored to local module records.</div>
                </CardContent>
              </Card>

              {localResetEnabled && (
                <Card elevated>
                  <CardContent>
                    <h3 className="card-section-title"><RotateCcw size={18} /> Local Module Reset</h3>
                    <p style={{ color: "var(--foreground-muted)" }}>Restore prepared local module records. This control is hidden in the normal final build.</p>
                    <Button variant="outline" onClick={handleResetDemoData}><RotateCcw size={16} />Reset Local Module Data</Button>
                  </CardContent>
                </Card>
              )}

              <Card elevated>
                <CardContent>
                  <h3 className="card-section-title"><Bell size={18} /> Admin Notification Preferences</h3>
                  <div className="notification-settings compact-notification-grid">
                    {Object.entries(preferences).map(([key, value]) => (
                      <label key={key} className="notif-toggle">
                        <input type="checkbox" checked={value} onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })} />
                        <span className="toggle-label">{adminPreferenceLabels[key] || key}</span>
                      </label>
                    ))}
                  </div>
                  <div className="inline-actions">
                    <Button variant="outline" onClick={handleResetPreferences}><RotateCcw size={16} />Reset</Button>
                    <Button variant="primary" onClick={handleSavePreferences}><Save size={16} />Save Preferences</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="list-stack">
              <Card elevated className="profile-form-card">
                <CardContent>
                  <h3 className="card-section-title">Official Profile</h3>
                  <form onSubmit={handleSave} className="form-grid profile-form-grid">
                    <div className="two-column-form-row">
                      <Input label="First Name" icon={UserCog} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                      <Input label="Last Name" icon={UserCog} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
                    </div>
                    <Input label="Email Address" icon={Mail} type="email" value={formData.email} disabled hint="Preset admin email is locked to keep barangay username login working." />
                    <Input label="Phone Number" icon={Phone} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    <Input label="Assigned Barangay" icon={MapPin} value={user?.barangay || formData.barangay} disabled hint="Only the assigned barangay can be managed by this admin." />
                    <div className="full-span">
                      <label className="input-label">Upload Admin Profile Picture</label>
                      <ImageUploader cloudinaryFolder={CLOUDINARY_FOLDERS.PROFILES} onImageSelect={handleImageSelect} multiple={false} initialImages={formData.profilePicture ? [{ url: formData.profilePicture, publicId: formData.avatarPublicId }] : []} />
                    </div>
                    <div className="full-span">
                      <label className="input-label">Bio / Office Note</label>
                      <textarea rows="4" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Add a short official note or barangay office role." />
                    </div>
                    <div className="full-span form-save-row"><span className="save-message">{saved}</span><Button type="submit" variant="primary" isLoading={isSaving}><Save size={18} />Save Changes</Button></div>
                  </form>
                </CardContent>
              </Card>

              <Card elevated className="profile-form-card">
                <CardContent>
                  <h3 className="card-section-title"><Lock size={18} /> Admin Security</h3>
                  <p style={{ color: "var(--foreground-muted)" }}>
                    Change the password for the signed-in deployed admin account. Local fallback admin sessions cannot change Firebase passwords.
                  </p>
                  <form onSubmit={handlePasswordChange} className="form-grid profile-form-grid">
                    <Input
                      label="Current Password"
                      type="password"
                      icon={Lock}
                      value={passwordData.currentPassword}
                      onChange={(e) => updatePasswordField("currentPassword", e.target.value)}
                      required
                    />
                    <div className="two-column-form-row">
                      <Input
                        label="New Password"
                        type="password"
                        icon={Lock}
                        value={passwordData.newPassword}
                        onChange={(e) => updatePasswordField("newPassword", e.target.value)}
                        hint="Use at least 8 characters."
                        required
                      />
                      <Input
                        label="Confirm New Password"
                        type="password"
                        icon={Lock}
                        value={passwordData.confirmPassword}
                        onChange={(e) => updatePasswordField("confirmPassword", e.target.value)}
                        required
                      />
                    </div>
                    <div className="full-span form-save-row">
                      <span className="save-message">{passwordSaved}</span>
                      <Button type="submit" variant="outline" isLoading={isPasswordSaving}>
                        <Save size={18} />Update Password
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card elevated>
                <CardContent>
                  <h3 className="card-section-title">Interface Preferences</h3>
                  <div className="note-box settings-status-box"><strong>Selected mode:</strong> {theme}<br /><strong>Currently applied:</strong> {resolvedTheme}</div>
                  <div className="theme-option-grid compact-theme-grid">
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button key={option.value} type="button" className={`theme-option-card ${theme === option.value ? "active" : ""}`} onClick={() => setTheme(option.value)}>
                          <Icon size={22} />
                          <strong>{option.label}</strong>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminSettingsPage;
