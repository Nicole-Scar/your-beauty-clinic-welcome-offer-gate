import fetch from 'node-fetch';

function norm(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function normLower(v) { return norm(v).toLowerCase(); }

export default async function validateOffer(req, res) {
  try {
    let contactId = req.query.contactId;
    if (!contactId || Array.isArray(contactId)) {
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    console.log("🕹️ validateOffer called, contactId:", contactId);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID || null;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID || null;
    const fieldExpiryId = process.env.GHL_FIELD_WELCOME_EXPIRY || null; // NEW expiry field

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = data.contact || candidate;
        break;
      }
    }

    if (!contact) {
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    const hasTag = Array.isArray(contact.tags) &&
      contact.tags.some(tag => normLower(tag) === "welcome offer opt-in");

    const cf = Array.isArray(contact.customField) ? contact.customField : (contact.customFields || []);
    let welcomeOfferAccess = null, offerBooked = null, expiryDate = null;

    for (const f of cf) {
      if (!f || !f.id) continue;
      if (fieldWelcomeId && f.id === fieldWelcomeId) welcomeOfferAccess = normLower(f.value) === "yes";
      if (fieldOfferBookedId && f.id === fieldOfferBookedId) offerBooked = normLower(f.value) === "yes";
      if (fieldExpiryId && f.id === fieldExpiryId) expiryDate = f.value ? new Date(f.value) : null;
    }

    // Expiry check
    const now = new Date();
    const isExpired = expiryDate && expiryDate < now;

    const isValid = hasTag && welcomeOfferAccess === true && offerBooked === false && !isExpired;

    // Preserve only UTMs for redirect
    const utmParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key.startsWith("utm_")) utmParams.set(key, value);
    }

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?contactId=${contact.id}${utmParams.toString() ? "&"+utmParams.toString() : ""}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    return res.redirect(302, redirectTo);

  } catch (err) {
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
