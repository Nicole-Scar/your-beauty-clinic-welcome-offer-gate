import fetch from 'node-fetch';

function norm(v){ return (v===null||v===undefined) ? '' : String(v).trim(); }
function normLower(v){ return norm(v).toLowerCase(); }

export default async function validateOffer(req, res){
  try{
    // --- contactId (must be single string)
    let contactId = req.query.contactId;
    if (!contactId) {
      console.error("❌ No contactId in req.query");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }
    if (Array.isArray(contactId)) contactId = contactId[0];

    console.log("🕹️ validateOffer called, contactId:", contactId);
    console.log("📝 Incoming query params:", req.query);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID || null;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID || null;
    const fieldExpiryId = process.env.GHL_FIELD_WELCOME_EXPIRY_ID || null;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      console.log("🔹 Trying endpoint:", endpoint);
      const r = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
      const data = await r.json().catch(()=>({}));
      const candidate = data.contact || data;
      if (r.ok && candidate && (candidate.id || candidate.contact)) { contact = candidate; console.log("✅ Contact fetched:", candidate.id || candidate); break; }
      console.log(`❌ Failed from ${endpoint} - Status: ${r.status}`);
    }

    if (!contact) {
      console.error("❌ No contact found after both endpoints");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    // --- tag + custom fields logic (kept minimal but exact)
    const hasTag = Array.isArray(contact.tags) && contact.tags.some(t => normLower(t) === "welcome offer opt-in");
    console.log("🏷️ Contact tags:", contact.tags, "hasTag:", hasTag);

    const cf = Array.isArray(contact.customField) ? contact.customField : (contact.customFields || []);
    console.log("🧩 custom fields:", JSON.stringify(cf || [], null, 2));

    const valueIsYes = v => { const s = normLower(v); return s==="yes"||s==="true"||s==="1"; };
    const valueIsNo = v => { const s = normLower(v); return s==="no"||s==="false"||s==="0"||s==="" ; };

    let welcomeOfferAccess = null;
    let offerBooked = null;
    let expiryDate = null;

    // map by env IDs if provided
    if (fieldWelcomeId || fieldOfferBookedId || fieldExpiryId) {
      for (const f of cf) {
        if(!f || !f.id) continue;
        if (fieldWelcomeId && f.id === fieldWelcomeId) welcomeOfferAccess = valueIsYes(f.value);
        if (fieldOfferBookedId && f.id === fieldOfferBookedId) offerBooked = valueIsYes(f.value);
        if (fieldExpiryId && f.id === fieldExpiryId) expiryDate = f.value ? new Date(f.value) : null;
      }
      console.log("🔎 Mapped by env IDs:", { fieldWelcomeId, fieldOfferBookedId, fieldExpiryId, welcomeOfferAccess, offerBooked, expiryDate });
    }

    // infer by name if still null / missing
    for (const f of cf) {
      if (!f) continue;
      const name = normLower(f.name || f.label || "");
      const val = f.value;
      if (welcomeOfferAccess === null && (name.includes("welcome") || name.includes("offeraccess") || name.includes("welcomeoffer") || name.includes("access"))) {
        welcomeOfferAccess = valueIsYes(val); console.log(`🔎 Inferred welcomeOfferAccess from (${name}) =>`, welcomeOfferAccess);
      }
      if (offerBooked === null && (name.includes("book") || name.includes("booked") || name.includes("offerbook") || name.includes("bookedoffer"))) {
        offerBooked = valueIsYes(val); console.log(`🔎 Inferred offerBooked from (${name}) =>`, offerBooked);
      }
      if (!expiryDate && name.includes("expiry") && val) {
        expiryDate = new Date(val); console.log(`🔎 Inferred expiryDate from (${name}) =>`, expiryDate);
      }
    }

    // boolean fallback mapping (keeps original logic)
    const booleanFields = cf.map(f => ({ id: f.id||"", name: normLower(f.name||f.label||""), raw: f, val: normLower(f.value) }))
      .filter(x => typeof x.raw.value === 'string' && ["yes","no","true","false","1","0",""].includes(x.val));

    if (booleanFields.length === 1) {
      if (welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].raw.value);
      if (offerBooked === null) offerBooked = false;
      console.log("🔎 Fallback: single boolean -> welcomeOfferAccess");
    } else if (booleanFields.length >= 2) {
      if (welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].raw.value);
      if (offerBooked === null) offerBooked = valueIsYes(booleanFields[1].raw.value);
      console.log("🔎 Fallback: first boolean -> welcomeOfferAccess, second -> offerBooked");
    }

    if (welcomeOfferAccess === null) { welcomeOfferAccess = false; console.log("⚠️ default welcomeOfferAccess=false"); }
    if (offerBooked === null) { offerBooked = false; console.log("⚠️ default offerBooked=false"); }

    console.log("🎯 final -> welcomeOfferAccess:", welcomeOfferAccess, "offerBooked:", offerBooked, "expiryDate:", expiryDate);

    const now = new Date();
    const expired = expiryDate && now > expiryDate;

    const isValid = hasTag && welcomeOfferAccess === true && offerBooked === false && !expired;
    console.log("➡️ isValid:", isValid);

    // --- PRESERVE UTMs: build query string from req.query utm_* keys ONLY
    const paramsFinal = new URLSearchParams();
    for (const key of Object.keys(req.query || {})) {
      if (key.startsWith("utm_")) {
        const val = req.query[key];
        // handle array or single
        if (Array.isArray(val)) {
          for (const v of val) paramsFinal.append(key, v);
        } else {
          paramsFinal.append(key, val);
        }
      }
    }
    const qs = paramsFinal.toString(); // will be '' if none
    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?contactId=${encodeURIComponent(contact.id)}${qs ? "&"+qs : ""}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("➡️ Redirecting to:", redirectTo);
    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma","no-cache");
    res.setHeader("Expires","0");
    return res.redirect(302, redirectTo);

  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
