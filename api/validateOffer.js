import fetch from 'node-fetch';

function norm(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;

    if (!contactId) {
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🕹️ validateOffer called, contactId:", contactId);
    console.log("📝 Incoming query params:", req.query);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID || null;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID || null;
    const fieldExpiryId = process.env.GHL_FIELD_WELCOME_EXPIRY_ID || null; // New expiry field

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`,
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });

      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = data.contact || candidate;
        break;
      }
    }

    if (!contact) {
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    const hasTag =
      Array.isArray(contact.tags) &&
      contact.tags.some(tag => normLower(tag) === "welcome offer opt-in");

    const cf = Array.isArray(contact.customField) ? contact.customField : (contact.customFields || []);

    const valueIsYes = v => ["yes", "true", "1"].includes(normLower(v));
    const valueIsNo = v => ["no", "false", "0", ""].includes(normLower(v));

    let welcomeOfferAccess = null;
    let offerBooked = null;
    let expiryDate = null;

    for (const f of cf) {
      if (!f || !f.id) continue;
      if (fieldWelcomeId && f.id === fieldWelcomeId) welcomeOfferAccess = valueIsYes(f.value);
      if (fieldOfferBookedId && f.id === fieldOfferBookedId) offerBooked = valueIsYes(f.value);
      if (fieldExpiryId && f.id === fieldExpiryId) expiryDate = f.value ? new Date(f.value) : null;
    }

    // Fallback mapping by name
    if (welcomeOfferAccess === null || offerBooked === null || expiryDate === null) {
      for (const f of cf) {
        if (!f) continue;
        const name = normLower(f.name || f.label || "");
        const val = f.value;
        if (welcomeOfferAccess === null && (name.includes("welcome") || name.includes("offeraccess")))
          welcomeOfferAccess = valueIsYes(val);
        if (offerBooked === null && (name.includes("book") || name.includes("offerbook"))) offerBooked = valueIsYes(val);
        if (expiryDate === null && (name.includes("expiry") || name.includes("expiration")))
          expiryDate = val ? new Date(val) : null;
      }
    }

    if (welcomeOfferAccess === null) welcomeOfferAccess = false;
    if (offerBooked === null) offerBooked = false;

    const now = new Date();
    const expired = expiryDate && now > expiryDate;

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !expired;

    // Preserve UTMs and other params
    const search = req.url.split("?")[1] || "";
    const params = new URLSearchParams(search);
    params.delete("contactId"); // replace with real one
    const queryString = params.toString();
    const separator = queryString ? "&" : "";

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?contactId=${contact.id}${separator}${queryString}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("➡️ Redirecting to:", redirectTo);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.redirect(302, redirectTo);

  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }
}
