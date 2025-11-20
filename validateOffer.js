import fetch from 'node-fetch';

// helper functions
function norm(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;

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
      console.log("🔸 Raw response keys:", Object.keys(data));

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

    // === TAG CHECK ===
    const hasTag = Array.isArray(contact.tags) &&
      contact.tags.some(tag => normLower(tag) === "sent welcome offer tracking link");
    console.log("🏷️ Contact tags:", contact.tags);
    console.log("✅ hasTag:", hasTag);

    // === CUSTOM FIELDS ===
    const cf = Array.isArray(contact.customField)
      ? contact.customField
      : (contact.customFields || []);

    console.log("🧩 Raw customField array:", JSON.stringify(cf, null, 2));

    const valueIsYes = (v) => {
      const s = normLower(v);
      return s === "yes" || s === "true" || s === "1";
    };

    const valueIsNo = (v) => {
      const s = normLower(v);
      return s === "no" || s === "false" || s === "0" || s === "";
    };

    // === NEW SAFE FIELD MATCHING ===
    let welcomeOfferAccess = null;
    let offerBooked = null;

    // 1) Match by ENV ID first
    if (fieldWelcomeId || fieldOfferBookedId) {
      for (const f of cf) {
        if (!f || !f.id) continue;
        if (fieldWelcomeId && f.id === fieldWelcomeId) {
          welcomeOfferAccess = valueIsYes(f.value);
        }
        if (fieldOfferBookedId && f.id === fieldOfferBookedId) {
          offerBooked = valueIsYes(f.value);
        }
      }
      console.log("🔎 Mapped by env IDs:", {
        fieldWelcomeId,
        fieldOfferBookedId,
        welcomeOfferAccess,
        offerBooked
      });
    }

    // 2) **Name-based matching (SOLID + SAFE)**  
    if (welcomeOfferAccess === null || offerBooked === null) {
      for (const f of cf) {
        if (!f) continue;
        const name = normLower(f.name || f.label || "");

        // welcomeOfferBooked
        if (
          welcomeOfferAccess === null &&
          (name.includes("welcomeoffer") ||
           name.includes("welcome_offer") ||
           name.includes("welcome offer") ||
           name.includes("welcome") && name.includes("access"))
        ) {
          welcomeOfferAccess = valueIsYes(f.value);
          console.log(`🔎 Inferred welcomeOfferAccess from name match (${name})`, welcomeOfferAccess);
        }

        // offerBooked
        if (
          offerBooked === null &&
          (name.includes("offerbooked") ||
           name.includes("offer booked") ||
           (name.includes("offer") && name.includes("booked")) ||
           (name.includes("booked") && !name.includes("invoice")))
        ) {
          offerBooked = valueIsYes(f.value);
          console.log(`🔎 Inferred offerBooked from name match (${name})`, offerBooked);
        }
      }
    }

    // ——— REMOVE FALLBACK BOOLEAN GUESSING ENTIRELY (that’s what caused your bug) ———
    // No more scanning for "0" or generic Yes/No fields.

    // === FINAL NORMALIZATION ===
    if (welcomeOfferAccess === null) {
      console.log("⚠️ Could not determine welcomeOfferAccess — default: false");
      welcomeOfferAccess = false;
    }
    if (offerBooked === null) {
      console.log("⚠️ Could not determine offerBooked — default: false");
      offerBooked = false;
    }

    console.log("🎯 final field values -> welcomeOfferAccess:", welcomeOfferAccess, "| offerBooked:", offerBooked);

    // === FINAL DECISION ===
    const isValid =
      hasTag &&
      welcomeOfferAccess === true &&
      offerBooked === false;

    console.log("➡️ isValid:", isValid);

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?contactId=${contact.id}`
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
