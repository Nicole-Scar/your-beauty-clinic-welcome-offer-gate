import fetch from 'node-fetch';

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;

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

    // Try each endpoint until we fetch the contact
    for (const endpoint of endpoints) {
      console.log("🔹 Trying endpoint:", endpoint);
      const response = await fetch(endpoint, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("🔸 Raw response keys:", Object.keys(data));

      if (response.ok && data.contact) {
        contact = data.contact;
        console.log("✅ Contact fetched:", contact.id);
        break;
      } else {
        console.log(`❌ Failed from ${endpoint} - Status: ${response.status}`);
      }
    }

    if (!contact) {
      console.error("❌ No contact found after all endpoints");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🧩 Contact tags found:", contact.tags);

    // Keep the existing tag check exactly as before
    const hasTrackingTag = Array.isArray(contact.tags)
      ? contact.tags.includes("sent welcome offer tracking link")
      : false;
    console.log("✅ hasTrackingTag result:", hasTrackingTag);

    // Get custom field values
    const customFields = contact.customField || [];
    const getField = (fieldName) => {
      const field = customFields.find(f => f.name === fieldName || f.label === fieldName);
      return field ? field.value : null;
    };

    const welcomeOfferAccess = getField("welcomeOfferAccess");
    const offerBooked = getField("offerBooked");

    console.log("🧩 Custom fields:", { welcomeOfferAccess, offerBooked });

    // Logic:
    // valid page ONLY if tag is present AND welcomeOfferAccess = "Yes" AND offerBooked != "Yes"
    const isValid = hasTrackingTag &&
                    welcomeOfferAccess === "Yes" &&
                    offerBooked !== "Yes";

    const validPage = `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?contactId=${contact.id}`;
    const invalidPage = "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    const redirectTo = isValid ? validPage : invalidPage;
    console.log("➡️ Redirecting to:", redirectTo);

    // Prevent caching to ensure fresh validation
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, redirectTo);

  } catch (error) {
    console.error("🔥 Error in validateOffer:", error);
    return res.status(500).send("Server error");
  }
}
