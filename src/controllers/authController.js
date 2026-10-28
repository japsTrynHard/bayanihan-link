// Authentication Controller
// Handles login, logout, registration logic
import { USERS } from '../models/mockData';

export const authController = {
  login: (email, password) => {
    const user = USERS.find(u => u.email === email);
    if (user && user.password === password) {
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    }
    return { success: false, error: 'Invalid credentials' };
  },

  register: (email, name, password, barangay) => {
    const exists = USERS.find(u => u.email === email);
    if (exists) {
      return { success: false, error: 'Email already registered' };
    }
    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      password,
      role: 'resident',
      barangay,
      profilePicture: null,
      bio: '',
      joinedDate: new Date().toISOString().split('T')[0],
      phoneNumber: ''
    };
    USERS.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    return { success: true, user: userWithoutPassword };
  },

  validateSession: (user) => {
    return user && user.id;
  }
};

export default authController;
