// BAYANIHAN LINK - Mock Data Model
// This file contains all sample data for testing
// EASILY REMOVABLE: Replace these with API calls to backend database

// 49 official barangays of San Miguel, Bulacan (PSGC/PSA)
export const BARANGAYS = [
  "Select Barangay",
  "Bagong Silang",
  "Balaong",
  "Balite",
  "Bantog",
  "Bardias",
  "Baritan",
  "Batasan Bata",
  "Batasan Matanda",
  "Biak-na-Bato",
  "Biclat",
  "Buga",
  "Buliran",
  "Bulualto",
  "Calumpang",
  "Cambio",
  "Camias",
  "Ilog-Bulo",
  "King Kabayo",
  "Labne",
  "Lambakin",
  "Magmarale",
  "Malibay",
  "Mandile",
  "Masalipit",
  "Pacalag",
  "Paliwasan",
  "Partida",
  "Pinambaran",
  "Poblacion",
  "Pulong Bayabas",
  "Sacdalan",
  "Salacot",
  "Salangan",
  "San Agustin",
  "San Jose",
  "San Juan",
  "San Vicente",
  "Santa Ines",
  "Santa Lucia",
  "Santa Rita Bata",
  "Santa Rita Matanda",
  "Sapang",
  "Sibul",
  "Tartaro",
  "Tibagan",
  "Bagong Pag-asa",
  "Pulong Duhat",
  "Maligaya",
  "Tigpalas",
];

// 3 Test Accounts
export const USERS = [
  {
    id: "user-1",
    name: "Juan Santos",
    email: "juan@example.com",
    password: "password123",
    role: "resident",
    barangay: "Poblacion",
    profilePicture: null,
    bio: "Community volunteer",
    joinedDate: "2024-01-15",
    phoneNumber: "+63 9171234567",
  },
  {
    id: "user-2",
    name: "Maria Garcia",
    email: "maria@example.com",
    password: "password123",
    role: "resident",
    barangay: "San Vicente",
    profilePicture: null,
    bio: "Health worker",
    joinedDate: "2024-02-20",
    phoneNumber: "+63 9172345678",
  },
  {
    id: "user-3",
    name: "Admin User",
    email: "admin@example.com",
    password: "admin123",
    role: "barangay_admin",
    barangay: "Poblacion",
    profilePicture: null,
    bio: "Barangay Administrator",
    joinedDate: "2024-01-01",
    phoneNumber: "+63 9173456789",
  },
];

// Job Posts
export const JOBS = [
  {
    id: "job-1",
    title: "Construction Worker Needed",
    description:
      "We are looking for experienced construction workers for building renovation project",
    postedBy: "user-1",
    barangay: "Poblacion",
    salary: "15,000 - 20,000",
    jobType: "Full-time",
    company: "Build-Right Construction",
    postedDate: "2024-03-20",
    images: [],
    comments: 0,
    interested: 0,
  },
  {
    id: "job-2",
    title: "Part-time Teacher",
    description: "Teach English to students ages 5-12 in our learning center",
    postedBy: "user-2",
    barangay: "San Vicente",
    salary: "8,000 - 12,000",
    jobType: "Part-time",
    company: "Learning Hub Philippines",
    postedDate: "2024-03-19",
    images: [],
    comments: 0,
    interested: 0,
  },
];

// Help Requests
export const HELP_REQUESTS = [
  {
    id: "help-1",
    title: "Medical Assistance Needed",
    description:
      "Senior citizen needs financial help for medication and hospital bills",
    category: "medical",
    postedBy: "user-1",
    barangay: "Poblacion",
    urgency: "high",
    postedDate: "2024-03-21",
    images: [],
    responses: 0,
  },
  {
    id: "help-2",
    title: "Food Donation Drive",
    description: "Community food distribution for families in need",
    category: "food",
    postedBy: "user-2",
    barangay: "San Vicente",
    urgency: "medium",
    postedDate: "2024-03-20",
    images: [],
    responses: 0,
  },
];

// Lost Items
export const LOST_ITEMS = [
  {
    id: "lost-1",
    title: "Lost: Golden Retriever (Brown)",
    description:
      "Missing since March 19 near Poblacion Market. Very friendly dog.",
    postedBy: "user-1",
    barangay: "Poblacion",
    dateOfLoss: "2024-03-19",
    itemType: "pet",
    postedDate: "2024-03-19",
    images: [],
    responses: 0,
  },
];

