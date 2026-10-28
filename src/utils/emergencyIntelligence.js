const criticalTypes = new Set(["fire", "medical emergency", "missing person"]);
const highRiskWords = ["injured", "dugo", "bata", "matanda", "sunog", "nasusunog", "critical", "armed", "baril", "kutsilyo", "accident", "bangga"];

const clean = (value = "") => String(value || "").toLowerCase().trim();

const getEmergencyTime = (item = {}) => {
  const raw = item.createdAt || item.timestamp || "";
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const scoreEmergencySeverity = (data = {}) => {
  let score = 40;
  const reasons = [];
  const type = clean(data.emergencyType);
  const text = clean(`${data.title} ${data.description} ${data.locationDetails}`);

  if (criticalTypes.has(type)) {
    score += 25;
    reasons.push("High-risk emergency type");
  }

  if (clean(data.severity) === "critical") {
    score += 20;
    reasons.push("Reporter marked it critical");
  }

  const matchedWords = highRiskWords.filter((word) => text.includes(word));
  if (matchedWords.length) {
    score += Math.min(20, matchedWords.length * 6);
    reasons.push(`Urgent keywords: ${matchedWords.slice(0, 3).join(", ")}`);
  }

  if (data.image) {
    score += 5;
    reasons.push("Photo evidence attached");
  }

  const finalScore = Math.min(100, score);
  return {
    score: finalScore,
    suggestedSeverity: finalScore >= 75 ? "Critical" : "High",
    reasons,
  };
};

export const findPotentialDuplicateEmergencies = (incoming = {}, emergencies = []) => {
  const incomingType = clean(incoming.emergencyType);
  const incomingLocation = clean(incoming.locationDetails || incoming.location || incoming.barangay);
  const incomingCreatedAt = Date.now();

  return emergencies
    .filter((item) => item.id !== incoming.id)
    .filter((item) => !["Resolved", "False Report"].includes(item.status))
    .map((item) => {
      let score = 0;
      const reasons = [];
      if (clean(item.emergencyType) === incomingType) {
        score += 35;
        reasons.push("Same emergency type");
      }
      const itemLocation = clean(item.locationDetails || item.location || item.barangay);
      if (incomingLocation && itemLocation && (incomingLocation.includes(itemLocation) || itemLocation.includes(incomingLocation))) {
        score += 35;
        reasons.push("Similar location");
      }
      const minutes = Math.abs(incomingCreatedAt - getEmergencyTime(item)) / (60 * 1000);
      if (minutes <= 90) {
        score += 20;
        reasons.push("Reported recently");
      } else if (minutes <= 240) {
        score += 10;
        reasons.push("Reported within a few hours");
      }
      if (incoming.barangay && item.barangay === incoming.barangay) {
        score += 10;
        reasons.push("Same barangay");
      }
      return { emergency: item, score, reasons };
    })
    .filter((match) => match.score >= 55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
};
