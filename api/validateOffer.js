// Using native fetch in Vercel Node 18+, no node-fetch import needed

function norm(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function normLower(v) { return norm(v).toLowerCase(); }

export default async function validateOffer(req, res) {
  try {
    // Preserve full query params
    const url = new URL(req.url, `https://${req.headers.host}`);
    const contactId = url.searchParams.get("contactId");
    const utms = ["utm_source","utm_medium","utm_campaign","source"];
    const utmValues = {};
    utms.forEach(k => utmValues[k] = url.searchParams.get(k) || null);

    console.log("🕹️ validateOffer called | contactId:", contactId);
    console.log("📝 Incoming query params:", Object.fromEntries(url.searchParams));
    console.log("💡 Forwarded UTMs:", utmValues);

    if (!contactId) {
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

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
      console.log("🔹 Trying endpoint:", endpoint);
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = candidate;
        console.log("✅ Contact fetched:", contact.id || contact);
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

    const valueIsYes = v => ["yes","true","1"].includes(normLower(v));
    const valueIsNo = v => ["no","false","0",""].includes(normLower(v));

    let welcomeOfferAccess = null;
    let offerBooked = null;

    // Map by field IDs
    if (fieldWelcomeId || fieldOfferBookedId) {
      for (const f of cf) {
        if (!f || !f.id) continue;
        if (fieldWelcomeId && f.id === fieldWelcomeId) welcomeOfferAccess = valueIsYes(f.value);
        if (fieldOfferBookedId && f.id === fieldOfferBookedId) offerBooked = valueIsYes(f.value);
      }
      console.log("🔎 Mapped by env IDs:", { fieldWelcomeId, fieldOfferBookedId, welcomeOfferAccess, offerBooked });
    }

    // Fallback mapping
    if (welcomeOfferAccess === null || offerBooked === null) {
      for (const f of cf) {
        if (!f) continue;
        const name = normLower(f.name || f.label || "");
        const val = f.value;
        if ((welcomeOfferAccess === null) && (name.includes("welcome") || name.includes("offeraccess") || name.includes("welcomeoffer") || name.includes("access"))) {
          welcomeOfferAccess = valueIsYes(val);
        }
        if ((offerBooked === null) && (name.includes("book") || name.includes("booked") || name.includes("offerbook") || name.includes("bookedoffer"))) {
          offerBooked = valueIsYes(val);
        }
      }
    }

    welcomeOfferAccess ??= false;
    offerBooked ??= false;

    console.log("🎯 final field values -> welcomeOfferAccess:", welcomeOfferAccess, "| offerBooked:", offerBooked);

    const isValid = hasTag && welcomeOfferAccess && !offerBooked;
    console.log("➡️ isValid:", isValid);

    // Preserve all original UTMs in redirect
    const redirectParams = new URLSearchParams();
    redirectParams.set("contactId", contact.id);
    Object.entries(utmValues).forEach(([k,v]) => { if(v) redirectParams.set(k,v); });

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${redirectParams.toString()}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("➡️ Redirecting to:", redirectTo);

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