// Found Items
export const FOUND_ITEMS = [
  {
    id: "found-1",
    title: "Found: Mobile Phone (iPhone 12)",
    description:
      "Found near San Vicente Church. Black iPhone with cracked screen. Owner can claim at barangay office.",
    postedBy: "user-2",
    barangay: "San Vicente",
    dateFound: "2024-03-20",
    itemType: "electronics",
    postedDate: "2024-03-20",
    images: [],
    responses: 0,
  },
];

// Emergency Alerts
export const EMERGENCIES = [
  {
    id: "emerg-1",
    title: "Traffic Accident - Main Road",
    description:
      "Major accident near Poblacion Market intersection. Multiple vehicles involved. Emergency services on the way.",
    severity: "critical",
    postedBy: "user-1",
    barangay: "Poblacion",
    location: "Poblacion Market, Main Road",
    timestamp: "2024-03-21T14:30:00Z",
    images: [],
    responses: 2,
    status: "Active",
  },
  {
    id: "emerg-2",
    title: "Medical Emergency - Resident Needs Help",
    description:
      "Elderly person experiencing chest pain. Needs immediate medical attention.",
    severity: "high",
    postedBy: "user-2",
    barangay: "San Vicente",
    location: "San Vicente Barangay Hall Area",
    timestamp: "2024-03-21T13:15:00Z",
    images: [],
    responses: 1,
    status: "Resolved",
  },
];

// Messages/Conversations
export const CONVERSATIONS = [
  {
    id: "conv-1",
    participants: ["user-1", "user-2"],
    lastMessage: "Are you interested in the job?",
    lastMessageTime: "2024-03-21T10:30:00Z",
    messages: [
      {
        id: "msg-1",
        senderId: "user-1",
        text: "Hi! I saw your help request",
        timestamp: "2024-03-20T15:00:00Z",
        image: null,
        read: true,
      },
      {
        id: "msg-2",
        senderId: "user-2",
        text: "Oh, thanks for reaching out!",
        timestamp: "2024-03-20T15:30:00Z",
        image: null,
        read: true,
      },
      {
        id: "msg-3",
        senderId: "user-1",
        text: "Are you interested in the job?",
        timestamp: "2024-03-21T10:30:00Z",
        image: null,
        read: false,
      },
    ],
  },
];

// Notifications
export const NOTIFICATIONS = [
  {
    id: "notif-1",
    userId: "user-1",
    type: "job_posted",
    title: "New Job Available",
    message: "Maria posted a new job opening: Part-time Teacher",
    read: false,
    timestamp: "2024-03-21T14:00:00Z",
  },
  {
    id: "notif-2",
    userId: "user-2",
    type: "message_received",
    title: "New Message",
    message: "Juan sent you a message",
    read: false,
    timestamp: "2024-03-21T10:30:00Z",
  },
];

// History/Activity Log
export const HISTORY = [
  {
    id: "hist-1",
    userId: "user-1",
    action: "created_job",
    details: { jobId: "job-1", jobTitle: "Construction Worker Needed" },
    timestamp: "2024-03-20T09:00:00Z",
  },
  {
    id: "hist-2",
    userId: "user-2",
    action: "created_help_request",
    details: { helpId: "help-2", title: "Food Donation Drive" },
    timestamp: "2024-03-20T10:30:00Z",
  },
  {
    id: "hist-3",
    userId: "user-1",
    action: "sent_message",
    details: { conversationId: "conv-1", recipientId: "user-2" },
    timestamp: "2024-03-20T15:00:00Z",
  },
];

// Admin Reports (for barangay admin dashboard)
export const ADMIN_REPORTS = [
  {
    id: "report-1",
    type: "user_activity",
    title: "Daily User Activity Summary",
    data: { activeUsers: 127, newPosts: 23, newMessages: 156 },
    generatedDate: "2024-03-21T00:00:00Z",
  },
  {
    id: "report-2",
    type: "emergency_log",
    title: "Emergency Alerts This Month",
    data: { total: 12, resolved: 10, pending: 2 },
    generatedDate: "2024-03-21T00:00:00Z",
  },
];

// Moderation Queue (for admin content management)
export const MODERATION_QUEUE = [
  {
    id: "mod-1",
    contentId: "job-1",
    contentType: "job",
    reason: "Potentially misleading salary information",
    status: "Pending",
    reportedDate: "2024-03-21T08:00:00Z",
  },
];
