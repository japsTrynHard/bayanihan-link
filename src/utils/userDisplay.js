export const getFirstName = (user, fallback = "User") => {
  if (!user) return fallback;
  const firstName = String(user.firstName || "").trim();
  if (firstName) return firstName;

  const fullName = String(user.name || user.displayName || "").trim();
  if (fullName) return fullName.split(/\s+/)[0];

  const email = String(user.email || "").trim();
  if (email) return email.split("@")[0];

  return fallback;
};

export const getFullName = (user, fallback = "User") => {
  if (!user) return fallback;
  const firstName = String(user.firstName || "").trim();
  const lastName = String(user.lastName || "").trim();
  const combined = `${firstName} ${lastName}`.trim();
  return combined || user.name || user.displayName || fallback;
};
