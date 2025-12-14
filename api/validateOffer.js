export default async function validateOffer(req, res) {
  try {
    const query = req.query || {};
    const contactId = query.contactId;
    const utm_source = query.utm_source || "";
    const utm_medium = query.utm_medium || "";
    const utm_campaign = query.utm_campaign || "";
    const source = query.source || "";

    if (!contactId) {
      console.log("❌ Missing contactId");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID || null;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID || null;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
      });
      if (!response.ok) continue;
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (candidate && (candidate.id || candidate.contact)) {
        contact = candidate;
        break;
      }
    }

    if (!contact) {
      console.log("❌ Contact not found:", contactId);
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    const norm = v => (v === null || v === undefined) ? '' : String(v).trim();
    const normLower = v => norm(v).toLowerCase();
    const valueIsYes = v => ["yes", "true", "1"].includes(normLower(v));

    const hasTag = Array.isArray(contact.tags) && contact.tags.some(tag => normLower(tag) === "welcome offer opt-in");
    const cf = Array.isArray(contact.customField) ? contact.customField : (contact.customFields || []);

    let welcomeOfferAccess = null, offerBooked = null, expiryDate = null;

    for (const f of cf) {
      if (!f) continue;
      if (fieldWelcomeId && f.id === fieldWelcomeId) welcomeOfferAccess = valueIsYes(f.value);
      if (fieldOfferBookedId && f.id === fieldOfferBookedId) offerBooked = valueIsYes(f.value);
      if (f.name && normLower(f.name) === "welcome offer expiry") expiryDate = f.value;
    }

    for (const f of cf) {
      if (!f) continue;
      const name = normLower(f.name || f.label || "");
      const val = f.value;
      if (welcomeOfferAccess === null && (name.includes("welcome") || name.includes("offeraccess") || name.includes("welcomeoffer") || name.includes("access"))) welcomeOfferAccess = valueIsYes(val);
      if (offerBooked === null && (name.includes("book") || name.includes("booked") || name.includes("offerbook") || name.includes("bookedoffer"))) offerBooked = valueIsYes(val);
    }

    // Default values if still null
    welcomeOfferAccess ??= false;
    offerBooked ??= false;

    const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;

    // Validation logic exactly as requested
    const isValid = welcomeOfferAccess && !offerBooked && !isExpired;

    const qs = new URLSearchParams({ contactId });
    if (utm_source) qs.set("utm_source", utm_source);
    if (utm_medium) qs.set("utm_medium", utm_medium);
    if (utm_campaign) qs.set("utm_campaign", utm_campaign);
    if (source) qs.set("source", source);

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs.toString()}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("🎯 final field values -> welcomeOfferAccess:", welcomeOfferAccess, "| offerBooked:", offerBooked, "| isExpired:", isExpired);
    console.log("💡 Forwarded UTMs:", { utm_source, utm_medium, utm_campaign, source });
    console.log("➡️ Redirecting to:", redirectTo);

    res.setHeader("Cache-Control", "no-store,no-cache,must-revalidate,proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.redirect(302, redirectTo);

  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
