
export default async function handler(req, res) {
  const { contactId, utm_source } = req.query;

  console.log("🕹️ validateOffer | contactId:", contactId);
  console.log("📝 query params:", req.query);
  console.log("💡 utm_source:", utm_source || null);

  if (!contactId) {
    console.log("❌ FAIL: Missing contactId");
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }

  // --- Fetch contact from GHL ---
  let contact;
  try {
    const response = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    contact = data.contact;
  } catch (err) {
    console.error("🔥 ERROR fetching contact:", err);
    return res.status(500).send("Failed to fetch contact");
  }

  if (!contact) {
    console.log("❌ FAIL: Contact not found in GHL");
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }

  // --- Extract values safely ---
  const tags = contact.tags || [];
  const customFields = contact.customField || {};

  const hasOptInTag = tags.includes("welcome offer opt-in");
  const hasAccess =
    customFields["welcome_offer_access"] === "yes";
  const hasBooked =
    customFields["offer_booked"] === "yes";
  const expiryDate = customFields["welcome_offer_expiry"];

  let isExpired = false;
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    isExpired = expiry < new Date();
  }

  // --- Log each rule clearly ---
  console.log("🔍 VALIDATION CHECKS");
  console.log("• Has opt-in tag:", hasOptInTag);
  console.log("• Welcome offer access:", customFields["welcome_offer_access"]);
  console.log("• Offer booked:", customFields["offer_booked"]);
  console.log("• Expiry date:", expiryDate || "none");
  console.log("• Is expired:", isExpired);

  // --- Final decision ---
  const isValid =
    hasOptInTag &&
    hasAccess &&
    !hasBooked &&
    !isExpired;

  if (!isValid) {
    console.log("❌ FINAL RESULT: INVALID OFFER");
    console.log("❌ Failure reasons:", {
      missingOptInTag: !hasOptInTag,
      accessNotGranted: !hasAccess,
      alreadyBooked: hasBooked,
      expired: isExpired,
    });

    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }

  console.log("✅ FINAL RESULT: VALID OFFER");

  // --- Build final redirect URL ---
  const finalUrl = new URL(
    "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477"
  );

  finalUrl.searchParams.set("contactId", contactId);
  if (utm_source) finalUrl.searchParams.set("utm_source", utm_source);

  console.log("➡️ Redirect:", finalUrl.toString());

  return res.redirect(302, finalUrl.toString());
}

