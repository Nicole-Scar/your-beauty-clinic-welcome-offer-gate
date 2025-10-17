import fetch from 'node-fetch';

export default async function validateOffer(req, res) {
  try {
    const contactId = req.query.ref || req.query.contactId;

    if (!contactId) {
      console.log("❌ No contactId found in URL");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🕹️ validateOffer called, contactId:", contactId);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact;

    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
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
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    // Flatten all tags + customField values into a single array
    const allTags = [
      ...(Array.isArray(contact.tags) ? contact.tags : []),
      ...(Array.isArray(contact.customField)
        ? contact.customField.map(f => f.value).filter(v => typeof v === "string")
        : []),
    ];

    const hasTrackingTag = allTags.includes("sent welcome offer tracking link");

    const validPage = `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?ref=${contactId}`;
    const invalidPage = "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    const redirectTo = hasTrackingTag ? validPage : invalidPage;

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, redirectTo);

  } catch (error) {
    console.error("🔥 Error in validateOffer:", error);
    return res.status(500).send("Server error");
  }
}
