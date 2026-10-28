# useState Guide for the Completed Skeleton

This file lists every `useState` in the source code and explains where it is used.

## src/components/Header.jsx
- `line 14` — `isMenuOpen` = `useState(false)`
  - Purpose: Controls the mobile/header menu open and close state.

## src/components/ImageUploader.jsx
- `line 12` — `previews` = `useState([])`
  - Purpose: Stores temporary preview URLs of selected images before upload/save.
- `line 14` — `error` = `useState('')`
  - Purpose: Stores validation errors such as invalid file type or too many files.

## src/components/Sidebar.jsx
- `line 20` — `isOpen` = `useState(false)`
  - Purpose: Controls the sidebar visibility on smaller screens.

## src/context/AppContext.jsx
- `line 33` — `users` = `useState([])`
  - Purpose: Global list of users used across resident and admin pages.
- `line 35` — `allPosts` = `useState([])`
  - Purpose: Global list of posts such as jobs and lost-and-found items.
- `line 37` — `chats` = `useState([])`
  - Purpose: Global chat conversations and messages.
- `line 39` — `allNotifications` = `useState([])`
  - Purpose: Global notifications shown to residents and admins.
- `line 41` — `emergencies` = `useState([])`
  - Purpose: Global emergency reports submitted by residents.
- `line 43` — `appointments` = `useState([])`
  - Purpose: Global appointment requests for barangay services/documents.
- `line 45` — `announcements` = `useState([])`
  - Purpose: Global barangay announcements created by admins.
- `line 47` — `reports` = `useState([])`
  - Purpose: Global reports for moderation and complaints.
- `line 49` — `barangays` = `useState([])`
  - Purpose: List of barangays used for filters and registration options.
- `line 51` — `selectedBarangay` = `useState("")`
  - Purpose: Stores the currently selected barangay filter in the UI.
- `line 53` — `searchQuery` = `useState("")`
  - Purpose: Stores the current global search/filter text.

## src/context/AuthContext.jsx
- `line 12` — `user` = `useState(null)`
  - Purpose: Stores the currently logged-in account information.
- `line 14` — `isAuthenticated` = `useState(false)`
  - Purpose: Tracks if a resident or admin is currently authenticated.
- `line 16` — `isLoading` = `useState(false)`
  - Purpose: Tracks loading state during login, logout, or session restore.

## src/context/ThemeContext.jsx
- `line 8` — `theme` = `useState('light')`
  - Purpose: Stores the active theme so the UI can switch between light and dark modes.

## src/pages/admin/AdminLoginPage.jsx
- `line 20` — `error` = `useState("")`
  - Purpose: Stores login validation or authentication error messages.

## src/pages/admin/AdminSettingsPage.jsx
- `line 21` — `saved` = `useState("")`
  - Purpose: Shows a short success message after saving settings.

## src/pages/admin/AnnouncementManagementPage.jsx
- `line 16` — `isModalOpen` = `useState(false)`
  - Purpose: Controls the create-announcement modal visibility.

## src/pages/admin/UserManagementPage.jsx
- `line 12` — `search` = `useState("")`
  - Purpose: Stores the search text for filtering users in admin view.

## src/pages/public/Login.jsx
- `line 15` — `showPassword` = `useState(false)`
  - Purpose: Toggles whether the password input is visible or hidden.
- `line 22` — `errors` = `useState({})`
  - Purpose: Stores inline validation errors for the login form.

## src/pages/public/Register.jsx
- `line 17` — `showPassword` = `useState(false)`
  - Purpose: Toggles whether the password field is visible during registration.
- `line 27` — `errors` = `useState({})`
  - Purpose: Stores validation messages for registration fields.

## src/pages/resident/AppointmentRequestPage.jsx
- `line 25` — `isModalOpen` = `useState(false)`
  - Purpose: Controls the appointment request modal visibility.
- `line 27` — `filter` = `useState("all")`
  - Purpose: Stores the selected appointment status filter.

## src/pages/resident/ChatPage.jsx
- `line 14` — `selectedChat` = `useState(chats[0])`
  - Purpose: Stores the currently opened chat conversation.
- `line 16` — `messageText` = `useState("")`
  - Purpose: Stores the current message being typed by the user.

## src/pages/resident/EmergencyPage.jsx
- `line 17` — `isModalOpen` = `useState(false)`
  - Purpose: Controls the emergency report modal visibility.

## src/pages/resident/JobsPage.jsx
- `line 17` — `isModalOpen` = `useState(false)`
  - Purpose: Controls the create-job modal visibility.
- `line 19` — `search` = `useState("")`
  - Purpose: Stores the search text used to filter job posts.
- `line 21` — `filter` = `useState("all")`
  - Purpose: Stores the current job category/type filter.

## src/pages/resident/LostAndFoundPage.jsx
- `line 20` — `isModalOpen` = `useState(false)`
  - Purpose: Controls the lost-and-found posting modal visibility.
- `line 22` — `filterType` = `useState("")`
  - Purpose: Stores the selected listing filter such as lost or found.
- `line 24` — `uploadedImages` = `useState([])`
  - Purpose: Stores selected image previews/values for a lost-and-found post.

## src/pages/resident/ProfilePage.jsx
- `line 24` — `savedMessage` = `useState("")`
  - Purpose: Displays a short confirmation after profile save.

## src/pages/resident/ResidentDashboard.jsx
- `line 23` — `isModalOpen` = `useState(false)`
  - Purpose: Controls the quick post modal shown from the dashboard.