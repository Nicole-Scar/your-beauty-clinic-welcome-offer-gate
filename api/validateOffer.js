function norm(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}
const valueIsYes = v => ["yes", "true", "1"].includes(normLower(v));

export default async function validateOffer(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const contactId = url.searchParams.get("contactId");
    const utmSource = url.searchParams.get("utm_source");

    console.log("🕹️ validateOffer | contactId:", contactId);
    console.log("📝 query params:", Object.fromEntries(url.searchParams));
    console.log("💡 utm_source:", utmSource);

    if (!contactId) {
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;

    for (const endpoint of endpoints) {
      const r = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });

      const data = await r.json().catch(() => ({}));
      const c = data.contact || data;

      if (r.ok && c?.id) {
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

    const hasTag =
      Array.isArray(contact.tags) &&
      contact.tags.some(t => normLower(t) === "welcome offer opt-in");

    const cf = contact.customField || contact.customFields || [];
    let welcomeOfferAccess = false;
    let offerBooked = false;
    let expiryDate = null;

    for (const f of cf) {
      if (!f) continue;
      if (f.id === fieldWelcomeId) welcomeOfferAccess = valueIsYes(f.value);
      if (f.id === fieldOfferBookedId) offerBooked = valueIsYes(f.value);
      if (normLower(f.name) === "welcome offer expiry") expiryDate = f.value;
    }

    let isExpired = false;
    if (expiryDate && new Date(expiryDate) < new Date()) isExpired = true;

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;

    const qs = new URLSearchParams();
    qs.set("contactId", contactId);
    if (utmSource) qs.set("utm_source", utmSource);

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("➡️ Redirect:", redirectTo);

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, redirectTo);

  } catch (err) {
    console.error("🔥 validateOffer error:", err);
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }
}
