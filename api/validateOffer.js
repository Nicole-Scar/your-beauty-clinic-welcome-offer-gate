function norm(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

// --- Helper for logging & validating Active and Expiry fields
function logActiveAndExpiry(customFields) {
  let expiry = null;
  let active = null;

  customFields.forEach(f => {
    if (!f) return;
    const name = (f.name || f.label || "").trim().toLowerCase();
    const val = f.value;

    // Check for Active
    if (name.includes("active")) {
      active = val;
      console.log("🔎 Welcome Offer Active field (" + name + ") value:", val);
    }

    // Check for Expiry
    if (name.includes("expiry") || name.includes("expiration")) {
      const cleaned = String(val).trim().replace(/(\d+)(st|nd|rd|th)/gi, "$1");
      let parsed = null;

      const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        const [_, year, month, day] = isoMatch;
        parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        parsed = new Date(cleaned);
      }

      if (!isNaN(parsed.getTime())) {
        if (!expiry || parsed > expiry) expiry = parsed;
        console.log("🗓️ Welcome Offer Expiry field (" + name + ") value:", val, "=> parsed:", parsed.toISOString().slice(0, 10));
      } else {
        console.log("⚠️ Expiry field invalid (" + name + ") =>", val);
      }
    }
  });

  const isExpired = expiry ? new Date() > expiry : false;

  console.log("📝 Validation Summary for Active & Expiry:");
  console.log("💡 Active value:", active ?? "N/A");
  console.log("🗓️ Expiry value:", expiry ? expiry.toISOString().slice(0, 10) : "N/A");
  console.log("⏰ Expired?", expiry ? isExpired : "N/A");

  return { active, expiry, isExpired };
}

export default async function validateOffer(req, res) {
  try {
    const fetch = (await import('node-fetch')).default; 
    const { contactId, booking_source } = req.query;

    if (!contactId) {
      console.log("❌ No contactId in URL");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }
    console.log("🕹️ validateOffer called, contactId:", contactId);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

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
        contact = data.contact || candidate;
        console.log("✅ Contact fetched:", contact.id || contact);
        break;
      } else {
        console.log(`❌ Failed from ${endpoint} - Status: ${response.status}`);
      }
    }

    if (!contact) {
      console.error("❌ No contact found after both endpoints");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    const cf = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));

    // --- NEW: call helper to log Active & Expiry, safely
    const { active: welcomeActive, expiry: welcomeExpiry, isExpired } = logActiveAndExpiry(cf);

    // --- existing logic untouched
    let welcomeOfferAccess = null;
    let offerBooked = null;
    const valueIsYes = (v) => ["yes", "true", "1"].includes(normLower(v));

    cf.forEach(f => {
      const name = (f.name || f.label || "").trim().toLowerCase();
      const val = f.value;

      if ((welcomeOfferAccess === null) && (name.includes("welcome") || name.includes("offeraccess"))) {
        welcomeOfferAccess = valueIsYes(val);
      }
      if ((offerBooked === null) && (name.includes("book") || name.includes("booked"))) {
        offerBooked = valueIsYes(val);
      }
    });

    if (welcomeOfferAccess === null) welcomeOfferAccess = false;
    if (offerBooked === null) offerBooked = false;

    const hasTag = Array.isArray(contact.tags) && contact.tags.some(tag => normLower(tag) === "welcome offer opt-in");

    const isValid = hasTag && welcomeOfferAccess && !offerBooked && !isExpired;

    const qs = new URLSearchParams({ contactId });
    if (booking_source) qs.set("booking_source", booking_source);

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs.toString()}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("➡️ Redirecting to:", redirectTo);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.redirect(302, redirectTo);

  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
