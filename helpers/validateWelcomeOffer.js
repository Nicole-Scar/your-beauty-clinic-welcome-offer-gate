function norm(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export function validateWelcomeOffer(customFields) {
  let welcomeActive = null;
  let welcomeOfferAccess = null;
  let welcomeExpiry = null;

  const valueIsYes = (v) => ["yes", "true", "1"].includes(normLower(v));

  for (const f of customFields) {
    if (!f) continue;
    const name = (f.name || f.label || "").trim().toLowerCase();
    const val = f.value;

    if (name.includes("active")) {
      welcomeActive = valueIsYes(val);
    }

    if (name.includes("welcome")) {
      welcomeOfferAccess = valueIsYes(val);
    }

    if (name.includes("expiry") || name.includes("expiration")) {
      const cleaned = String(val).trim().replace(/(\d+)(st|nd|rd|th)/gi, "$1");
      let parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        welcomeExpiry = parsed;
      }
    }
  }

  const isExpired = welcomeExpiry ? new Date() > welcomeExpiry : false;

  console.log("🔹 Welcome Offer Validation:");
  console.log("Active:", welcomeActive);
  console.log("Access:", welcomeOfferAccess);
  console.log("Expiry:", welcomeExpiry ? welcomeExpiry.toISOString().slice(0, 10) : "N/A");
  console.log("Expired?", isExpired);

  return { welcomeActive, welcomeOfferAccess, welcomeExpiry, isExpired };
}
