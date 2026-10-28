const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const clean = normalizeText;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "near",
  "item",
  "lost",
  "found",
  "this",
  "that",
  "from",
  "owner",
  "please",
  "barangay",
  "ako",
  "ang",
  "may",
  "mga",
  "nasa",
  "yung",
  "iyong",
  "ko",
  "po",
  "sa",
  "ng",
  "na",
  "at",
]);

const words = (value = "") =>
  clean(value)
    .split(/[^a-z0-9ñ]+/i)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

const uniqueWords = (value = "") => [...new Set(words(value))];

const BARANGAY_ROUTE_GROUPS = [
  ["Poblacion", "San Jose", "San Juan", "San Vicente", "Santa Rita Bata", "Santa Rita Matanda"],
  ["Balaong", "Bantog", "Bardias", "Baritan", "Batasan Bata", "Batasan Matanda"],
  ["Biak-na-Bato", "Camias", "Sibul", "Tartaro", "Tibagan", "Sacdalan"],
  ["Bagong Silang", "Bagong Pag-asa", "Buliran", "Maligaya", "Pulong Bayabas", "Pulong Duhat"],
  ["Balite", "Biclat", "Buga", "Bulualto", "Calumpang", "Cambio"],
  ["Ilog-Bulo", "King Kabayo", "Labne", "Lambakin", "Magmarale", "Malibay", "Mandile"],
  ["Masalipit", "Pacalag", "Paliwasan", "Partida", "Pinambaran", "Salacot", "Salangan"],
  ["San Agustin", "Santa Ines", "Santa Lucia", "Sapang", "Tigpalas"],
];

const sameBarangayName = (first = "", second = "") => clean(first) === clean(second) && Boolean(clean(first));

const findRouteGroup = (barangay = "") => {
  const normalized = clean(barangay);
  if (!normalized) return [];
  return BARANGAY_ROUTE_GROUPS.find((group) => group.some((item) => clean(item) === normalized)) || [];
};

export const areNearbyBarangays = (first = "", second = "") => {
  if (!first || !second || sameBarangayName(first, second)) return false;
  const firstGroup = findRouteGroup(first).map(clean);
  const secondName = clean(second);
  return firstGroup.length > 0 && firstGroup.includes(secondName);
};

export const getLostFoundHomeBarangay = (post = {}) =>
  post.homeBarangay || post.authorBarangay || post.author?.barangay || post.userBarangay || post.residentBarangay || post.barangay || "";

export const getLostFoundIncidentBarangay = (post = {}) =>
  post.incidentBarangay || post.itemBarangay || post.locationBarangay || post.barangay || getLostFoundHomeBarangay(post) || "";


export const getLostFoundCaseType = (post = {}) => {
  const direct = String(post.caseType || post.lostFoundCaseType || post.kind || post.subjectType || "").toLowerCase();
  if (["item", "pet", "person"].includes(direct)) return direct;
  const blob = clean(`${post.category || ""} ${post.title || ""} ${post.description || ""}`);
  if (/missing person|person sighting|sighting|senior|child|kid|bata|matanda|tao|person/.test(blob)) return "person";
  if (/pet|dog|cat|puppy|kitten|aso|pusa|animal/.test(blob)) return "pet";
  return "item";
};

export const isCrossBarangayPost = (post = {}) => {
  const home = getLostFoundHomeBarangay(post);
  const incident = getLostFoundIncidentBarangay(post);
  return Boolean(home && incident && !sameBarangayName(home, incident));
};

export const getLostFoundRouteText = (post = {}) => {
  const home = getLostFoundHomeBarangay(post) || "Unknown barangay";
  const incident = getLostFoundIncidentBarangay(post) || home;
  if (isCrossBarangayPost(post)) return `Resident from ${home} • Happened in ${incident}`;
  return `Happened in ${incident}`;
};

const getDateValue = (post = {}) => {
  const raw = post.itemDate || post.dateLost || post.dateFound || post.createdAt || "";
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const displayDate = String(raw).split("•")[0]?.trim();
  const parsedDisplay = new Date(displayDate);
  return Number.isNaN(parsedDisplay.getTime()) ? null : parsedDisplay;
};

const dayDistance = (a, b) => {
  const first = getDateValue(a);
  const second = getDateValue(b);
  if (!first || !second) return null;
  return Math.abs(first.getTime() - second.getTime()) / (24 * 60 * 60 * 1000);
};

