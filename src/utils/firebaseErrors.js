export function getFriendlyFirebaseError(error) {
  const code = error?.code || "";

  const messages = {
    "auth/email-already-in-use": "Email is already registered. Please use another email or sign in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/invalid-credential": "Wrong email/username or password. Please check your credentials and try again.",
    "INVALID_LOGIN_CREDENTIALS": "Wrong email/username or password. Please check your credentials and try again.",
    "INVALID_PASSWORD": "Wrong email/username or password. Please check your credentials and try again.",
    "EMAIL_NOT_FOUND": "No account was found for those credentials.",
    "ADMIN_USERNAME_NOT_FOUND": "No administrator account was found for those credentials.",
    "ADMIN_WRONG_PASSWORD": "Wrong username or password. Please check the assigned credentials and try again.",
    "TOO_MANY_ATTEMPTS_TRY_LATER": "Too many attempts. Please wait a moment and try again.",
    "auth/user-not-found": "No account was found with that email.",
    "auth/wrong-password": "Wrong email/username or password. Please check your credentials and try again.",
    "auth/weak-password": "Password is too weak. Use at least 8 characters with letters and numbers.",
    "auth/requires-recent-login": "For security, please log out, log in again, then retry this change.",
    "auth/invalid-login-credentials": "Wrong current password. Please check your password and try again.",
    "AUTH_NO_ACTIVE_USER": "No active Firebase account was found for this security change.",
    "AUTH_WEAK_LOCAL_PASSWORD": "New password must be at least 8 characters.",
    "auth/network-request-failed": "Network error. Please check your internet connection.",
    "auth/operation-not-allowed": "Email/Password sign-in is not enabled yet in Firebase Authentication.",
    "OPERATION_NOT_ALLOWED": "Email/Password sign-in is not enabled yet in Firebase Authentication.",
    "permission-denied": "You do not have permission to perform this action.",
    "unavailable": "Firebase is temporarily unavailable. Please try again.",
  };

  return messages[code] || error?.message || "Something went wrong. Please try again.";
}
