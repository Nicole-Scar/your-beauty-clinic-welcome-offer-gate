import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const contactId = req.query.contactId;

    if (!contactId) {
      console.error("❌ Missing contactId");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🕹️ validateOffer called, contactId:", contactId);

    const API_KEY = process.env.GHL_API_KEY; // stored in Vercel
    const LOCATION_ID = process.env.GHL_LOCATION_ID; // stored in Vercel

    // Try endpoints
    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${LOCATION_ID}/contacts/${contactId}`,
    ];

    let contact;
    let endpointUsed;

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.contact) {
          contact = data.contact;
          endpointUsed = url;
          console.log("✅ Contact fetched:", contact.id);
          console.log("🔹 Full contact object:", JSON.stringify(contact, null, 2));
          break;
        }
      } catch (err) {
        console.warn(`⚠️ Could not fetch from ${url}:`, err.message);
      }
    }

    if (!contact) {
      console.error("❌ Could not fetch contact from any endpoint");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    // Check if contact has the tag
    const hasTrackingTag = contact.tags?.includes("sent welcome offer tracking link");
    console.log("Has tracking tag?", hasTrackingTag);

    if (hasTrackingTag) {
      return res.redirect(
        302,
        `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?contactId=${contact.id}`
      );
    } else {
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }
  } catch (error) {
    console.error("Error in validateOffer:", error);
    res.status(500).send("Server error");
  }
}
