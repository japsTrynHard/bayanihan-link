# BAYANIHAN LINK - Community Assistance Platform

A professional, fully functional React application for community assistance, job finding, lost & found, and emergency alerts in San Miguel, Bulacan.

## Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Badge.jsx
│   ├── Input.jsx
│   ├── Avatar.jsx
│   ├── Modal.jsx
│   ├── Header.jsx
│   └── ImageUploader.jsx
├── pages/                   # Page components (all 12 pages)
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   ├── PostDetail.jsx
│   ├── FindHelp.jsx
│   ├── Chat.jsx
│   ├── Notifications.jsx
│   ├── BarangayDirectory.jsx
│   ├── EmergencyAssistance.jsx
│   ├── LostAndFound.jsx
│   └── Settings.jsx
├── context/                 # React Context for state
│   ├── AuthContext.jsx      # User authentication
│   └── AppContext.jsx       # App-wide data management
├── data/                    # Mock data and constants
│   └── mockData.js
├── styles/
│   ├── globals.css          # Global styles & design tokens
│   ├── components/          # Component-specific styles
│   └── pages/               # Page-specific styles
├── App.jsx                  # Main app with routing
└── index.jsx                # React entry point
```

## Features

### Core Features
- **User Authentication** - Demo-ready login/register with profile management
- **Post Creation** - Create job postings, help requests, lost/found items
- **Dynamic Feed** - Browse and filter posts by type and barangay
- **Search & Filter** - Real-time search and filtering functionality
- **Chat System** - Send messages to other community members
- **Notifications** - Real-time notification system
- **Emergency Alerts** - Report and respond to emergencies
- **Lost & Found** - Dedicated section for lost and found items with photos
- **User Profiles** - View and manage user profiles and settings

### UI/UX Features
- **Professional Design** - Deep blue (#1E40AF) primary color with clean whites
- **Responsive Layout** - Mobile-first design works on all screen sizes
- **Real-time Updates** - Dynamic data rendering with React Context
- **Smooth Animations** - Transitions and hover effects throughout
- **Accessibility** - Semantic HTML and ARIA attributes
- **Image Upload** - Drag-and-drop image uploading for posts

## Design System

### Colors
- **Primary**: #1E40AF (Deep Blue)
- **Primary Light**: #3B82F6
- **Primary Dark**: #1E3A8A
- **Success**: #10B981
- **Warning**: #F59E0B
- **Danger**: #DC2626
- **Background**: #FFFFFF
- **Background Alt**: #F9FAFB
- **Border**: #E5E7EB

### Typography
- **Font Family**: System fonts (SF, Segoe, Roboto, Ubuntu, etc.)
- **Heading Sizes**: 2.25rem to 1rem with proper hierarchy
- **Body Size**: 1rem with 1.6 line-height for readability

### Spacing
- Uses 8px base unit throughout (--space-1 through --space-24)
- Consistent padding and margins for visual harmony

## Mock Data Included

The application comes with:
- **4+ User Profiles** - Demo users ready to interact
- **15+ Posts** - Job offerings, help requests, lost items
- **5+ Chat Conversations** - Demo conversations with messages
- **8+ Notifications** - Various notification types
- **3+ Emergency Posts** - Demo emergency situations
- **24 Barangays** - Complete barangay directory with population data

## Demo Credentials

```
Email: juan@example.com
Password: password123
```

All authentication is demo-only and resets on refresh. No backend database required.

## Getting Started

### Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

### Build for Production

```bash
npm run build
```

The `dist/` folder will contain the production-ready files.

## Component API

### Button Component
```jsx
<Button 
  variant="primary|secondary|outline|danger|ghost|success"
  size="sm|md|lg|xl"
  disabled={false}
  isLoading={false}
  fullWidth={false}
  type="button|submit"
>
  Click me
</Button>
```

### Input Component
```jsx
<Input
  label="Email"
  type="email"
  required={true}
  error="Email is required"
  hint="Enter your email"
  icon={MailIcon}
  placeholder="you@example.com"
/>
```

### Card Component
```jsx
<Card elevated={true} hoverable={true}>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Your content here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

### Modal Component
```jsx
<Modal
  isOpen={true}
  onClose={() => setOpen(false)}
  title="Modal Title"
  subtitle="Optional subtitle"
  size="md|lg|xl"
>
  Content here
</Modal>
```

## Context API Usage

### AuthContext
```jsx
const { user, isAuthenticated, login, logout, register, updateProfile } = useAuth();
```

### AppContext
```jsx
const {
  allPosts,
  createPost,
  deletePost,
  getPost,
  getFilteredPosts,
  chats,
  addMessage,
  allNotifications,
  markNotificationRead,
  emergencies,
  createEmergency,
  barangays,
} = useApp();
```

## Styling

### Global CSS Variables
All styles use CSS custom properties for easy theming:
- Colors: `--primary`, `--success`, `--danger`, etc.
- Spacing: `--space-1` through `--space-24`
- Shadows: `--shadow`, `--shadow-lg`
- Radius: `--radius`, `--radius-lg`, `--radius-xl`

### Utility Classes
- `.container` - Max-width container
- `.flex`, `.flex-col` - Flexbox utilities
- `.gap-*` - Gap spacing
- `.p-*`, `.m-*` - Padding/margin
- `.rounded*` - Border radius
- `.shadow*` - Box shadows
- `.text-*` - Font sizes
- `.font-*` - Font weights

## File Language Requirements

✅ **Allowed**: .jsx (React components), .js (utilities, data, config)
❌ **Not Used**: .tsx, .ts, Vite config

## Key Implementation Details

### Dynamic Form Components
All forms use React state management with real-time validation and error display. Image uploads are handled with drag-and-drop support.

### Context-Based State
No Redux or complex state management - uses React Context API for clean, readable code suitable for academic presentations.

### Professional UI/UX
Consistent design tokens, responsive grid layouts, smooth animations, and semantic HTML throughout ensure professional presentation quality.

### Mock Data System
Comprehensive mock data in `src/data/mockData.js` allows full feature demonstration without database setup.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Code splitting per page
- CSS-in-JS with optimized rerenderers
- Efficient list rendering with keys
- Lazy loading ready for images

## Accessibility

- Semantic HTML (`<header>`, `<main>`, `<nav>`)
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast compliant
- Screen reader friendly

## Future Enhancements

The current implementation is demo-ready. To add database functionality:
1. Replace mock data with real API calls
2. Implement backend authentication
3. Add file upload to cloud storage (Vercel Blob, AWS S3, etc.)
4. Implement real-time updates with WebSockets
5. Add server-side validation

## Support

For questions or issues:
- Check the component examples in the `src/components/` folder
- Review the mock data structure in `src/data/mockData.js`
- Inspect the design tokens in `src/styles/globals.css`

---

**Built with React 18, React Router v6, and modern CSS practices.**
