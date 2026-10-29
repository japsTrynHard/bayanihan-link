import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserRound, Lock, Eye, EyeOff, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import Card, { CardContent } from "../../components/Card";
import Input from "../../components/Input";
import Button from "../../components/Button";
import AuthLayout from "../../components/AuthLayout";
import { useAuth } from "../../context/AuthContext";
import "../../styles/pages/Auth.css";

function Login() {
  const { login, isSubmitting: isLoading } = useAuth();
  const navigate = useNavigate();
  // useState: Controls kung makikita o naka-hide ang password field.
  const [showPassword, setShowPassword] = useState(false);
  // useState: Hawak ang username/email at password values ng unified login form.
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  // useState: Hawak ang validation errors ng login form.
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.identifier.trim()) newErrors.identifier = "Email or username is required";
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "", form: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const loggedInUser = await login(formData.identifier, formData.password);
    if (loggedInUser?.error) {
      setErrors({ form: loggedInUser.error });
      return;
    }

    if (!loggedInUser) {
      setErrors({ form: "Invalid account credentials." });
      return;
    }

    if (loggedInUser.role === "barangay_admin") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  return (
    <AuthLayout
      title="Account login"
      subtitle="Sign in securely to open the dashboard assigned to your account."
      badge="Secure Access"
    >
      <Card elevated className="auth-card auth-card--live">
        <CardContent>
          <div className="auth-header">
            <div className="auth-status-pill"><Shield size={15} /> Secure system access</div>
            <h2>Welcome back</h2>
            <p>Enter your assigned account credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <Input label="Email or Username" type="text" icon={UserRound} required value={formData.identifier} onChange={(e) => updateField("identifier", e.target.value)} error={errors.identifier} placeholder="Enter your email or username" />

            <div className="password-input">
              <Input label="Password" type={showPassword ? "text" : "password"} icon={Lock} required value={formData.password} onChange={(e) => updateField("password", e.target.value)} error={errors.password} placeholder="••••••••" />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {errors.form ? (
              <div className="auth-login-alert" role="alert">
                <AlertCircle size={18} />
                <span>{errors.form}</span>
              </div>
            ) : null}

            <Button variant="primary" size="lg" fullWidth type="submit" isLoading={isLoading}>Sign In</Button>
            <p className="auth-footer">Don&apos;t have a resident account? <Link to="/register">Create one now</Link></p>
          </form>


          <div className="live-info-panel">
            <p><CheckCircle2 size={16} /> Your account will open the correct dashboard automatically.</p>
            <p><CheckCircle2 size={16} /> Access is protected by account role and assigned barangay scope.</p>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export default Login;
