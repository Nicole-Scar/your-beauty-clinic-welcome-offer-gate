function norm(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export default async function validateOffer(req, res) {
  try {
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
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;

      if (response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = data.contact || candidate;
        break;
      }
    }

    if (!contact) {
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    const hasTag = Array.isArray(contact.tags) &&
      contact.tags.some(t => normLower(t) === "welcome offer opt-in");

    const cf = Array.isArray(contact.customField)
      ? contact.customField
      : (contact.customFields || []);

    const valueIsYes = v => {
      const s = normLower(v);
      return s === "yes" || s === "true" || s === "1";
    };

    let welcomeOfferAccess = null;
    let offerBooked = null;

    for (const f of cf) {
      if (!f || !f.id) continue;
      if (fieldWelcomeId && f.id === fieldWelcomeId)
        welcomeOfferAccess = valueIsYes(f.value);
      if (fieldOfferBookedId && f.id === fieldOfferBookedId)
        offerBooked = valueIsYes(f.value);
    }

    if (welcomeOfferAccess === null) welcomeOfferAccess = false;
    if (offerBooked === null) offerBooked = false;

    console.log(
      "🎯 final field values -> welcomeOfferAccess:",
      welcomeOfferAccess,
      "| offerBooked:",
      offerBooked
    );

    const isValid = hasTag && welcomeOfferAccess && !offerBooked;
    console.log("➡️ isValid:", isValid);

    const qs = new URLSearchParams();
    qs.set("contactId", contact.id);

    if (utm_source) qs.set("utm_source", utm_source);
    if (utm_medium) qs.set("utm_medium", utm_medium);
    if (utm_campaign) qs.set("utm_campaign", utm_campaign);
    if (source) qs.set("source", source);

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${qs.toString()}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    // 🔽 UTM LOG AT BOTTOM (AS REQUESTED)
    console.log("💡 Forwarded UTMs:", {
      utm_source,
      utm_medium,
      utm_campaign,
      source
    });
    console.log("➡️ Redirecting to:", redirectTo);

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, redirectTo);

  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }
}
