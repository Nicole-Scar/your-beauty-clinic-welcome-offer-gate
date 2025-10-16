import fetch from "node-fetch";

export default async function handler(req, res) {
  const contactId = req.query.contactId;

  if (!contactId) {
    console.error("❌ Missing contactId in request");
    return res.status(400).send("Missing contactId");
  }

  console.log("🕹️ validateOffer called, contactId:", contactId);

  const API_KEY = process.env.GHL_API_KEY; // keep in Vercel Environment Variables
  const LOCATION_ID = process.env.GHL_LOCATION_ID; // optional, if needed

  // Use the endpoint that you know works
  const endpoint = `https://rest.gohighlevel.com/v1/contacts/${contactId}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`❌ Fetch failed from ${endpoint} - Status: ${response.status}`);
      const text = await response.text();
      console.error("Raw API response:", text);
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-874321"
      );
    }

    const data = await response.json();

    console.log("✅ Contact fetched:", data);

    // Check if the contact has the exact tag
    const hasTrackingTag = data.contact.tags?.some(
      tag => tag.toLowerCase().trim() === "sent welcome offer tracking link"
    );

    console.log("Has tracking tag?", hasTrackingTag);

    // Redirect based on tag presence
    if (hasTrackingTag) {
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-valid-340971"
      );
    } else {
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-874321"
      );
    }
  } catch (error) {
    console.error("Error in validateOffer:", error);
    return res.status(500).send("Server error");
  }
}
