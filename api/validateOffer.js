function norm(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function normLower(v) { return norm(v).toLowerCase(); }

export default async function validateOffer(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const contactId = url.searchParams.get("contactId");

    if (!contactId) {
      console.log("❌ No contactId in URL");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    // --- Preserve and log UTMs ---
    const utms = ["utm_source", "utm_medium", "utm_campaign", "source"];
    const utmValues = {};
    utms.forEach(k => utmValues[k] = url.searchParams.get(k) || null);
    console.log("💡 Forwarded UTMs:", utmValues);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID || null;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID || null;
    const fieldExpiryId = process.env.GHL_FIELD_WELCOME_EXPIRY || null;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      console.log("🔹 Trying endpoint:", endpoint);
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && candidate.id) {
        contact = candidate;
        console.log("✅ Contact fetched:", contact.id);
        break;
      } else {
        console.log(`❌ Failed from ${endpoint} - Status: ${response.status}`);
      }
    }

    if (!contact) {
      console.error("❌ No contact found after both endpoints");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    const hasTag = Array.isArray(contact.tags) &&
      contact.tags.some(tag => normLower(tag) === "welcome offer opt-in");
    console.log("🏷️ Contact tags:", contact.tags);
    console.log("✅ hasTag:", hasTag);

    const cf = Array.isArray(contact.customField) ? contact.customField : (contact.customFields || []);
    console.log("🧩 Raw customField array:", JSON.stringify(cf, null, 2));

    const valueIsYes = v => ["yes", "true", "1"].includes(normLower(v));
    const valueIsNo = v => ["no", "false", "0", ""].includes(normLower(v));

    let welcomeOfferAccess = null;
    let offerBooked = null;
    let expiryDate = null;

    // --- Map fields by ID ---
    for (const f of cf) {
      if (!f) continue;
      if (fieldWelcomeId && f.id === fieldWelcomeId) welcomeOfferAccess = valueIsYes(f.value);
      if (fieldOfferBookedId && f.id === fieldOfferBookedId) offerBooked = valueIsYes(f.value);
      if (fieldExpiryId && f.id === fieldExpiryId) expiryDate = f.value;
      if (f.name && normLower(f.name) === "welcome offer expiry") expiryDate = f.value;
    }

    // --- Fallback mapping by boolean fields ---
    const booleanFields = cf
      .map(f => ({ id: f.id || "", name: normLower(f.name || f.label || ""), raw: f, val: normLower(f.value) }))
      .filter(x => typeof x.raw.value === 'string' && ["yes","no","true","false","1","0",""].includes(x.val));

    if (booleanFields.length === 1) {
      if (welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].raw.value);
      if (offerBooked === null) offerBooked = false;
    } else if (booleanFields.length >= 2) {
      if (welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].raw.value);
      if (offerBooked === null) offerBooked = valueIsYes(booleanFields[1].raw.value);
    }

    welcomeOfferAccess ??= false;
    offerBooked ??= false;

    let isExpired = false;
    if (expiryDate) isExpired = new Date(expiryDate) < new Date();

    console.log("🎯 final field values -> welcomeOfferAccess:", welcomeOfferAccess, "| offerBooked:", offerBooked, "| expiry:", expiryDate, "| isExpired:", isExpired);

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;
    console.log("➡️ isValid:", isValid);

    // --- Build redirect URL with all UTMs ---
    const redirectParams = new URLSearchParams();
    redirectParams.set("contactId", contact.id);
    Object.entries(utmValues).forEach(([k, v]) => { if (v) redirectParams.set(k, v); });

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${redirectParams.toString()}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("➡️ Redirecting to:", redirectTo);

    // --- Cache headers ---
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
}
