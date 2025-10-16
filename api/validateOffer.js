import fetch from "node-fetch";

export default async function handler(req, res) {
  const contactId = req.query.contactId;
  const apiKey = process.env.GHL_API_KEY; // Make sure your API Key is set in Vercel
  const locationId = process.env.GHL_LOCATION_ID; // Optional if you use location-based fetch

  if (!contactId) {
    console.error("❌ Missing contactId in request");
    return res.status(400).send("Missing contactId");
  }

  console.log("🕹️ validateOffer called, contactId:", contactId);
  console.log("API Key (masked):", apiKey?.slice(0, 10) + "...");

  try {
    // Fetch contact from the global endpoint
    const contactRes = await fetch(`https://rest.gohighlevel.com/v1/contacts/${contactId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const contactData = await contactRes.json();
    console.log("🔹 Raw API response:", contactData);

    // Check for the "sent welcome offer tracking link" tag
    const tags = contactData?.contact?.tags || [];
    const hasTrackingTag = tags.includes("sent welcome offer tracking link");
    console.log("Has tracking tag?", hasTrackingTag);

    // Redirect logic with explicit logging
    if (hasTrackingTag) {
      console.log("➡️ Redirecting to VALID page");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-valid-340971"
      );
    } else {
      console.log("➡️ Redirecting to INVALID page");
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
