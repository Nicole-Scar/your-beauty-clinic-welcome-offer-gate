export default async function validateOffer(req, res) {
  try {
    // Vercel sometimes uses GET params differently
    const { query } = req;
    if (!query) throw new Error("Query undefined");

    const contactId = query.contactId;
    if (!contactId) {
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    // UTM params
    const utm_source = query.utm_source || "";
    const utm_medium = query.utm_medium || "";
    const utm_campaign = query.utm_campaign || "";
    const source = query.source || "";

    // GoHighLevel fetch
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

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
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    // Tags & custom fields
    const hasTag = Array.isArray(contact.tags) && contact.tags.some(tag => tag?.toLowerCase() === "welcome offer opt-in");
    const cf = Array.isArray(contact.customField) ? contact.customField : (contact.customFields || []);
    const valueIsYes = v => ["yes", "true", "1"].includes((v || "").toLowerCase());

    let welcomeOfferAccess = null, offerBooked = null, expiryDate = null;
    for (const f of cf) {
      if (!f) continue;
      if (f.id === process.env.GHL_FIELD_WELCOME_ID) welcomeOfferAccess = valueIsYes(f.value);
      if (f.id === process.env.GHL_FIELD_OFFERBOOKED_ID) offerBooked = valueIsYes(f.value);
      if ((f.name || "").toLowerCase() === "welcome offer expiry") expiryDate = f.value;
    }
    welcomeOfferAccess ??= false;
    offerBooked ??= false;
    const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;

    // Build redirect URL with UTMs
    const qs = new URLSearchParams({ contactId });
    if (utm_source) qs.set("utm_source", utm_source);
    if (utm_medium) qs.set("utm_medium", utm_medium);
    if (utm_campaign) qs.set("utm_campaign", utm_campaign);
    if (source) qs.set("source", source);

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs.toString()}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    res.setHeader("Cache-Control", "no-store,no-cache,must-revalidate,proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.redirect(302, redirectTo);

  } catch (err) {
    console.error("🔥 validateOffer error:", err);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
