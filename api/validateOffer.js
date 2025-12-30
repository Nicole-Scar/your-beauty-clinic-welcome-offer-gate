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
    const fieldWelcomeActiveId = process.env.GHL_FIELD_WELCOME_ACTIVE_ID || null;

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

    const cf = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));

    console.log("🧩 Raw customField array:", JSON.stringify(cf, null, 2));

    const valueIsYes = (v) => {
      const s = normLower(v);
      return s === "yes" || s === "true" || s === "1";
    };

    let welcomeOfferAccess = null;
    let offerBooked = null;
    let welcomeOfferExpiry = null; // Added for expiry

    // Map by GHL IDs if present
    if (fieldWelcomeId || fieldOfferBookedId || fieldWelcomeActiveId) {
      for (const f of cf) {
        if (!f || !f.id) continue;

        if (fieldWelcomeId && f.id === fieldWelcomeId) {
          welcomeOfferAccess = valueIsYes(f.value);
        }
        if (fieldWelcomeActiveId && f.id === fieldWelcomeActiveId) {
          welcomeOfferAccess = valueIsYes(f.value);
          console.log("🔎 Welcome Offer Active (explicit) =>", welcomeOfferAccess);
        }
        if (fieldOfferBookedId && f.id === fieldOfferBookedId) {
          offerBooked = valueIsYes(f.value);
        }
      }
      console.log("🔎 Mapped by env IDs:", { fieldWelcomeId, fieldOfferBookedId, welcomeOfferAccess, offerBooked });
    }

    // Map by field name
    for (const f of cf) {
      if (!f) continue;

      const name = (f.name || f.label || "").trim().toLowerCase();
      const valStr = (f.value && typeof f.value === 'string') ? f.value : String(f.value?.value || f.value || "");

      // Detect welcomeOfferAccess
      if ((welcomeOfferAccess === null) && /welcome|offeraccess|welcomeoffer|access/i.test(name)) {
        welcomeOfferAccess = valueIsYes(valStr);
        console.log(`🔎 Inferred welcomeOfferAccess from field (${name}) =>`, welcomeOfferAccess);
      }

      // Detect offerBooked
      if ((offerBooked === null) && /book|booked|offerbook|bookedoffer/i.test(name)) {
        offerBooked = valueIsYes(valStr);
        console.log(`🔎 Inferred offerBooked from field (${name}) =>`, offerBooked);
      }

      // Parse Welcome Offer Expiry
      if (/expiry|expiration/i.test(name)) {
        const cleaned = valStr.trim().replace(/(\d+)(st|nd|rd|th)/gi, "$1");
        let parsed = null;

        const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          const [_, year, month, day] = isoMatch;
          parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          parsed = new Date(cleaned);
        }

        if (!isNaN(parsed.getTime())) {
          if (!welcomeOfferExpiry || parsed > welcomeOfferExpiry) welcomeOfferExpiry = parsed;
          console.log("🗓️ Inferred Welcome Offer Expiry (" + name + ") =>", welcomeOfferExpiry.toISOString().slice(0, 10));
        } else {
          console.log("⚠️ Expiry field found but invalid date (" + name + ") =>", valStr);
        }
      }
    }

    // Ensure defaults
    if (welcomeOfferAccess === null) {
      console.log("⚠️ Could not determine welcomeOfferAccess — default false");
      welcomeOfferAccess = false;
    }
    if (offerBooked === null) {
      console.log("⚠️ Could not determine offerBooked — default false");
      offerBooked = false;
    }

    console.log("🎯 final field values -> welcomeOfferAccess:", welcomeOfferAccess, "| offerBooked:", offerBooked);
    console.log("🗓️ Welcome Offer Expiry:", welcomeOfferExpiry ? welcomeOfferExpiry.toISOString().slice(0, 10) : "N/A");
    console.log("💡 Forwarded booking_source:", booking_source);

    const isExpired = welcomeOfferExpiry ? new Date() > welcomeOfferExpiry : false;

    const isValid =
      hasTag &&
      welcomeOfferAccess === true &&
      offerBooked === false &&
      !isExpired;

    console.log("➡️ isValid:", isValid);

    // Build query string for redirect
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
