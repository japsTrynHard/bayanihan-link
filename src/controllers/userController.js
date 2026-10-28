// User Controller
// Handles user profile management, updates, and queries

import { USERS, HISTORY } from '../models/mockData';

export const userController = {
  getUserById: (userId) => {
    const user = USERS.find(u => u.id === userId);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  },

  updateUserProfile: (userId, updates) => {
    const user = USERS.find(u => u.id === userId);
    if (user) {
      // Don't allow password change through this method
      const { password, ...safeUpdates } = updates;
      Object.assign(user, safeUpdates);
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    }
    return { success: false, error: 'User not found' };
  },

  updateProfilePicture: (userId, pictureData) => {
    const user = USERS.find(u => u.id === userId);
    if (user) {
      user.profilePicture = pictureData;
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    }
    return { success: false, error: 'User not found' };
  },

  getUsersByBarangay: (barangay) => {
    return USERS
      .filter(u => u.barangay === barangay && u.role === 'resident')
      .map(u => {
        const { password: _, ...userWithoutPassword } = u;
        return userWithoutPassword;
      });
  },

  getAllResidents: () => {
    return USERS
      .filter(u => u.role === 'resident')
      .map(u => {
        const { password: _, ...userWithoutPassword } = u;
        return userWithoutPassword;
      });
  },

  getAllUsers: () => {
    return USERS.map(u => {
      const { password: _, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
  },

  getUserHistory: (userId) => {
    return HISTORY.filter(h => h.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  addHistoryEntry: (userId, action, details = {}) => {
    const historyEntry = {
      id: `hist-${Date.now()}`,
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    HISTORY.push(historyEntry);
    return historyEntry;
  },

  searchUsers: (query) => {
    return USERS
      .filter(u => 
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.barangay.toLowerCase().includes(query.toLowerCase())
      )
      .map(u => {
        const { password: _, ...userWithoutPassword } = u;
        return userWithoutPassword;
      });
  }
};

export default userController;
