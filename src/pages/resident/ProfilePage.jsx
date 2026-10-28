import React, { useEffect, useMemo, useState } from "react";
import { Save, User, Phone, MapPin, Info, Mail, Shield, Lock, KeyRound, AlertTriangle, Clock, Plus, Trash2 } from "lucide-react";
import ResidentLayout from "../../components/ResidentLayout";
import Card, { CardContent } from "../../components/Card";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Avatar from "../../components/Avatar";
import ImageUploader from "../../components/ImageUploader";
import Badge from "../../components/Badge";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { CLOUDINARY_FOLDERS } from "../../services/cloudinaryService";
import { USER_STATUS, cleanEmergencyContacts } from "../../utils/storage";
import { formatSuspensionUntil, getSuspensionRemainingText, getWarningExpiryText } from "../../utils/accountModeration";
import "../../styles/pages/Skeleton.css";
import "../../styles/pages/Settings.css";

const getImageValue = (imageValue) => {
  const selected = Array.isArray(imageValue) ? imageValue[0] : imageValue;
  if (!selected) return { url: "", publicId: "" };
  if (typeof selected === "string") return { url: selected, publicId: "" };
  return {
    url: selected.url || selected.secure_url || selected.previewUrl || "",
    publicId: selected.publicId || selected.public_id || "",
  };
};

