const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

function norm(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export default async function validateOffer(req, res) {
  try {
    // =========================
    // READ QUERY PARAMS (SOURCE OF TRUTH)
    // =========================
    const {
      contactId,
      utm_source,
      utm_medium,
      utm_campaign,
      source
    } = req.query;

    if (!contactId) {
      console.log("❌ No contactId in URL");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🕹️ validateOffer called | contactId:", contactId);

    // =========================
    // FETCH CONTACT (UNCHANGED)
    // =========================
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;

    for (const endpoint of endpoints) {
      const r = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });

      const d = await r.json().catch(() => ({}));
      const candidate = d.contact || d;

      if (r.ok && candidate?.id) {
        contact = candidate;
        break;
      }
    }

    if (!contact) {
      console.log("❌ Contact not found");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    // =========================
    // VALIDATION LOGIC (RESTORED)
    // =========================
    const hasTag =
      Array.isArray(contact.tags) &&
      contact.tags.some(t => normLower(t) === "welcome offer opt-in");

    const cf = Array.isArray(contact.customField)
      ? contact.customField
      : contact.customFields || [];

    const valueIsYes = v =>
      ["yes", "true", "1"].includes(normLower(v));

    let welcomeOfferAccess = null;
    let offerBooked = null;

    // Map by ENV IDs FIRST (original behavior)
    for (const f of cf) {
      if (!f?.id) continue;
      if (f.id === fieldWelcomeId)
        welcomeOfferAccess = valueIsYes(f.value);
      if (f.id === fieldOfferBookedId)
        offerBooked = valueIsYes(f.value);
    }

    // Fallback inference ONLY if still null
    if (welcomeOfferAccess === null || offerBooked === null) {
      const booleanFields = cf.filter(f =>
        ["yes", "no", "true", "false", "1", "0", ""].includes(
          normLower(f.value)
        )
      );

      if (booleanFields.length >= 1 && welcomeOfferAccess === null) {
        welcomeOfferAccess = valueIsYes(booleanFields[0].value);
      }
      if (booleanFields.length >= 2 && offerBooked === null) {
        offerBooked = valueIsYes(booleanFields[1].value);
      }
    }

    // Final defaults (ONLY here)
    if (welcomeOfferAccess === null) welcomeOfferAccess = false;
    if (offerBooked === null) offerBooked = false;

    const isValid =
      hasTag && welcomeOfferAccess === true && offerBooked === false;

    console.log(
      "🎯 final field values ->",
      { welcomeOfferAccess, offerBooked, hasTag }
    );

    // =========================
    // BUILD REDIRECT URL (UTMs PRESERVED)
    // =========================
    const qs = new URLSearchParams({ contactId });

    if (utm_source) qs.set("utm_source", utm_source);
    if (utm_medium) qs.set("utm_medium", utm_medium);
    if (utm_campaign) qs.set("utm_campaign", utm_campaign);
    if (source) qs.set("source", source);

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs.toString()}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    // =========================
    // LOGS AT BOTTOM (AS REQUESTED)
    // =========================
    console.log("💡 Forwarded UTMs:", {
      utm_source,
      utm_medium,
      utm_campaign,
      source
    });
    console.log("➡️ Redirecting to:", redirectTo);

    // Cache headers
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.redirect(302, redirectTo);
  } catch (err) {
    console.error("🔥 validateOffer crash:", err);
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }
}
