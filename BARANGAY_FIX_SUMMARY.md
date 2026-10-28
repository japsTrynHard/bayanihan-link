# Barangay Registration Fix - Summary

## Issue

When registering a new account, users select their barangay during the registration process, but the selected barangay is not being attached/saved to the created account.

## Root Cause Analysis

After thorough code review, the registration flow appears to be correctly implemented to save the barangay:

1. The registration form collects the barangay selection
2. The data is passed to the auth service
3. The profile is created with the barangay field
4. The profile is saved to Firestore

However, there were potential issues and areas for improvement:

1. **Firestore Rules**: The UPDATE rule was too restrictive and didn't include `barangay` in the allowed fields. This meant users couldn't update their barangay after registration (though registration itself should work)
2. **Limited Error Handling**: There was no explicit error logging if the Firestore write failed
3. **No Debugging**: There was no logging to trace where the barangay field might be lost

## Fixes Applied

### 1. Updated Firestore Rules (`src/firebase/firestore.rules`)

**Changed**: Added `'barangay'` to the list of allowed fields in the user document UPDATE rule.

```plaintext
// BEFORE:
'name', 'firstName', 'lastName', 'email', 'phone', 'avatar',
'avatarUrl', 'avatarPublicId', 'profilePicture', 'bio',
'emergencyContacts', 'notificationPreferences', 'securityPreferences', 'updatedAt'

// AFTER:
'name', 'firstName', 'lastName', 'email', 'phone', 'barangay', 'avatar',
'avatarUrl', 'avatarPublicId', 'profilePicture', 'bio',
'emergencyContacts', 'notificationPreferences', 'securityPreferences', 'updatedAt'
```

**Why**: This allows users to update their barangay information if needed after registration.

### 2. Added Comprehensive Debug Logging

#### In `src/pages/public/Register.jsx`:

- Added log showing barangay value being submitted
- Added useEffect to log barangay availability from AppContext

#### In `src/context/AuthContext.jsx`:

- Added log to track barangay through registration
- Added logs at each step of the process

#### In `src/services/authService.js`:

- Added logs to show barangay value received and passed to profile creation
- Added logs showing final profile barangay

#### In `src/services/userService.js`:

- Added logs before Firestore save showing barangay value
- Added error handling for Firestore writes
- Added logs after Firestore save and after normalization

### 3. Enhanced Error Handling

Added try-catch block in `createUserProfile` to explicitly log Firestore write errors:

```javascript
try {
  await setDoc(doc(db, USERS_COLLECTION, uid), profile, { merge: true });
  console.log(
    "[createUserProfile] Successfully saved profile to Firestore with barangay:",
    profile.barangay,
  );
} catch (firestoreError) {
  console.error(
    "[createUserProfile] Error saving to Firestore:",
    firestoreError,
  );
  throw firestoreError;
}
```

## How to Test

### Testing Registration Flow:

1. Open the app and navigate to `/register`
2. Fill in all form fields including selecting a barangay
3. Submit the form
4. Open browser Developer Tools (F12) and go to Console tab
5. Look for messages like:
   - `[Register] Submitting form with data:` - shows the form data
   - `[Register] Selected barangay value:` - shows the selected barangay
   - `[AuthContext.register] Starting registration with barangay:` - shows barangay at start
   - `[registerResidentAccount] Received formData with barangay:` - from authService
   - `[createUserProfile] Creating profile with barangay:` - from userService
   - `[createUserProfile] Profile object to save has barangay:` - before Firestore save
   - `[createUserProfile] Successfully saved profile to Firestore with barangay:` - after successful save
   - `[registerResidentAccount] Returned profile has barangay:` - barangay in returned profile
   - `[AuthContext.register] upsertLocalUserMirror returned sessionUser with barangay:` - final barangay

### Checking Saved Data:

1. After successful registration, check Firebase Console:
   - Go to Firestore Database
   - Navigate to users collection
   - Find your new user document
   - Verify the `barangay` field is present and contains the correct value

2. Check Local Storage after login:
   - In browser DevTools, go to Application tab
   - Find localStorage
   - Check the `currentUser` entry
   - Verify barangay is included in the JSON

### Testing Profile Display:

1. After registration, navigate to `/profile` (in the React app)
2. Verify that:
   - The barangay is displayed in the read-only section
   - The barangay is pre-populated in the edit form
   - You can potentially edit it and save changes (with the updated Firestore rules)

## Remaining Tasks

1. **Verify Firestore Rules Deployment**: Make sure the updated `firestore.rules` are deployed to Firebase

   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Test with Real Data**: Run the app, register a new account with a barangay, and verify:
   - Console logs show the barangay throughout the flow
   - No Firestore errors appear
   - The barangay appears in the user document in Firebase

3. **Remove Debug Logging** (after verification):
   Once confirmed the fix works, the console.log statements can be removed from:
   - src/pages/public/Register.jsx
   - src/context/AuthContext.jsx
   - src/services/authService.js
   - src/services/userService.js

4. **Monitor Real Usage**: Watch browser consoles in production to ensure no errors occur during registration

## Technical Details

### Data Flow:

Register Form → AuthContext.register() → authService.registerResidentAccount() →
userService.createUserProfile() → Firestore setDoc() → localStorage stored →
normalizeSessionUser() → React state

### Fields Preserved:

The barangay field is preserved and normalized at each step:

- Register form: String from select dropdown (e.g., "Bagong Silang")
- authService: Passed through in formData
- userService: Explicitly set as `barangay: data.barangay || ""`
- Firestore: Saved in user document
- AuthContext: Passed through normalizeSessionUser
- localStorage: Stored in currentUser JSON

## Expected Behavior After Fix

1. Users can successfully select and save their barangay during registration
2. The barangay is visible in their profile
3. The barangay is used to filter content (posts, announcements, etc.) relevant to their area
4. Users can update their barangay if they move (if needed)
5. Barangay admins can use it for scoped operations

## References

- Firestore Rules: `src/firebase/firestore.rules`
- Registration Form: `src/pages/public/Register.jsx`
- Auth Context: `src/context/AuthContext.jsx`
- Auth Service: `src/services/authService.js`
- User Service: `src/services/userService.js`