const emptyEmergencyContact = () => ({
  id: `emergency-contact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  relationship: "",
  phone: "",
  priority: "Backup",
  consent: true,
});

const normalizeContactRows = (contacts = []) => {
  const clean = cleanEmergencyContacts(contacts);
  return clean.length ? clean : [emptyEmergencyContact()];
};

function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const { allPosts, appointments, emergencies } = useApp();

  // useState: Hawak ang editable profile values ng current resident.
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    barangay: user?.barangay || "",
    bio: user?.bio || "",
    profilePicture: user?.profilePicture || user?.avatarUrl || "",
    avatarPublicId: user?.avatarPublicId || "",
    emergencyContacts: normalizeContactRows(user?.emergencyContacts),
  });
  // useState: Success/error message pagkatapos ma-save ang profile changes.
  const [savedMessage, setSavedMessage] = useState("");
  // useState: Determines if the profile flash message is success or error.
  const [savedStatus, setSavedStatus] = useState("success");
  // useState: Loading state habang nagsa-save ng profile.
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  // useState: Password change values for resident account security.
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  // useState: Password save message.
  const [passwordMessage, setPasswordMessage] = useState("");
  // useState: Determines if the password flash message is success or error.
  const [passwordStatus, setPasswordStatus] = useState("success");
  // useState: Loading state habang nagpapalit ng password.
  const [isSavingPassword, setIsSavingPassword] = useState(false);

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
      emergencyContacts: normalizeContactRows(user?.emergencyContacts),
    });
  }, [user?.id, user?.firstName, user?.lastName, user?.email, user?.phone, user?.barangay, user?.bio, user?.profilePicture, user?.avatarUrl, user?.avatarPublicId, user?.emergencyContacts]);

  const fullName = `${formData.firstName} ${formData.lastName}`.trim() || user?.name || "Resident";

  const stats = useMemo(() => {
    const myKeys = [user?.id, user?.uid].filter(Boolean);
    const myPosts = allPosts.filter((post) => myKeys.includes(post.author?.id) || myKeys.includes(post.authorId));
    const myAppointments = appointments.filter((item) => myKeys.includes(item.userId));
    const barangayEmergencies = emergencies.filter((item) => item.barangay === user?.barangay && item.status !== "Resolved");
    return { posts: myPosts.length, appointments: myAppointments.length, emergencies: barangayEmergencies.length };
  }, [allPosts, appointments, emergencies, user?.id, user?.uid, user?.barangay]);

  const handleImageSelect = (imageValue) => {
    const selected = getImageValue(imageValue);
    setFormData((current) => ({
      ...current,
      profilePicture: selected.url,
      avatarPublicId: selected.publicId,
    }));
  };


  const updateEmergencyContact = (contactId, updates) => {
    setFormData((current) => ({
      ...current,
      emergencyContacts: current.emergencyContacts.map((contact) =>
        contact.id === contactId ? { ...contact, ...updates } : contact,
      ),
    }));
  };

  const addEmergencyContact = () => {
    setFormData((current) => {
      const currentContacts = Array.isArray(current.emergencyContacts) ? current.emergencyContacts : [];
      if (currentContacts.length >= 3) return current;
      return {
        ...current,
        emergencyContacts: [...currentContacts, { ...emptyEmergencyContact(), priority: currentContacts.length === 0 ? "Primary" : "Backup" }],
      };
    });
  };

  const removeEmergencyContact = (contactId) => {
    setFormData((current) => {
      const nextContacts = current.emergencyContacts.filter((contact) => contact.id !== contactId);
      return { ...current, emergencyContacts: nextContacts.length ? nextContacts : [emptyEmergencyContact()] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSavedMessage("");

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();

    if (!firstName || !lastName) {
      setSavedStatus("error");
      setSavedMessage("First name and last name are required.");
      setIsSavingProfile(false);
      return;
    }

    const emergencyContacts = cleanEmergencyContacts(formData.emergencyContacts);
    const invalidContact = emergencyContacts.find((contact) => !contact.name || !contact.phone);
    if (invalidContact) {
      setSavedStatus("error");
      setSavedMessage("Emergency contacts must include both name and phone number. Remove incomplete rows if not needed.");
      setIsSavingProfile(false);
      return;
    }

    const result = await updateProfile({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email: formData.email.trim().toLowerCase() || user?.email,
      phone: formData.phone.trim(),
      barangay: user?.barangay || formData.barangay,
      bio: formData.bio.trim(),
      profilePicture: formData.profilePicture,
      avatarPublicId: formData.avatarPublicId,
      emergencyContacts,
    });

    setIsSavingProfile(false);

    if (result?.error) {
      setSavedStatus("error");
      setSavedMessage(result.error);
      return;
    }

    setSavedStatus("success");
    setSavedMessage("Profile details saved successfully.");
    window.setTimeout(() => setSavedMessage(""), 2500);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsSavingPassword(true);
    setPasswordMessage("");

    const result = await changePassword(passwordData);
    setIsSavingPassword(false);

    if (result?.error) {
      setPasswordStatus("error");
      setPasswordMessage(result.error);
      return;
    }

    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordStatus("success");
    setPasswordMessage(result?.message || "Password updated successfully.");
    window.setTimeout(() => setPasswordMessage(""), 2500);
  };

  return (
    <ResidentLayout>
      <div className="container profile-settings-shell">
        <div className="page-hero profile-hero-card">
          <div className="hero-text">
            <div className="pill-row" style={{ marginBottom: "0.75rem" }}>
              <Badge variant="success">Resident Profile</Badge>
              <Badge variant="secondary">{user?.barangay || "Barangay"}</Badge>
            </div>
            <h1>Profile Management</h1>
            <p>Update the resident information shown inside posts, chats, appointments, and community activities.</p>
          </div>
          <div className="profile-hero-avatar">
            <Avatar initials={user?.avatar || "U"} src={formData.profilePicture || user?.profilePicture} alt={fullName} size="xl" />
          </div>
        </div>

        <div className="split-grid profile-settings-grid">
          <div className="list-stack">
            <Card elevated className="profile-summary-card">
              <CardContent>
                <div className="profile-summary-head">
                  <Avatar initials={user?.avatar || "U"} src={formData.profilePicture || user?.profilePicture} alt={fullName} size="xl" />
                  <div>
                    <h2>{fullName}</h2>
                    <p>Barangay resident - {user?.barangay || "San Miguel"}</p>
                    <div className="pill-row">
                      <Badge variant={user?.status === "Suspended" ? "danger" : user?.status === "Warned" ? "warning" : "success"}>{user?.status || "Active"}</Badge>
                      <Badge variant="secondary">Resident</Badge>
                    </div>
                  </div>
                </div>

                <div className="profile-info-list">
                  <div><Mail size={16} /><span>{user?.email || "No email"}</span></div>
                  <div><Phone size={16} /><span>{formData.phone || "No phone number saved"}</span></div>
                  <div><MapPin size={16} /><span>{user?.barangay || "No barangay assigned"}</span></div>
                </div>
              </CardContent>
            </Card>

            <div className="metric-grid" style={{ marginBottom: 0 }}>
              <Card className="metric-card" elevated><p className="metric-label">Posts</p><p className="metric-value">{stats.posts}</p></Card>
              <Card className="metric-card" elevated><p className="metric-label">Appointments</p><p className="metric-value">{stats.appointments}</p></Card>
              <Card className="metric-card" elevated><p className="metric-label">Active Alerts</p><p className="metric-value">{stats.emergencies}</p></Card>
            </div>

            <Card elevated>
              <CardContent>
                <h3 className="card-section-title"><Shield size={18} /> Account Safety</h3>
                <p style={{ color: "var(--foreground-muted)" }}>Your barangay assignment is locked to keep resident posts, emergency reports, appointments, and admin filtering consistent.</p>
                {user?.status === USER_STATUS.SUSPENDED ? (
                  <div className="note-box danger-note"><AlertTriangle size={16} style={{ verticalAlign: "middle" }} /> {user?.statusReason || "Your account is suspended."} Access is restricted {formatSuspensionUntil(user?.suspensionEndsAt)}. <strong><Clock size={14} style={{ verticalAlign: "middle" }} /> {getSuspensionRemainingText(user?.suspensionEndsAt)}</strong></div>
                ) : user?.status === USER_STATUS.WARNED ? (
                  <div className="note-box warning-note"><AlertTriangle size={16} style={{ verticalAlign: "middle" }} /> {user?.statusReason || "Your account has a barangay admin warning."} This warning is temporary and {getWarningExpiryText(user?.warningExpiresAt)}.</div>
                ) : null}
                {user?.warnings?.length ? (
                  <div className="warning-history-box">
                    <strong>Warning history</strong>
                    <ul>
                      {user.warnings.slice(-3).reverse().map((warning) => (
                        <li key={warning.id || warning.createdAt}>
                          {warning.message || warning.reason || "Barangay admin warning"}
                          <small>{warning.createdAt ? new Date(warning.createdAt).toLocaleString() : ""}</small>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="note-box"><Info size={16} style={{ verticalAlign: "middle" }} /> Email changes may require a recent login. If Firebase asks for it, log out, log in again, then retry.</div>
              </CardContent>
            </Card>
          </div>

          <div className="list-stack">
            <Card elevated className="profile-form-card">
              <CardContent>
                <h3 className="card-section-title">Edit Resident Details</h3>
                <form onSubmit={handleSubmit} className="form-grid profile-form-grid">
                  <div className="two-column-form-row">
                    <Input label="First Name" icon={User} value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                    <Input label="Last Name" icon={User} value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
                  </div>
                  <Input label="Email Address" icon={Mail} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} hint="Use this email the next time you log in." />
                  <Input label="Phone Number" icon={Phone} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />

                  <div className="full-span emergency-contacts-editor">
                    <div className="emergency-contacts-editor__head">
                      <div>
                        <label className="input-label">Person to Contact in Case of Emergency</label>
                        <p>Optional. Used only when you report that you are the one needing help. Manual call only.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addEmergencyContact} disabled={(formData.emergencyContacts || []).length >= 3}>
                        <Plus size={16} /> Add Contact
                      </Button>
                    </div>

                    {(formData.emergencyContacts || []).map((contact, index) => (
                      <div className="emergency-contact-row" key={contact.id || index}>
                        <Input label={index === 0 ? "Contact Name" : "Backup Contact Name"} value={contact.name} onChange={(e) => updateEmergencyContact(contact.id, { name: e.target.value, priority: index === 0 ? "Primary" : "Backup" })} placeholder="Example: Maria Santos" />
                        <Input label="Relationship" value={contact.relationship} onChange={(e) => updateEmergencyContact(contact.id, { relationship: e.target.value })} placeholder="Mother, sibling, guardian" />
                        <Input label="Phone Number" icon={Phone} value={contact.phone} onChange={(e) => updateEmergencyContact(contact.id, { phone: e.target.value })} placeholder="09xxxxxxxxx" />
                        <Button type="button" variant="secondary" size="sm" onClick={() => removeEmergencyContact(contact.id)} title="Remove contact">
                          <Trash2 size={16} /> Remove
                        </Button>
                      </div>
                    ))}

                    <div className="note-box">
                      <Info size={16} style={{ verticalAlign: "middle" }} /> Emergency contacts are shown to barangay admin only if you choose <strong>I need help</strong> in an emergency report.
                    </div>
                  </div>
                  <Input label="Barangay" icon={MapPin} value={user?.barangay || formData.barangay} disabled hint="Barangay is locked after registration for proper filtering." />
                  <div className="full-span"><label className="input-label">Upload New Profile Picture</label><ImageUploader cloudinaryFolder={CLOUDINARY_FOLDERS.PROFILES} onImageSelect={handleImageSelect} multiple={false} initialImages={formData.profilePicture ? [{ url: formData.profilePicture, publicId: formData.avatarPublicId }] : []} /></div>

                  <div className="full-span">
                    <label className="input-label">Bio</label>
                    <textarea rows="5" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Add a short description about the resident." />
                  </div>

                  <div className="full-span form-save-row">
                    <span className={`save-message save-message--${savedStatus}`}>{savedMessage}</span>
                    <Button type="submit" variant="primary" isLoading={isSavingProfile}><Save size={18} />Save Profile</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card elevated className="profile-form-card">
              <CardContent>
                <h3 className="card-section-title"><Lock size={18} /> Password Security</h3>
                <form onSubmit={handlePasswordSubmit} className="form-grid profile-form-grid">
                  <Input label="Current Password" icon={KeyRound} type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} />
                  <Input label="New Password" icon={Lock} type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} hint="Use at least 8 characters." />
                  <Input label="Confirm New Password" icon={Lock} type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
                  <div className="full-span form-save-row">
                    <span className={`save-message save-message--${passwordStatus}`}>{passwordMessage}</span>
                    <Button type="submit" variant="outline" isLoading={isSavingPassword}><Lock size={18} />Update Password</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ResidentLayout>
  );
}

export default ProfilePage;
