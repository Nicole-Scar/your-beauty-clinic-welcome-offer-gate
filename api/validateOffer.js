import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { contactId } = req.query;

    if (!contactId) {
      console.error("❌ Missing contactId");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🕹️ validateOffer called, contactId:", contactId);

    const API_KEY = process.env.GHL_API_KEY;
    const LOCATION_ID = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${LOCATION_ID}/contacts/${contactId}`
    ];

    let contact = null;
    let endpointUsed = null;

    for (const url of endpoints) {
      try {
        console.log("🔹 Trying endpoint:", url);
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${API_KEY}` }
        });

        const data = await response.json();

        if (data.contact) {
          contact = data.contact;
          endpointUsed = url;
          console.log("✅ Contact fetched:", contact.id);
          break;
        } else {
          console.warn("⚠️ No contact in response from", url, data);
        }
      } catch (err) {
        console.error("⚠️ Could not fetch contact from", url, err);
      }
    }

    if (!contact) {
      console.error("❌ Could not fetch contact from any endpoint");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    const hasTrackingTag = contact.tags?.includes(
      "sent welcome offer tracking link"
    );
    console.log("🔹 Endpoint used:", endpointUsed);
    console.log("Has tracking tag?", hasTrackingTag);

    if (hasTrackingTag) {
      // Append contactId to correct valid link
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
    return res.status(500).send("Server error");
  }
}
