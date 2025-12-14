const norm = v => (v == null ? "" : String(v).trim());
const normLower = v => norm(v).toLowerCase();
const valueIsYes = v => ["yes", "true", "1"].includes(normLower(v));

export default async function validateOffer(req, res) {
  try {
    // Dynamic import of node-fetch to avoid ESM issues
    const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

    const { contactId } = req.query;
    const utmSource = req.query.utm_source || null;

    if (!contactId) {
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🕹️ validateOffer | contactId:", contactId);
    console.log("📝 query params:", req.query);
    console.log("💡 utm_source:", utmSource);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID || null;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID || null;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`,
    ];

    let contact = null;
    for (const url of endpoints) {
      const resApi = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
      const raw = await resApi.json().catch(() => ({}));
      const c = raw.contact || raw;
      if (resApi.ok && c && (c.id || c.contact)) {
        contact = c;
        break;
      }
    }

    if (!contact) {
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    const hasTag = Array.isArray(contact.tags) && contact.tags.some(t => normLower(t) === "welcome offer opt-in");

    const cf = Array.isArray(contact.customField) ? contact.customField : (contact.customFields || []);
    let welcomeOfferAccess = null, offerBooked = null, expiryDate = null;

    console.log("🔍 VALIDATION CHECKS");
    for (const f of cf) {
      if (!f) continue;
      if (fieldWelcomeId && f.id === fieldWelcomeId) {
        welcomeOfferAccess = valueIsYes(f.value);
        console.log(`• Custom Field [${f.id}] => Welcome Offer Access: ${f.value}`);
      }
      if (fieldOfferBookedId && f.id === fieldOfferBookedId) {
        offerBooked = valueIsYes(f.value);
        console.log(`• Custom Field [${f.id}] => Offer Booked: ${f.value}`);
      }
      if (f.name && normLower(f.name) === "welcome offer expiry") {
        expiryDate = f.value;
        console.log(`• Custom Field [${f.id || f.name}] => Expiry Date: ${f.value}`);
      }
    }

    welcomeOfferAccess ??= false;
    offerBooked ??= false;

    let isExpired = false;
    if (expiryDate) isExpired = new Date(expiryDate) < new Date();

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;

    console.log("❌ FINAL RESULT:", isValid ? "VALID OFFER" : "INVALID OFFER");
    console.log("• Has opt-in tag:", hasTag);
    console.log("• Welcome offer access:", welcomeOfferAccess);
    console.log("• Offer booked:", offerBooked);
    console.log("• Expiry date:", expiryDate);
    console.log("• Is expired:", isExpired);

    // Only preserve clean query params
    const allowed = ["contactId", "utm_source", "utm_medium", "utm_campaign", "source"];
    const qs = Object.entries(req.query)
      .filter(([k]) => allowed.includes(k))
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("➡️ Redirect:", redirectTo);

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
