// Native fetch is available in Vercel Node 18+

const norm = v => (v == null ? "" : String(v).trim());
const normLower = v => norm(v).toLowerCase());

// Strict boolean mapping
const parseBooleanField = (v, positiveValue = "yes") => {
  if (v === true || v === "true" || v === "Yes" || v === "yes" || v === "1") return true;
  if (v === false || v === "false" || v === "No" || v === "no" || v === "0") return false;
  return null; // undefined / empty
};

module.exports = async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;
    if (!contactId) {
      console.log("❌ Missing contactId");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🕹️ validateOffer | contactId:", contactId);
    console.log("📝 query params:", req.query);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const url of endpoints) {
      const resApi = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      const raw = await resApi.json().catch(() => ({}));
      const c = raw.contact || raw;
      if (resApi.ok && c && c.id) {
        contact = c;
        break;
      }
    }

    if (!contact) {
      console.log("❌ Contact not found");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    const hasTag = Array.isArray(contact.tags) &&
      contact.tags.some(t => normLower(t) === "welcome offer opt-in");

    const cf = contact.customField || contact.customFields || [];
    let welcomeOfferAccess = null;
    let offerBooked = null;
    let expiryDate = null;

    console.log("🔍 VALIDATION CHECKS");

    for (const f of cf) {
      if (!f) continue;

      // Map by IDs first
      if (process.env.GHL_FIELD_WELCOME_ID && f.id === process.env.GHL_FIELD_WELCOME_ID) {
        welcomeOfferAccess = parseBooleanField(f.value, "yes");
        console.log(`• Custom Field [${f.id}] => Welcome Offer Access: ${f.value}`);
      }

      if (process.env.GHL_FIELD_OFFERBOOKED_ID && f.id === process.env.GHL_FIELD_OFFERBOOKED_ID) {
        offerBooked = parseBooleanField(f.value, "yes");
        console.log(`• Custom Field [${f.id}] => Offer Booked: ${f.value}`);
      }

      if (f.name && normLower(f.name) === "welcome offer expiry") {
        expiryDate = f.value;
        console.log(`• Custom Field [${f.id || f.name}] => Expiry Date: ${f.value}`);
      }
    }

    // Fallback for any missing boolean fields
    welcomeOfferAccess ??= false; // default: no access unless explicitly yes
    offerBooked ??= false;        // default: not booked unless explicitly yes

    let isExpired = false;
    if (expiryDate) isExpired = new Date(expiryDate) < new Date();

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;

    const allowed = ["contactId","utm_source","utm_medium","utm_campaign","source"];
    const qs = Object.entries(req.query)
      .filter(([k]) => allowed.includes(k))
      .map(([k,v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("• Has opt-in tag:", hasTag);
    console.log("• Welcome offer access:", welcomeOfferAccess);
    console.log("• Offer booked:", offerBooked);
    console.log("• Expiry date:", expiryDate);
    console.log("• Is expired:", isExpired);
    console.log("❌ FINAL RESULT:", isValid ? "VALID OFFER" : "INVALID OFFER");
    console.log("➡️ Redirect:", redirectTo);

    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma","no-cache");
    res.setHeader("Expires","0");

    return res.redirect(302, redirectTo);

  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }
};
