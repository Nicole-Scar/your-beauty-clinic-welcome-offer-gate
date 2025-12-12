import fetch from "node-fetch";

const norm = (v) => (v == null ? "" : String(v).trim());
const normLower = (v) => norm(v).toLowerCase();
const valueIsYes = (v) => ["yes", "true", "1"].includes(normLower(v));

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;
    const DEBUG = String(process.env.DEBUG || "").toLowerCase() === "true";

    if (!contactId) {
      if (DEBUG) console.warn("[validateOffer] missing contactId -> invalid redirect");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    if (DEBUG) console.log("🕹️ validateOffer called | contactId:", contactId);
    if (DEBUG) console.log("📝 Incoming query params:", req.query);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;

    for (const url of endpoints) {
      try {
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
        });
        const raw = await r.json().catch(() => ({}));
        const c = raw.contact || raw;
        if (r.ok && c?.id) {
          contact = c;
          break;
        } else if (DEBUG) {
          console.warn(`[validateOffer] fetch returned non-ok or no contact for ${url}`, { status: r.status, raw });
        }
      } catch (err) {
        if (DEBUG) console.error("[validateOffer] fetch error for", url, err);
      }
    }

    if (!contact) {
      if (DEBUG) console.warn("[validateOffer] contact not found -> invalid redirect");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    // Tag check
    const hasTag = Array.isArray(contact.tags) && contact.tags.some(t => normLower(t) === "welcome offer opt-in");

    // Custom fields
    const cf = contact.customField || contact.customFields || [];
    let welcomeOfferAccess = null, offerBooked = null, expiryDate = null;

    for (const f of cf) {
      if (!f) continue;
      if (process.env.GHL_FIELD_WELCOME_ID && f.id === process.env.GHL_FIELD_WELCOME_ID) welcomeOfferAccess = valueIsYes(f.value);
      if (process.env.GHL_FIELD_OFFERBOOKED_ID && f.id === process.env.GHL_FIELD_OFFERBOOKED_ID) offerBooked = valueIsYes(f.value);
      if (f.name && normLower(f.name) === "welcome offer expiry") expiryDate = f.value;
    }

    // Fallback boolean mapping (preserve original behavior)
    const booleanFields = cf.map(f => ({ f, v: normLower(f.value) }))
      .filter(x => ["yes","no","true","false","1","0",""].includes(x.v));

    if (booleanFields.length >= 1 && welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].f.value);
    if (booleanFields.length >= 2 && offerBooked === null) offerBooked = valueIsYes(booleanFields[1].f.value);

    welcomeOfferAccess ??= false;
    offerBooked ??= false;

    let isExpired = false;
    if (expiryDate) {
      isExpired = new Date(expiryDate) < new Date();
    }

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;
    if (DEBUG) console.log("[validateOffer] isValid:", isValid, { hasTag, welcomeOfferAccess, offerBooked, isExpired });

    // Preserve all query params except Vercel internal one(s)
    const excluded = ["_vercel_no_cache"];
    const qs = Object.entries(req.query)
      .filter(([k]) => !excluded.includes(k))
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    const validUrl = `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs}`;
    const invalidUrl = "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";
    const redirectTo = isValid ? validUrl : invalidUrl;

    if (DEBUG) console.log("[validateOffer] redirectTo:", redirectTo);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.redirect(302, redirectTo);
  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
