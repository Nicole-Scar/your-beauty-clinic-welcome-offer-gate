import fetch from "node-fetch";

const norm = (v) => (v == null ? "" : String(v).trim());
const normLower = (v) => norm(v).toLowerCase();
const valueIsYes = (v) => ["yes", "true", "1"].includes(normLower(v));

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;

    // Only contactId is mandatory
    if (!contactId) {
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    console.log("🕹️ validateOffer called | contactId:", contactId);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    // Fetch contact from GHL
    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;

    for (const url of endpoints) {
      try {
        const resApi = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
        const raw = await resApi.json().catch(() => ({}));
        const c = raw.contact || raw;
        if (resApi.ok && c?.id) {
          contact = c;
          break;
        }
      } catch {}
    }

    if (!contact) {
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    // Validation logic (tags + custom fields + expiry)
    const hasTag = Array.isArray(contact.tags) && contact.tags.some(t => normLower(t) === "welcome offer opt-in");

    const cf = contact.customField || contact.customFields || [];
    let welcomeOfferAccess = null, offerBooked = null, expiryDate = null;

    for (const f of cf) {
      if (!f) continue;
      if (process.env.GHL_FIELD_WELCOME_ID && f.id === process.env.GHL_FIELD_WELCOME_ID) welcomeOfferAccess = valueIsYes(f.value);
      if (process.env.GHL_FIELD_OFFERBOOKED_ID && f.id === process.env.GHL_FIELD_OFFERBOOKED_ID) offerBooked = valueIsYes(f.value);
      if (f.name && normLower(f.name) === "welcome offer expiry") expiryDate = f.value;
    }

    welcomeOfferAccess ??= false;
    offerBooked ??= false;
    const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;

    // Build redirect query string with ONLY contactId + utm parameters
    const allowedParams = ["contactId", "utm_source", "utm_medium", "utm_campaign"];
    const qs = Object.entries(req.query)
      .filter(([key]) => allowedParams.includes(key))
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("➡️ Redirecting to:", redirectTo);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.redirect(302, redirectTo);

  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
