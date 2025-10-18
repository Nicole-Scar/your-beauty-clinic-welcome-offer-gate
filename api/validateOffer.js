import fetch from 'node-fetch';

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

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`,
    ];

    let contact = null;

    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.contact) {
        contact = data.contact;
        break;
      }
    }

    if (!contact) {
      console.error("❌ No contact found after both endpoints");
      return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
    }

    // === TAG CHECK (unchanged & working) ===
    const hasTag =
      Array.isArray(contact.tags) &&
      contact.tags.some(tag => tag.toLowerCase().trim() === "sent welcome offer tracking link");

    console.log("🏷️ Contact tags:", contact.tags);
    console.log("✅ hasTag:", hasTag);

    // === CUSTOM FIELD CHECKS ===
    let welcomeOfferAccess = false;
    let offerBooked = false;

    if (Array.isArray(contact.customField)) {
      for (const field of contact.customField) {
        const value = typeof field.value === "string" ? field.value.toLowerCase().trim() : String(field.value || "").toLowerCase();

        if (value === "yes") {
          if (field.id === "welcomeOfferAccessFieldId") welcomeOfferAccess = true;
          if (field.id === "offerBookedFieldId") offerBooked = true;
        }
      }
    }

    console.log("🧩 Field Checks → welcomeOfferAccess:", welcomeOfferAccess, "| offerBooked:", offerBooked);

    // === FINAL LOGIC ===
    const valid = hasTag && welcomeOfferAccess && !offerBooked;

    const redirectTo = valid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?contactId=${contact.id}`
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("➡️ Redirecting to:", redirectTo);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.redirect(302, redirectTo);
  } catch (error) {
    console.error("🔥 Error in validateOffer:", error);
    return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
  }
}
