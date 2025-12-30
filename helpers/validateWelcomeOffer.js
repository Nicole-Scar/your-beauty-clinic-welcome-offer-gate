// helpers/offerFields.js
export function parseWelcomeFields(customFields) {
  let welcomeOfferAccess = null;
  let welcomeOfferActive = null;

  if (!Array.isArray(customFields)) {
    console.log("⚠️ No custom fields provided");
    return { welcomeOfferAccess, welcomeOfferActive };
  }

  for (const f of customFields) {
    if (!f) continue;
    const name = (f.name || f.label || "").trim().toLowerCase();
    const val = f.value;

    // === welcomeOfferAccess ===
    if (name.includes("welcomeofferaccess") || name.includes("welcomeaccess")) {
      welcomeOfferAccess = String(val).trim().toLowerCase() === "yes";
      console.log("🔎 Welcome Offer Access field found:", val, "=>", welcomeOfferAccess);
    }

    // === Welcome Offer Active ===
    if (name.includes("welcomeofferactive") || name.includes("active")) {
      welcomeOfferActive = String(val).trim().toLowerCase() === "yes";
      console.log("🔎 Welcome Offer Active field found:", val, "=>", welcomeOfferActive);
    }
  }

  // Defaults if not found
  if (welcomeOfferAccess === null) {
    console.log("⚠️ Could not determine welcomeOfferAccess — default false");
    welcomeOfferAccess = false;
  }
  if (welcomeOfferActive === null) {
    console.log("⚠️ Could not determine welcomeOfferActive — default false");
    welcomeOfferActive = false;
  }

  return { welcomeOfferAccess, welcomeOfferActive };
}
