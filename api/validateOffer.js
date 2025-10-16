import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const { contactId } = req.query;
    if (!contactId) {
      return res.status(400).json({ error: "Missing contactId" });
    }

    const API_KEY = process.env.GHL_API_KEY;
    const LOCATION_ID = process.env.GHL_LOCATION_ID;

    // Fetch contact
    const endpoint = `https://rest.gohighlevel.com/v1/contacts/${contactId}`;
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    const contact = await response.json();

    if (!contact || contact.msg === "Not found") {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Check for "sent welcome offer tracking link" tag
    const hasTrackingTag = contact.contact?.tags?.includes("sent welcome offer tracking link");

    console.log("Has tracking tag?", hasTrackingTag);

    // Return redirect URL as JSON
    const redirectTo = hasTrackingTag
      ? "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-valid-340971"
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-874321";

    return res.status(200).json({ contactId, redirectTo, hasTrackingTag });

  } catch (error) {
    console.error("Error in validateOffer:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
