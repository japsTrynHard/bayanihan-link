const clean = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim();

const words = (value = "") =>
  clean(value)
    .split(/[^a-z0-9ñáéíóúü]+/i)
    .filter((word) => word.length >= 3);

export const getJobWorkBarangay = (job = {}) => {
  if (job.isAllBarangays) return "All San Miguel";
  return (
    job.workBarangay ||
    job.jobBarangay ||
    job.serviceBarangay ||
    job.handlerBarangay ||
    job.barangay ||
    ""
  );
};

export const getJobHomeBarangay = (job = {}) =>
  job.homeBarangay ||
  job.authorBarangay ||
  job.author?.barangay ||
  job.userBarangay ||
  job.residentBarangay ||
  job.barangay ||
  "";

export const getJobCoverageBarangays = (job = {}) => {
  if (job.isAllBarangays) {
    // Dapat makuha ang lahat ng barangay (galing sa context o i-store sa post)
    return job.coverageBarangays || []; // Assume coverageBarangays ay lahat ng barangay
  }
  const coverage = Array.isArray(job.coverageBarangays)
    ? job.coverageBarangays
    : [];
  return Array.from(
    new Set([getJobWorkBarangay(job), ...coverage].filter(Boolean)),
  );
};

export const getJobRouteLabel = (job = {}) => {
  if (job.isAllBarangays) return "All San Miguel (community-wide)";
  const homeBarangay = getJobHomeBarangay(job);
  const workBarangay = getJobWorkBarangay(job);
  if (homeBarangay && workBarangay && homeBarangay !== workBarangay) {
    return `${homeBarangay} → ${workBarangay}`;
  }
  return workBarangay || homeBarangay || "Barangay not set";
};

export const getJobAdminRole = (job = {}, admin = {}) => {
  const adminBarangay = admin?.barangay || "";
  const workBarangay = getJobWorkBarangay(job);
  const homeBarangay = getJobHomeBarangay(job);
  const supportBarangays = Array.isArray(job.supportBarangays)
    ? job.supportBarangays
    : [];

  if (adminBarangay && workBarangay && adminBarangay === workBarangay) {
    return {
      label: "Primary Handler",
      variant: "success",
      canModerate: true,
      helper:
        "This barangay handles moderation because the work location/service area is here.",
    };
  }

  if (
    adminBarangay &&
    (adminBarangay === homeBarangay || supportBarangays.includes(adminBarangay))
  ) {
    return {
      label: "Support Visibility",
      variant: "secondary",
      canModerate: false,
      helper:
        "This resident is from your barangay, but the work-location barangay handles official moderation.",
    };
  }

  return {
    label: "Viewer",
    variant: "secondary",
    canModerate: false,
    helper: "You can view limited context only.",
  };
};

export const getJobFitScore = (job = {}, currentUser = {}, allJobs = []) => {
  if (!job || job.type !== "job") return null;
  if (job.author?.id && currentUser?.id && job.author.id === currentUser.id)
    return null;
  if (["Closed", "Removed", "Flagged"].includes(job.status)) return null;

  const reasons = [];
  let score = 35;
  const workBarangay = getJobWorkBarangay(job);
  const homeBarangay = getJobHomeBarangay(job);
  const coverageBarangays = getJobCoverageBarangays(job);

  if (
    workBarangay &&
    currentUser?.barangay &&
    workBarangay === currentUser.barangay
  ) {
    score += 22;
    reasons.push("Work is in your barangay");
  } else if (coverageBarangays.includes(currentUser?.barangay)) {
    score += 16;
    reasons.push("Within your coverage area");
  } else if (
    homeBarangay &&
    currentUser?.barangay &&
    homeBarangay === currentUser.barangay
  ) {
    score += 10;
    reasons.push("Posted by your barangay resident");
  }

  if (job.isCrossBarangay) {
    score += 5;
    reasons.push("Cross-barangay opportunity");
  }

  if ((job.opportunityType || "hiring") === "hiring") {
    score += 15;
    reasons.push("Hiring post");
  }

  const userSeekingPosts = allJobs.filter(
    (item) =>
      item.type === "job" &&
      item.opportunityType === "seeking" &&
      item.author?.id === currentUser?.id,
  );

  const userCategories = new Set(
    userSeekingPosts.map((item) => clean(item.category)).filter(Boolean),
  );
  if (userCategories.has(clean(job.category))) {
    score += 18;
    reasons.push(`Matches your ${job.category} interest`);
  }

  const text = `${job.title || ""} ${job.description || ""} ${job.requirements || ""}`;
  const jobWords = new Set(words(text));
  const ownWords = new Set(
    words(
      userSeekingPosts
        .map((item) => `${item.title} ${item.description}`)
        .join(" "),
    ),
  );
  const sharedWords = [...ownWords].filter((word) => jobWords.has(word));
  if (sharedWords.length) {
    score += Math.min(14, sharedWords.length * 4);
    reasons.push("Similar skills/keywords");
  }

  if (clean(job.requirements).includes("no experience")) {
    score += 8;
    reasons.push("No experience needed");
  }

  const createdAt = new Date(job.createdAt || job.updatedAt || 0).getTime();
  if (
    !Number.isNaN(createdAt) &&
    Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000
  ) {
    score += 5;
    reasons.push("Recent post");
  }

  const percentage = Math.min(98, Math.max(0, Math.round(score)));
  if (percentage < 55) return null;

  return {
    percentage,
    label:
      percentage >= 80
        ? "Strong fit"
        : percentage >= 65
          ? "Good fit"
          : "Possible fit",
    reasons: reasons.slice(0, 3),
  };
};

export const getTopJobMatches = (jobs = [], currentUser = {}, limit = 3) =>
  jobs
    .map((job) => ({ job, fit: getJobFitScore(job, currentUser, jobs) }))
    .filter((item) => item.fit)
    .sort((a, b) => b.fit.percentage - a.fit.percentage)
    .slice(0, limit);
