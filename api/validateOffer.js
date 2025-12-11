import fetch from 'node-fetch';

function norm(v) { return v == null ? '' : String(v).trim(); }
function normLower(v) { return norm(v).toLowerCase(); }

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;
    if (!contactId) {
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID || null;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID || null;
    const fieldExpiryId = process.env.GHL_FIELD_WELCOME_EXPIRY_ID || null; // new expiry field

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = candidate;
        break;
      }
    }

    if (!contact) {
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    const hasTag = Array.isArray(contact.tags) && contact.tags.some(tag => normLower(tag) === "welcome offer opt-in");

    const cf = Array.isArray(contact.customField) ? contact.customField : (contact.customFields || []);
    const valueIsYes = v => ["yes","true","1"].includes(normLower(v));
    const valueIsNo = v => ["no","false","0",""].includes(normLower(v));

    let welcomeOfferAccess = null;
    let offerBooked = null;
    let expiryDate = null;

    for (const f of cf) {
      if (!f || !f.id) continue;
      if (fieldWelcomeId && f.id === fieldWelcomeId) welcomeOfferAccess = valueIsYes(f.value);
      if (fieldOfferBookedId && f.id === fieldOfferBookedId) offerBooked = valueIsYes(f.value);
      if (fieldExpiryId && f.id === fieldExpiryId) expiryDate = f.value;
    }

    // fallback mapping if needed
    if (welcomeOfferAccess === null) welcomeOfferAccess = false;
    if (offerBooked === null) offerBooked = false;

    // check expiry
    let isExpired = false;
    if (expiryDate) {
      const now = new Date();
      const expiry = new Date(expiryDate);
      if (now > expiry) isExpired = true;
    }

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;

    // Preserve UTMs only
    const incomingParams = new URLSearchParams(req.url.split("?")[1] || "");
    const utmParams = new URLSearchParams();
    for (const [key, value] of incomingParams.entries()) {
      if (key.startsWith("utm_")) utmParams.set(key, value);
    }

    const queryString = utmParams.toString();
    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?contactId=${contact.id}${queryString ? "&"+queryString : ""}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.redirect(302, redirectTo);

  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
