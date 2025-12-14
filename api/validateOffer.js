import fetch from 'node-fetch';

function norm(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;

    if(!contactId) {
      console.log("❌ No contactId in URL");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }
    console.log("🕹️ validateOffer called, contactId:", contactId);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID || null;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID || null;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for(const endpoint of endpoints) {
      console.log("🔹 Trying endpoint:", endpoint);
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }});
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if(response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = data.contact || candidate;
        console.log("✅ Contact fetched:", contact.id || contact);
        break;
      } else {
        console.log(`❌ Failed from ${endpoint} - Status: ${response.status}`);
      }
    }

    if(!contact) {
      console.error("❌ No contact found after both endpoints");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    const hasTag = Array.isArray(contact.tags) &&
      contact.tags.some(tag => normLower(tag) === "welcome offer opt-in");
    console.log("🏷️ Contact tags:", contact.tags);
    console.log("✅ hasTag:", hasTag);

    const cf = Array.isArray(contact.customField) ? contact.customField : (contact.customFields || []);
    console.log("🧩 Raw customField array:", JSON.stringify(cf, null, 2));

    const valueIsYes = (v) => {
      const s = normLower(v);
      return s === "yes" || s === "true" || s === "1";
    };

    let welcomeOfferAccess = null;
    let offerBooked = null;
    let expiry = null;

    // Map fields by env IDs
    if(fieldWelcomeId || fieldOfferBookedId) {
      for(const f of cf) {
        if(!f || !f.id) continue;
        if(fieldWelcomeId && f.id === fieldWelcomeId) welcomeOfferAccess = valueIsYes(f.value);
        if(fieldOfferBookedId && f.id === fieldOfferBookedId) offerBooked = valueIsYes(f.value);
        if(f.name && normLower(f.name) === "welcome offer expiry") expiry = f.value;
      }
      console.log("🔎 Mapped by env IDs:", { fieldWelcomeId, fieldOfferBookedId, welcomeOfferAccess, offerBooked, expiry });
    }

    // Fallback logic
    if(welcomeOfferAccess === null || offerBooked === null) {
      const booleanFields = cf
        .map(f => ({ id: f.id||"", name: normLower(f.name||f.label||""), raw: f, val: normLower(f.value) }))
        .filter(x => ["yes","no","true","false","1","0",""].includes(x.val));
      if(booleanFields.length === 1) {
        if(welcomeOfferAccess===null) welcomeOfferAccess = valueIsYes(booleanFields[0].raw.value);
        if(offerBooked===null) offerBooked=false;
      } else if(booleanFields.length >= 2) {
        if(welcomeOfferAccess===null) welcomeOfferAccess = valueIsYes(booleanFields[0].raw.value);
        if(offerBooked===null) offerBooked = valueIsYes(booleanFields[1].raw.value);
      }
    }

    welcomeOfferAccess ??= false;
    offerBooked ??= false;

    const isExpired = expiry ? new Date(expiry) < new Date() : false;

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;

    // --- Preserve UTMs in redirect ---
    const allowedUTMs = ["utm_source","utm_medium","utm_campaign","source"];
    const qs = new URLSearchParams();
    qs.set("contactId", contact.id);
    allowedUTMs.forEach(k => { if(req.query[k]) qs.set(k, req.query[k]); });

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs.toString()}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("🎯 final field values -> welcomeOfferAccess:", welcomeOfferAccess, "| offerBooked:", offerBooked, "| expiry:", expiry, "| isExpired:", isExpired);
    console.log("➡️ isValid:", isValid);
    console.log("💡 Forwarded UTMs:", Object.fromEntries(qs.entries()));
    console.log("➡️ Redirecting to:", redirectTo);

    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma","no-cache");
    res.setHeader("Expires","0");

    return res.redirect(302, redirectTo);

  } catch(err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