const textSimilarity = (firstValue = "", secondValue = "") => {
  const first = uniqueWords(firstValue);
  const second = uniqueWords(secondValue);
  if (!first.length || !second.length) return { ratio: 0, shared: [] };

  const secondSet = new Set(second);
  const shared = first.filter((word) => secondSet.has(word));
  const union = new Set([...first, ...second]);
  return {
    ratio: shared.length / Math.max(1, union.size),
    shared,
  };
};

const hasFieldMatch = (sourceValue, candidateValue) => {
  const source = clean(sourceValue);
  const candidate = clean(candidateValue);
  if (!source || !candidate) return false;
  return source === candidate || source.includes(candidate) || candidate.includes(source);
};

const getSearchBlob = (post = {}) =>
  [
    post.title,
    post.description,
    post.caseType,
    post.lostFoundCaseType,
    post.category,
    post.color,
    post.brand,
    post.uniqueDetails,
    post.reward,
    post.itemPlace,
    post.placeLost,
    post.placeFound,
    post.barangay,
    post.incidentBarangay,
    post.itemBarangay,
    post.homeBarangay,
    post.author?.barangay,
    ...(Array.isArray(post.imageTags) ? post.imageTags : []),
  ]
    .filter(Boolean)
    .join(" ");

export const getLostFoundMatchLabel = (percentage = 0) => {
  if (percentage >= 85) return "Strong Match";
  if (percentage >= 65) return "Possible Match";
  if (percentage >= 45) return "Weak Match";
  return "Low Match";
};

export const getLostFoundMatchVariant = (percentage = 0) => {
  if (percentage >= 85) return "success";
  if (percentage >= 65) return "warning";
  if (percentage >= 45) return "secondary";
  return "default";
};

export const getLostFoundMatchScore = (source = {}, candidate = {}) => {
  if (!source?.id || !candidate?.id || source.id === candidate.id) return null;
  if (!["lost", "found"].includes(source.type) || !["lost", "found"].includes(candidate.type)) return null;
  if (source.type === candidate.type) return null;
  if (getLostFoundCaseType(source) !== getLostFoundCaseType(candidate)) return null;
  if ((source.status || "Active") !== "Active" || (candidate.status || "Active") !== "Active") return null;

  const reasons = [];
  let score = 0;

  const sourceIncidentBarangay = getLostFoundIncidentBarangay(source);
  const candidateIncidentBarangay = getLostFoundIncidentBarangay(candidate);
  const sourceHomeBarangay = getLostFoundHomeBarangay(source);
  const candidateHomeBarangay = getLostFoundHomeBarangay(candidate);

  if (sameBarangayName(sourceIncidentBarangay, candidateIncidentBarangay)) {
    score += 25;
    reasons.push(`Same incident barangay: ${sourceIncidentBarangay}`);
  } else if (areNearbyBarangays(sourceIncidentBarangay, candidateIncidentBarangay)) {
    score += 12;
    reasons.push(`Nearby barangay route: ${sourceIncidentBarangay} ↔ ${candidateIncidentBarangay}`);
  }

  if (sameBarangayName(sourceHomeBarangay, candidateHomeBarangay)) {
    score += 6;
    reasons.push("Same resident home barangay");
  }

  if (isCrossBarangayPost(source) || isCrossBarangayPost(candidate)) {
    score += 3;
    reasons.push("Cross-barangay routing checked");
  }

  if (hasFieldMatch(source.category, candidate.category)) {
    score += 15;
    reasons.push(`Same category: ${source.category || candidate.category}`);
  }

  if (hasFieldMatch(source.color, candidate.color)) {
    score += 12;
    reasons.push(`Same color: ${source.color || candidate.color}`);
  }

  if (hasFieldMatch(source.brand, candidate.brand)) {
    score += 10;
    reasons.push(`Same brand/model: ${source.brand || candidate.brand}`);
  }

  const sourcePlace = source.itemPlace || source.placeLost || source.placeFound;
  const candidatePlace = candidate.itemPlace || candidate.placeLost || candidate.placeFound;
  const placeSimilarity = textSimilarity(sourcePlace, candidatePlace);
  if (hasFieldMatch(sourcePlace, candidatePlace)) {
    score += 20;
    reasons.push("Similar place or landmark");
  } else if (placeSimilarity.shared.length) {
    score += Math.min(14, placeSimilarity.shared.length * 4);
    reasons.push(`Shared landmark word: ${placeSimilarity.shared.slice(0, 2).join(", ")}`);
  }

  const days = dayDistance(source, candidate);
  if (days !== null) {
    if (days <= 1) {
      score += 18;
      reasons.push("Date is within 1 day");
    } else if (days <= 3) {
      score += 12;
      reasons.push("Date is within 3 days");
    } else if (days <= 7) {
      score += 6;
      reasons.push("Date is within 1 week");
    }
  }

  const titleSimilarity = textSimilarity(source.title, `${candidate.title} ${candidate.description}`);
  if (titleSimilarity.shared.length) {
    score += Math.min(16, 6 + titleSimilarity.shared.length * 4);
    reasons.push(`Similar item keywords: ${titleSimilarity.shared.slice(0, 3).join(", ")}`);
  }

  const detailSimilarity = textSimilarity(
    `${source.description || ""} ${source.uniqueDetails || ""}`,
    getSearchBlob(candidate),
  );
  if (detailSimilarity.shared.length) {
    score += Math.min(12, detailSimilarity.shared.length * 3);
    reasons.push("Description has matching details");
  }

  const imageSimilarity = textSimilarity(
    (source.imageTags || []).join(" "),
    (candidate.imageTags || []).join(" "),
  );
  if (imageSimilarity.shared.length) {
    score += Math.min(8, imageSimilarity.shared.length * 4);
    reasons.push("Photo tags look related");
  }

  const proofBoost = source.requiresProof || candidate.requiresProof ? 2 : 0;
  score += proofBoost;

  const percentage = Math.min(96, Math.max(0, Math.round(score)));
  if (percentage < 35) return null;

  return {
    sourceId: source.id,
    candidateId: candidate.id,
    percentage,
    label: getLostFoundMatchLabel(percentage),
    variant: getLostFoundMatchVariant(percentage),
    reasons: reasons.slice(0, 5),
    candidate,
  };
};

