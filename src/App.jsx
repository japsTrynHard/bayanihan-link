import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppLoader from "./components/AppLoader";
import PageErrorBoundary from "./components/PageErrorBoundary";

// PUBLIC PAGES
import Landing from "./pages/public/Landing";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";

// RESIDENT PAGES
import ResidentDashboard from "./pages/resident/ResidentDashboard";
import PostDetailPage from "./pages/resident/PostDetailPage";
import ChatPage from "./pages/resident/ChatPage";
import NotificationsPage from "./pages/resident/NotificationsPage";
import MyPostsPage from "./pages/resident/MyPostsPage";
import AnnouncementsPage from "./pages/resident/AnnouncementsPage";
import EmergencyPage from "./pages/resident/EmergencyPage";
import LostAndFoundPage from "./pages/resident/LostAndFoundPage";
import SettingsPage from "./pages/resident/SettingsPage";
import JobsPage from "./pages/resident/JobsPage";
import AppointmentRequestPage from "./pages/resident/AppointmentRequestPage";
import ProfilePage from "./pages/resident/ProfilePage";

// ADMIN PAGES
import AdminDashboard from "./pages/admin/AdminDashboard";
import EmergencyMonitoringPage from "./pages/admin/EmergencyMonitoringPage";
import JobMonitoringPage from "./pages/admin/JobMonitoringPage";
import LostAndFoundMonitoringPage from "./pages/admin/LostAndFoundMonitoringPage";
import AppointmentManagementPage from "./pages/admin/AppointmentManagementPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import AnnouncementManagementPage from "./pages/admin/AnnouncementManagementPage";
import ReportsModerationPage from "./pages/admin/ReportsModerationPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";

function getHomeRouteForRole(user) {
  if (!user) return "/";
  return user.role === "barangay_admin" ? "/admin/dashboard" : "/dashboard";
}

function RouteLoader({ message = "Loading...", subtitle = "Preparing your community dashboard and restoring your session." }) {
  return <AppLoader message={message} subtitle={subtitle} />;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoader message="Preparing your sign in" subtitle="Checking your saved session and loading the login experience." />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getHomeRouteForRole(user)} replace />;
  }

  const homePath = user?.role === "barangay_admin" ? "/admin/dashboard" : "/dashboard";

  return <PageErrorBoundary homePath={homePath}>{children}</PageErrorBoundary>;
}

function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoader message="Opening your dashboard" subtitle="Syncing your access, notifications, and barangay workspace." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <RouteLoader message="Restoring your account" subtitle="Pulling your profile and role details from the secure database." />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={getHomeRouteForRole(user)} replace />;
  }

  const homePath = user?.role === "barangay_admin" ? "/admin/dashboard" : "/dashboard";
  return <PageErrorBoundary homePath={homePath}>{children}</PageErrorBoundary>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/admin-login" element={<Navigate to="/login" replace />} />

      {/* RESIDENT */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRole="resident">
            <ResidentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/post/:id"
        element={
          <ProtectedRoute allowedRole="resident">
            <PostDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute allowedRole="resident">
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRole="resident">
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-posts"
        element={
          <ProtectedRoute allowedRole="resident">
            <MyPostsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute allowedRole="resident">
            <AnnouncementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/:id"
        element={
          <ProtectedRoute allowedRole="resident">
            <AnnouncementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/emergency"
        element={
          <ProtectedRoute allowedRole="resident">
            <EmergencyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lost-found"
        element={
          <ProtectedRoute allowedRole="resident">
            <LostAndFoundPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute allowedRole="resident">
            <JobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointment-request"
        element={
          <ProtectedRoute allowedRole="resident">
            <AppointmentRequestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRole="resident">
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRole="resident">
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* ADMIN */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <AdminAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/emergencies"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <EmergencyMonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/jobs"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <JobMonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/lost-found"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <LostAndFoundMonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/appointments"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <AppointmentManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <UserManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/announcements"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <AnnouncementManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <ReportsModerationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/post/:id"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <PostDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <AdminNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRole="barangay_admin">
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
