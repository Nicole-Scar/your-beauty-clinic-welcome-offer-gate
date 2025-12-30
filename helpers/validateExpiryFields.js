// helpers/validateExpiryFields.js

function norm(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export function parseWelcomeFields(customFields) {
  if (!customFields) return {};

  const cfArray = Array.isArray(customFields)
    ? customFields
    : Object.entries(customFields).map(([key, value]) => ({ name: key, value }));

  let welcomeOfferAccess = null;
  let welcomeOfferActive = null;
  let welcomeOfferExpiry = null;

  cfArray.forEach((f) => {
    if (!f) return;

    const name = (f.name || f.label || "").trim().toLowerCase();
    const val = f.value;

    // === welcomeOfferAccess ===
    if (name.includes("welcomeofferaccess") || name.includes("welcomeaccess")) {
      welcomeOfferAccess = ["yes", "true", "1"].includes(normLower(val));
      console.log("🔎 welcomeOfferAccess field detected:", val, "=>", welcomeOfferAccess);
    }

    // === welcomeOfferActive ===
    if (name.includes("active")) {
      welcomeOfferActive = ["yes", "true", "1"].includes(normLower(val));
      console.log("🔎 welcomeOfferActive field detected:", val, "=>", welcomeOfferActive);
    }

    // === welcomeOfferExpiry ===
    if (name.includes("expiry") || name.includes("expiration")) {
      const cleaned = String(val).trim().replace(/(\d+)(st|nd|rd|th)/gi, "$1");
      let parsed = null;

      const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        const [_, year, month, day] = isoMatch;
        parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        parsed = new Date(cleaned);
      }

      if (!isNaN(parsed.getTime())) {
        welcomeOfferExpiry = parsed;
        console.log("🗓️ welcomeOfferExpiry field detected:", val, "=>", welcomeOfferExpiry.toISOString().slice(0, 10));
      } else {
        console.log("⚠️ Expiry field found but invalid date:", val);
      }
    }
  });

  return { welcomeOfferAccess, welcomeOfferActive, welcomeOfferExpiry };
}
