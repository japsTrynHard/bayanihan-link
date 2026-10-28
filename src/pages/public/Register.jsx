import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Phone, MapPin, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Card, { CardContent } from "../../components/Card";
import Input from "../../components/Input";
import Button from "../../components/Button";
import AuthLayout from "../../components/AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { BARANGAYS } from "../../utils/storage";
import "../../styles/pages/Auth.css";

function Register() {
  const { register, isLoading } = useAuth();
  const { barangays = BARANGAYS, barangaySource = "fallback-static" } = useApp();
  const navigate = useNavigate();
  // useState: Controls kung makikita o naka-hide ang password field.
  const [showPassword, setShowPassword] = useState(false);
  // useState: Hawak ang registration form values bago gumawa ng resident account.
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    barangay: "",
    password: "",
    profilePicture: "",
  });
  // useState: Hawak ang validation errors ng registration form.
  const [errors, setErrors] = useState({});

  const validatePassword = (value) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.barangay) newErrors.barangay = "Please select a barangay";
    if (!formData.password) newErrors.password = "Password is required";
    else if (!validatePassword(formData.password)) newErrors.password = "Use at least 8 characters with letters and numbers";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const result = await register({
      ...formData,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      bio: "New BAYANIHAN LINK resident account.",
    });

    if (result?.error) {
      setErrors({ form: result.error });
      return;
    }
    navigate("/dashboard");
  };

  return (
    <AuthLayout title="Create resident account" subtitle="Create your resident profile and choose your barangay scope for community services." badge="Resident Registration">
      <Card elevated className="auth-card auth-card--live">
        <CardContent>
          <div className="auth-header">
            <div className="auth-status-pill"><CheckCircle2 size={15} /> Account setup</div>
            <h2>Join Bayanihan Link</h2>
            <p>Fill in your resident details to activate your account and barangay access.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-name-grid">
              <Input label="First Name" type="text" icon={User} required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} error={errors.firstName} placeholder="Juan" />
              <Input label="Last Name" type="text" icon={User} required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} error={errors.lastName} placeholder="Dela Cruz" />
            </div>

            <Input label="Email" type="email" icon={Mail} required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} error={errors.email} placeholder="you@example.com" />
            <Input label="Phone Number" type="tel" icon={Phone} required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} error={errors.phone} placeholder="+63 9171234567" />
            <Input label="Profile Picture URL (optional)" type="url" value={formData.profilePicture} onChange={(e) => setFormData({ ...formData, profilePicture: e.target.value })} placeholder="https://example.com/photo.jpg" />

            <div className="input-group">
              <label className="input-label">Barangay<span className="required">*</span></label>
              <div className="input-wrapper">
                <MapPin size={20} className="input-icon" />
                <select className={`input input-with-icon ${errors.barangay ? "input-error" : ""}`} value={formData.barangay} onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}>
                  <option value="">Select your barangay</option>
                  {(barangays.length ? barangays : BARANGAYS).filter((bgr) => bgr.name !== "Select Barangay").sort((first, second) => first.name.localeCompare(second.name)).map((bgr) => <option key={bgr.code || bgr.id || bgr.name} value={bgr.name}>{bgr.name}</option>)}
                </select>
              </div>
              {errors.barangay ? <p className="input-error-message">{errors.barangay}</p> : null}
              <p className="input-hint">Barangay list is loaded from the PSGC API and uses the saved official list if the API is temporarily unavailable.</p>
            </div>

            <div className="password-input">
              <Input label="Password" type={showPassword ? "text" : "password"} icon={Lock} required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} error={errors.password} placeholder="At least 8 characters" hint="Use letters and numbers for a stronger password." />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {errors.form ? <p className="input-error-message">{errors.form}</p> : null}

            <Button variant="primary" size="lg" fullWidth type="submit" isLoading={isLoading}>Create Account</Button>
            <p className="auth-footer">Already have an account? <Link to="/login">Sign in here</Link></p>
          </form>

          <div className="live-info-panel">
            <p><CheckCircle2 size={16} /> Your account will be linked to your selected barangay.</p>
            <p><CheckCircle2 size={16} /> Dashboard greetings will use your first name.</p>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export default Register;
