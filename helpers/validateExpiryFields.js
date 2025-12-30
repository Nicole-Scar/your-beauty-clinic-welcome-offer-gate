function norm(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export default async function validateOffer(req, res) {
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
      console.error("❌ No contact found after both endpoints");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    // === Parse welcome fields inside the same file ===
    function parseWelcomeFields(customFields) {
      const cfArray = Array.isArray(customFields)
        ? customFields
        : Object.entries(customFields || {}).map(([key, value]) => ({ name: key, value }));

      let welcomeOfferAccess = null;
      let welcomeOfferActive = null;
      let welcomeOfferExpiry = null;

      cfArray.forEach((f) => {
        if (!f) return;
        const name = (f.name || f.label || "").trim().toLowerCase();
        const val = f.value;

        if (name.includes("welcomeofferaccess") || name.includes("welcomeaccess")) {
          welcomeOfferAccess = ["yes", "true", "1"].includes(normLower(val));
          console.log("🔎 welcomeOfferAccess detected:", val, "=>", welcomeOfferAccess);
        }

        if (name.includes("active")) {
          welcomeOfferActive = ["yes", "true", "1"].includes(normLower(val));
          console.log("🔎 welcomeOfferActive detected:", val, "=>", welcomeOfferActive);
        }

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
            welcomeOfferExpiry = parsed;
            console.log("🗓️ welcomeOfferExpiry detected:", val, "=>", welcomeOfferExpiry.toISOString().slice(0, 10));
          } else {
            console.log("⚠️ Expiry field found but invalid:", val);
          }
        }
      });

      return { welcomeOfferAccess, welcomeOfferActive, welcomeOfferExpiry };
    }

    const { welcomeOfferAccess, welcomeOfferActive, welcomeOfferExpiry } = parseWelcomeFields(contact.customField);

    console.log("🎯 Final parsed values:");
    console.log("welcomeOfferAccess:", welcomeOfferAccess);
    console.log("welcomeOfferActive:", welcomeOfferActive);
    console.log("welcomeOfferExpiry:", welcomeOfferExpiry ? welcomeOfferExpiry.toISOString().slice(0, 10) : "N/A");

    const isExpired = welcomeOfferExpiry ? new Date() > welcomeOfferExpiry : false;
    const isValid = welcomeOfferAccess && welcomeOfferActive && !isExpired;

    console.log("➡️ isValid:", isValid);

    return res.json({ welcomeOfferAccess, welcomeOfferActive, welcomeOfferExpiry, isExpired, isValid });

  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
