import fetch from 'node-fetch';

function norm(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function normLower(v) { return norm(v).toLowerCase(); }

export default async function validateOffer(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const contactId = url.searchParams.get("contactId");

    if (!contactId) return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID || null;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID || null;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && (candidate.id || candidate.contact)) { contact = data.contact || candidate; break; }
    }
    if (!contact) return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");

    const hasTag = Array.isArray(contact.tags) && contact.tags.some(tag => normLower(tag) === "welcome offer opt-in");

    const cf = Array.isArray(contact.customField) ? contact.customField : (contact.customFields || []);
    const valueIsYes = v => ["yes","true","1"].includes(normLower(v));

    let welcomeOfferAccess = null;
    let offerBooked = null;
    let expiryDate = null;

    // Map fields by env IDs
    for (const f of cf) {
      if(!f) continue;
      if(fieldWelcomeId && f.id===fieldWelcomeId) welcomeOfferAccess=valueIsYes(f.value);
      if(fieldOfferBookedId && f.id===fieldOfferBookedId) offerBooked=valueIsYes(f.value);
      if(f.name && normLower(f.name)==="welcome offer expiry") expiryDate=f.value;
    }

    // Infer fields by name
    for(const f of cf) {
      if(!f) continue;
      const name = normLower(f.name||f.label||"");
      if(welcomeOfferAccess===null && (name.includes("welcome")||name.includes("offeraccess")||name.includes("welcomeoffer")||name.includes("access"))) welcomeOfferAccess=valueIsYes(f.value);
      if(offerBooked===null && (name.includes("book")||name.includes("booked")||name.includes("offerbook")||name.includes("bookedoffer"))) offerBooked=valueIsYes(f.value);
    }

    welcomeOfferAccess ??= false;
    offerBooked ??= false;
    let isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;

    // Preserve UTMs in redirect
    const utmSource = url.searchParams.get("utm_source");
    const utmMedium = url.searchParams.get("utm_medium");
    const utmCampaign = url.searchParams.get("utm_campaign");
    const source = url.searchParams.get("source");

    const qs = new URLSearchParams();
    qs.set("contactId", contact.id);
    if(utmSource) qs.set("utm_source", utmSource);
    if(utmMedium) qs.set("utm_medium", utmMedium);
    if(utmCampaign) qs.set("utm_campaign", utmCampaign);
    if(source) qs.set("source", source);

    console.log("🎯 final field values -> welcomeOfferAccess:", welcomeOfferAccess, "| offerBooked:", offerBooked, "| expiry:", expiryDate, "| isExpired:", isExpired);
    console.log("➡️ isValid:", isValid);
    console.log("💡 Forwarded UTMs:", {utm_source:utmSource, utm_medium:utmMedium, utm_campaign:utmCampaign, source});
    console.log("➡️ Redirecting to:", isValid 
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs.toString()}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma","no-cache");
    res.setHeader("Expires","0");

    return res.redirect(302, isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs.toString()}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );

  } catch(err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(302,"https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
