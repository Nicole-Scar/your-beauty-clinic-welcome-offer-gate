// api/validateOffer.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { contactId } = req.query;

    if (!contactId) {
      return res.status(400).json({ error: "Missing contactId" });
    }

    console.log("🕹️ validateOffer called, contactId:", contactId);

    // Use ONLY the working endpoint
    const contactUrl = `https://rest.gohighlevel.com/v1/contacts/${contactId}`;
    const headers = {
      Authorization: `Bearer ${process.env.GHL_API_KEY}`, // API Key stored in Vercel
    };

    const response = await fetch(contactUrl, { headers });
    const data = await response.json();

    console.log("Raw API response:", data);

    if (!data.contact) {
      // Contact not found
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-874321"
      );
    }

    // Check if contact has the "sent welcome offer tracking link" tag
    const hasTrackingTag = data.contact.tags?.includes(
      "sent welcome offer tracking link"
    );

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
