export const LOST_FOUND_CASE_TYPES = {
  ITEM: "item",
  PET: "pet",
  PERSON: "person",
};

export const LOST_FOUND_CASE_TYPE_OPTIONS = [
  {
    key: LOST_FOUND_CASE_TYPES.ITEM,
    label: "Item",
    lostLabel: "Lost Item",
    foundLabel: "Found Item",
    lostAction: "I lost an item",
    foundAction: "Chat with the owner",
    lostHint: "Wallets, IDs, phones, bags, keys, school items, and valuables.",
    foundHint: "Post safely and require proof before handover.",
  },
  {
    key: LOST_FOUND_CASE_TYPES.PET,
    label: "Pet",
    lostLabel: "Missing Pet",
    foundLabel: "Found Pet",
    lostAction: "My pet is missing",
    foundAction: "Chat with the owner",
    lostHint: "Dogs, cats, or other pets. Add last-seen place and distinguishing marks.",
    foundHint: "Share safe location details and contact the owner quickly.",
  },
  {
    key: LOST_FOUND_CASE_TYPES.PERSON,
    label: "Person",
    lostLabel: "Missing Person",
    foundLabel: "Person Sighting / Information",
    lostAction: "Report missing person",
    foundAction: "I have person information",
    lostHint: "Priority barangay-admin case. Public details must stay privacy-safe.",
    foundHint: "Send sighting or information to the handler barangay; no public claiming.",
  },
];

const normalize = (value = "") => String(value || "").trim().toLowerCase();

export const getLostFoundCaseType = (post = {}) => {
  const direct = normalize(post.caseType || post.lostFoundCaseType || post.kind || post.subjectType);
  if (Object.values(LOST_FOUND_CASE_TYPES).includes(direct)) return direct;

  const categoryBlob = normalize(`${post.category || ""} ${post.title || ""} ${post.description || ""}`);
  if (/missing person|person sighting|sighting|senior|child|kid|bata|matanda|tao|person/.test(categoryBlob)) {
    return LOST_FOUND_CASE_TYPES.PERSON;
  }
  if (/pet|dog|cat|puppy|kitten|aso|pusa|animal/.test(categoryBlob)) {
    return LOST_FOUND_CASE_TYPES.PET;
  }
  return LOST_FOUND_CASE_TYPES.ITEM;
};

export const getLostFoundCaseOption = (post = {}) =>
  LOST_FOUND_CASE_TYPE_OPTIONS.find((item) => item.key === getLostFoundCaseType(post)) || LOST_FOUND_CASE_TYPE_OPTIONS[0];

export const isMissingPersonCase = (post = {}) => getLostFoundCaseType(post) === LOST_FOUND_CASE_TYPES.PERSON;
export const isPetCase = (post = {}) => getLostFoundCaseType(post) === LOST_FOUND_CASE_TYPES.PET;

export const getLostFoundCaseLabel = (post = {}) => {
  const option = getLostFoundCaseOption(post);
  return post.type === "found" ? option.foundLabel : option.lostLabel;
};

export const getLostFoundSubjectLabel = (post = {}) => {
  const caseType = getLostFoundCaseType(post);
  if (caseType === LOST_FOUND_CASE_TYPES.PERSON) return "person";
  if (caseType === LOST_FOUND_CASE_TYPES.PET) return "pet";
  return "item";
};

export const getLostFoundPrimaryActionLabel = (post = {}, alreadyResponded = false) => {
  if (alreadyResponded) return "Responded";
  const caseType = getLostFoundCaseType(post);
  if (caseType === LOST_FOUND_CASE_TYPES.PERSON) return "Chat Now";
  if (caseType === LOST_FOUND_CASE_TYPES.PET) return "Chat Now";
  return "Chat Now";
};

export const getLostFoundResponseText = (post = {}, proof = "") => {
  const safeProof = String(proof || "").trim();
  const caseType = getLostFoundCaseType(post);
  if (caseType === LOST_FOUND_CASE_TYPES.PERSON) {
    return `I have information about this missing-person case. Details: ${safeProof || "Will coordinate privately with the reporter/admin."}`;
  }
  if (caseType === LOST_FOUND_CASE_TYPES.PET) {
    return post.type === "found"
      ? `This may be my pet. Proof/details: ${safeProof || "Will share identifying details in chat."}`
      : `Chat request for this missing pet case. Details: ${safeProof || "Will share location details in chat."}`;
  }
  return post.type === "found"
    ? `This may be mine. Proof: ${safeProof || "Proof will be shared in chat."}`
    : `Chat request for this lost item case. Details: ${safeProof || "Will coordinate through chat."}`;
};

export const getLostFoundSafetyNotice = (caseType = LOST_FOUND_CASE_TYPES.ITEM) => {
  if (caseType === LOST_FOUND_CASE_TYPES.PERSON) {
    return "Missing-person cases are privacy-sensitive. Do not post full address, school ID, phone number, or private family details publicly. Barangay admin should verify sightings first.";
  }
  if (caseType === LOST_FOUND_CASE_TYPES.PET) {
    return "For pets, include safe last-seen landmarks and identifying marks. Avoid handing over the pet without proof from the owner.";
  }
  return "For items, hide private identifiers and require proof before handover.";
};

export const getLostFoundStatusOptions = (post = {}) => {
  const caseType = getLostFoundCaseType(post);
  if (caseType === LOST_FOUND_CASE_TYPES.PERSON) {
    return ["Active", "Information Verified", "Reunited", "Closed", "Flagged"];
  }
  if (caseType === LOST_FOUND_CASE_TYPES.PET) {
    return ["Active", "Claimed", "Reunited", "Closed", "Flagged"];
  }
  return ["Active", "Claimed", "Returned", "Closed", "Flagged"];
};

export const getLostFoundResolvedStatus = (post = {}) => {
  const caseType = getLostFoundCaseType(post);
  if (caseType === LOST_FOUND_CASE_TYPES.PERSON || caseType === LOST_FOUND_CASE_TYPES.PET) return "Reunited";
  return "Returned";
};

export const getLostFoundAdminPrimaryVerb = (post = {}) => {
  const caseType = getLostFoundCaseType(post);
  if (caseType === LOST_FOUND_CASE_TYPES.PERSON) return "Verify Information";
  if (caseType === LOST_FOUND_CASE_TYPES.PET) return "Mark Reunited";
  return "Confirm Return";
};
