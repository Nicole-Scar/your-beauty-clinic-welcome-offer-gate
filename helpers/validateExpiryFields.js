function norm(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export default async function validateExpiryFields(req, res) {
  try {
    const fetch = (await import('node-fetch')).default;
    const { contactId } = req.query;

    if (!contactId) {
      console.log("❌ No contactId in URL");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = data.contact || candidate;
        console.log("✅ Contact fetched:", contact.id || contact);
        break;
      }
    }

    if (!contact) {
      console.error("❌ No contact found");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    // Convert custom fields to array
    const cfArray = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));

    // Parse fields
    let welcomeOfferActive = null;
    let welcomeOfferExpiry = null;

    cfArray.forEach((f) => {
      if (!f) return;
      const name = (f.name || f.label || "").trim();
      const val = f.value;

      console.log("📌 Custom Field:", name, "Value:", val);

      // Active
      if (name.toLowerCase().includes("active")) {
        welcomeOfferActive = ["yes", "true", "1"].includes(normLower(val));
        console.log("🔎 Detected Welcome Offer Active:", val, "=>", welcomeOfferActive);
      }

      // Expiry
      if (name.toLowerCase().includes("expiry") || name.toLowerCase().includes("expiration")) {
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
          welcomeOfferExpiry = parsed;
          console.log("🗓️ Detected Welcome Offer Expiry:", val, "=>", welcomeOfferExpiry.toISOString().slice(0, 10));
        } else {
          console.log("⚠️ Invalid expiry field:", val);
        }
      }
    });

    console.log("🎯 Final parsed fields:");
    console.log("welcomeOfferActive:", welcomeOfferActive);
    console.log("welcomeOfferExpiry:", welcomeOfferExpiry ? welcomeOfferExpiry.toISOString().slice(0, 10) : "N/A");

    const isExpired = welcomeOfferExpiry ? new Date() > welcomeOfferExpiry : false;
    console.log("⏰ Is expired?", isExpired);

    return res.json({ welcomeOfferActive, welcomeOfferExpiry, isExpired });

  } catch (err) {
    console.error("🔥 Error in validateExpiryFields:", err);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
