import fetch from "node-fetch";

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;

    if (!contactId) {
      console.error("❌ Missing contactId in query");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🕹️ validateOffer called, contactId:", contactId);

    const API_KEY = process.env.GHL_API_KEY; // stored in Vercel
    const LOCATION_ID = process.env.GHL_LOCATION_ID; // stored in Vercel

    // Fetch contact from the working endpoint
    const endpoint = `https://rest.gohighlevel.com/v1/contacts/${contactId}`;
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("❌ Fetch failed from", endpoint, "- Status:", response.status);
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    const data = await response.json();
    console.log("✅ Contact fetched:", data.id);

    // Check if the contact has the "sent welcome offer tracking link" tag
    const hasTrackingTag = data.tags?.includes("sent welcome offer tracking link");
    console.log("Has tracking tag?", hasTrackingTag);

    if (hasTrackingTag) {
      // Redirect to the VALID page
      console.log("➡️ Redirecting to valid page");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-valid-340971"
      );
    } else {
      // Redirect to the INVALID page
      console.log("➡️ Redirecting to invalid page");
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
