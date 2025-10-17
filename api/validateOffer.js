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

    // Tag check
    const hasTrackingTag = Array.isArray(contact.tags)
      ? contact.tags.includes("sent welcome offer tracking link")
      : false;

    // Custom field checks
    const fields = contact.customField || contact.customFields || [];
    console.log("🧠 Custom fields found:", fields);

    const getField = (name) => {
      const field = fields.find(f =>
        f.name?.toLowerCase() === name.toLowerCase()
      );
      return field?.value?.trim().toLowerCase() || "";
    };

    const welcomeOfferAccess = getField("welcomeOfferAccess");
    const offerBooked = getField("offerBooked");

    console.log("🎯 welcomeOfferAccess:", welcomeOfferAccess);
    console.log("🎯 offerBooked:", offerBooked);

    // Define access logic
    const canAccess =
      hasTrackingTag &&
      (welcomeOfferAccess === "yes" || welcomeOfferAccess === "true") &&
      (offerBooked === "no" || offerBooked === "false" || offerBooked === "");

    const validPage = `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?contactId=${contact.id}`;
    const invalidPage = "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    const redirectTo = canAccess ? validPage : invalidPage;

    console.log("✅ hasTrackingTag:", hasTrackingTag);
    console.log("➡️ Redirecting to:", redirectTo);

    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, redirectTo);

  } catch (error) {
    console.error("🔥 Error in validateOffer:", error);
    return res.status(500).send("Server error");
  }
}