export const getTopLostFoundMatches = (source = {}, posts = [], limit = 3) =>
  posts
    .map((candidate) => getLostFoundMatchScore(source, candidate))
    .filter(Boolean)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit);

export const getLostFoundCompleteness = (post = {}) => {
  const checks = [
    Boolean(post.type),
    Boolean(String(post.title || "").trim()),
    Boolean(String(post.description || "").trim()),
    Boolean(post.category),
    Boolean(post.color),
    Boolean(post.itemDate || post.dateLost || post.dateFound),
    Boolean(post.itemPlace || post.placeLost || post.placeFound),
    Boolean(getLostFoundIncidentBarangay(post)),
    !isCrossBarangayPost(post) || Boolean(getLostFoundHomeBarangay(post)),
    Array.isArray(post.images) ? post.images.length > 0 : Boolean(post.image || post.photo),
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
};

export const getLostFoundQualityTips = (post = {}, allPosts = []) => {
  const tips = [];
  const title = String(post.title || "").trim();
  const description = String(post.description || "").trim();
  const duplicateWords = uniqueWords(`${post.title || ""} ${post.itemPlace || ""}`);

  if (!post.category) tips.push("Choose a category so matching becomes more accurate.");
  if (getLostFoundCaseType(post) === "person") tips.push("Missing-person safety: keep sensitive details private and let admin verify sightings.");
  if (!post.color) tips.push("Add the main color for easier verification.");
  if (title.length < 6) tips.push("Use a clearer title like 'Black wallet near barangay hall'.");
  if (description.length < 20) tips.push("Add safe details like color, marks, and last seen area.");
  if (!post.itemPlace && !post.placeLost && !post.placeFound) tips.push("Add a landmark or exact public area.");
  if (!getLostFoundIncidentBarangay(post)) tips.push("Choose the barangay where the item was lost or found.");
  if (!post.itemDate && !post.dateLost && !post.dateFound) tips.push("Add the lost/found date.");
  if (!post.requiresProof && post.type === "found") tips.push("Turn on proof requirement to prevent fake claims.");
  if (isCrossBarangayPost(post)) tips.push("Cross-barangay case: incident barangay admin should handle verification.");

  const possibleDuplicate = allPosts.some((candidate) => {
    if (!candidate?.id || candidate.id === post.id || candidate.type !== post.type) return false;
    const shared = duplicateWords.filter((word) => getSearchBlob(candidate).toLowerCase().includes(word));
    return shared.length >= 3 && candidate.author?.id === post.author?.id;
  });

  if (possibleDuplicate) tips.push("Possible duplicate: you may have posted a similar item already.");
  return tips.slice(0, 4);
};
