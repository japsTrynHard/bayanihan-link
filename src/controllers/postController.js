// Post Controller
// Handles creation, updates, deletion of all post types

import { JOBS, HELP_REQUESTS, LOST_ITEMS, FOUND_ITEMS, EMERGENCIES } from '../models/mockData';

export const postController = {
  // Job Posts
  createJob: (jobData) => {
    const newJob = {
      id: `job-${Date.now()}`,
      ...jobData,
      postedDate: new Date().toISOString().split('T')[0],
      images: jobData.images || [],
      comments: 0,
      interested: 0
    };
    JOBS.push(newJob);
    return { success: true, job: newJob };
  },

  updateJob: (jobId, updates) => {
    const job = JOBS.find(j => j.id === jobId);
    if (job) {
      Object.assign(job, updates);
      return { success: true, job };
    }
    return { success: false, error: 'Job not found' };
  },

  deleteJob: (jobId) => {
    const index = JOBS.findIndex(j => j.id === jobId);
    if (index > -1) {
      JOBS.splice(index, 1);
      return { success: true };
    }
    return { success: false, error: 'Job not found' };
  },

  getJobs: (filters = {}) => {
    let jobs = [...JOBS];
    if (filters.barangay) {
      jobs = jobs.filter(j => j.barangay === filters.barangay);
    }
    if (filters.search) {
      const query = filters.search.toLowerCase();
      jobs = jobs.filter(j => 
        j.title.toLowerCase().includes(query) ||
        j.description.toLowerCase().includes(query)
      );
    }
    return jobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  },

  // Help Requests
  createHelpRequest: (helpData) => {
    const newHelp = {
      id: `help-${Date.now()}`,
      ...helpData,
      postedDate: new Date().toISOString().split('T')[0],
      images: helpData.images || [],
      responses: 0
    };
    HELP_REQUESTS.push(newHelp);
    return { success: true, help: newHelp };
  },

  getHelpRequests: (filters = {}) => {
    let requests = [...HELP_REQUESTS];
    if (filters.barangay) {
      requests = requests.filter(h => h.barangay === filters.barangay);
    }
    if (filters.urgency) {
      requests = requests.filter(h => h.urgency === filters.urgency);
    }
    return requests.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  },

  // Lost Items
  createLostItem: (itemData) => {
    const newLost = {
      id: `lost-${Date.now()}`,
      ...itemData,
      postedDate: new Date().toISOString().split('T')[0],
      images: itemData.images || [],
      responses: 0
    };
    LOST_ITEMS.push(newLost);
    return { success: true, item: newLost };
  },

  getLostItems: (barangay = null) => {
    let items = [...LOST_ITEMS];
    if (barangay) {
      items = items.filter(i => i.barangay === barangay);
    }
    return items.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  },

  // Found Items
  createFoundItem: (itemData) => {
    const newFound = {
      id: `found-${Date.now()}`,
      ...itemData,
      postedDate: new Date().toISOString().split('T')[0],
      images: itemData.images || [],
      responses: 0
    };
    FOUND_ITEMS.push(newFound);
    return { success: true, item: newFound };
  },

  getFoundItems: (barangay = null) => {
    let items = [...FOUND_ITEMS];
    if (barangay) {
      items = items.filter(i => i.barangay === barangay);
    }
    return items.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  },

  // Emergencies
  createEmergency: (emergencyData) => {
    const newEmergency = {
      id: `emerg-${Date.now()}`,
      ...emergencyData,
      timestamp: new Date().toISOString(),
      images: emergencyData.images || [],
      responses: 0,
      status: 'Active'
    };
    EMERGENCIES.push(newEmergency);
    return { success: true, emergency: newEmergency };
  },

  getEmergencies: (barangay = null, onlyActive = true) => {
    let emergencies = [...EMERGENCIES];
    if (barangay) {
      emergencies = emergencies.filter(e => e.barangay === barangay);
    }
    if (onlyActive) {
      emergencies = emergencies.filter(e => e.status === 'Active');
    }
    return emergencies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  updateEmergencyStatus: (emergencyId, status) => {
    const emergency = EMERGENCIES.find(e => e.id === emergencyId);
    if (emergency) {
      emergency.status = status;
      return { success: true, emergency };
    }
    return { success: false, error: 'Emergency not found' };
  }
};

export default postController;
