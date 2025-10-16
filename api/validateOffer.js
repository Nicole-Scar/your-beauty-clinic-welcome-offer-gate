// File: /api/validateOffer.js

export default async function handler(req, res) {
  try {
    const { contactId } = req.query;
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!contactId) return res.status(400).send("Missing contactId");
    if (!apiKey || !locationId) return res.status(500).send("Missing API credentials");

    // ✅ GHL REST API endpoint (this one works!)
    const url = `https://rest.gohighlevel.com/v1/contacts/${contactId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await response.json();

    if (!data.contact) return res.status(404).send("Contact not found");

    const contact = data.contact;
    const tags = contact.tags || [];

    // ✅ Check for your target tag
    const hasTrackingTag = tags.includes("sent welcome offer tracking link");

    // Redirect logic
    if (hasTrackingTag) {
      // Contact already received the offer link
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-valid-340971"
      );
    } else {
      // No tag found — invalid or not yet sent
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-874321"
      );
    }
  } catch (error) {
    console.error("Error in validateOffer:", error);
    res.status(500).send("Server error");
  }
}
