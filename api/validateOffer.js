function norm(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export default async function validateOffer(req, res) {
  try {
    const fetch = (await import('node-fetch')).default; // dynamic import to prevent ESM crash
    const { contactId, booking_source } = req.query;

    if (!contactId) {
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

    if (fieldWelcomeId || fieldOfferBookedId) {
      for (const f of cf) {
        if (!f || !f.id) continue;
        if (fieldWelcomeId && f.id === fieldWelcomeId) welcomeOfferAccess = valueIsYes(f.value);
        if (fieldOfferBookedId && f.id === fieldOfferBookedId) offerBooked = valueIsYes(f.value);
      }
      console.log("🔎 Mapped by env IDs:", { fieldWelcomeId, fieldOfferBookedId, welcomeOfferAccess, offerBooked });
    }

    if (welcomeOfferAccess === null || offerBooked === null) {
      for (const f of cf) {
        if (!f) continue;
        const name = normLower(f.name || f.label || "");
        const val = f.value;
        if ((welcomeOfferAccess === null) && (name.includes("welcome") || name.includes("offeraccess") || name.includes("welcomeoffer") || name.includes("access"))) {
          welcomeOfferAccess = valueIsYes(val);
          console.log(`🔎 Inferred welcomeOfferAccess from field (${name}) =>`, welcomeOfferAccess);
        }
        if ((offerBooked === null) && (name.includes("book") || name.includes("booked") || name.includes("offerbook") || name.includes("bookedoffer"))) {
          offerBooked = valueIsYes(val);
          console.log(`🔎 Inferred offerBooked from field (${name}) =>`, offerBooked);
        }
      }
    }

    // === Fallback boolean mapping restored, but ignore numeric fields ===
    if (welcomeOfferAccess === null || offerBooked === null) {
      const booleanFields = cf
        .map(f => ({ id: f.id || "", name: normLower(f.name || f.label || ""), raw: f, val: normLower(f.value) }))
        .filter(x => typeof x.raw.value === 'string' && ["yes","no","true","false","1","0",""].includes(x.val));

      console.log("🔎 boolean-like custom fields:", booleanFields.map(b => ({ id: b.id, name: b.name, val: b.val })));

      if (booleanFields.length === 1) {
        if (welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].raw.value);
        if (offerBooked === null) offerBooked = false;
        console.log("🔎 Fallback: single boolean field mapped to welcomeOfferAccess");
      } else if (booleanFields.length >= 2) {
        if (welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].raw.value);
        if (offerBooked === null) offerBooked = valueIsYes(booleanFields[1].raw.value);
        console.log("🔎 Fallback: first boolean -> welcomeOfferAccess, second -> offerBooked");
      }
    }

    if (welcomeOfferAccess === null) {
      console.log("⚠️ Could not determine welcomeOfferAccess — default false");
      welcomeOfferAccess = false;
    }
    if (offerBooked === null) {
      console.log("⚠️ Could not determine offerBooked — default false");
      offerBooked = false;
    }

    console.log("🎯 final field values -> welcomeOfferAccess:", welcomeOfferAccess, "| offerBooked:", offerBooked);
    console.log("💡 Forwarded booking_source:", booking_source);


    const isValid = hasTag && (welcomeOfferAccess === true) && (offerBooked === false);
    console.log("➡️ isValid:", isValid);

   // Build query string for redirect
   const qs = new URLSearchParams({ contactId });
   if (booking_source) qs.set("booking_source", booking_source);


   console.log("💡 Forwarded booking_source:", booking_source);



   // Final redirect
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
