import fetch from "node-fetch";

const norm = v => (v == null ? "" : String(v).trim());
const normLower = v => norm(v).toLowerCase();
const valueIsYes = v => ["yes", "true", "1"].includes(normLower(v));

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;
    if (!contactId) {
      return res.redirect(302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🕹️ validateOffer called, contactId:", contactId);
    console.log("📝 Incoming query params:", req.query);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;

    for (const url of endpoints) {
      const resApi = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      const raw = await resApi.json().catch(() => ({}));
      const c = raw.contact || raw;

      if (resApi.ok && c && c.id) {
        contact = c;
        break;
      }
    }

    if (!contact) {
      return res.redirect(302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    const hasTag = Array.isArray(contact.tags)
      && contact.tags.some(t => normLower(t) === "welcome offer opt-in");

    const cf = contact.customField || contact.customFields || [];
    let welcomeOfferAccess = null,
        offerBooked = null,
        expiryDate = null;

    for (const f of cf) {
      if (!f) continue;

      if (process.env.GHL_FIELD_WELCOME_ID && f.id === process.env.GHL_FIELD_WELCOME_ID) {
        welcomeOfferAccess = valueIsYes(f.value);
      }
      if (process.env.GHL_FIELD_OFFERBOOKED_ID && f.id === process.env.GHL_FIELD_OFFERBOOKED_ID) {
        offerBooked = valueIsYes(f.value);
      }
      if (f.name && normLower(f.name) === "welcome offer expiry") {
        expiryDate = f.value;
      }
    }

    // Fallback mapping
    const booleanFields = cf
      .map(f => ({ f, v: normLower(f.value) }))
      .filter(x => ["yes", "no", "true", "false", "1", "0", ""].includes(x.v));

    if (booleanFields.length === 1) {
      if (welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].f.value);
      if (offerBooked === null) offerBooked = false;
    } else if (booleanFields.length >= 2) {
      if (welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].f.value);
      if (offerBooked === null) offerBooked = valueIsYes(booleanFields[1].f.value);
    }

    welcomeOfferAccess ??= false;
    offerBooked ??= false;

    let isExpired = false;
    if (expiryDate) {
      isExpired = new Date(expiryDate) < new Date();
    }

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;

    // Only keep clean query params
    const allowed = ["contactId", "utm_source", "utm_medium", "utm_campaign", "source"];
    const qs = Object.entries(req.query)
      .filter(([k]) => allowed.includes(k))
      .map(([k,v]) => `${k}=${encodeURIComponent(v)}`)
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
    return res.redirect(302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }
}
