import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { contactId } = req.query;

  console.log("🕹️ validateOffer called, contactId:", contactId);

  // Load API key from environment variables
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) {
    console.error("❌ Missing API key in environment variables");
    return res.status(500).json({ error: "Missing API key" });
  }

  const maskedKey = apiKey.slice(0, 4) + "…" + apiKey.slice(-4);
  console.log("API Key (masked):", maskedKey);

  const locationId = "izQwdnA1xbbcTt7Z7wzU"; // ✅ confirmed correct

  // All possible endpoints (including alternate domains)
  const endpoints = [
    `https://api.gohighlevel.com/v1/contacts/${contactId}`,
    `https://api.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`,
    `https://services.leadconnectorhq.com/contacts/${contactId}`,
    `https://services.leadconnectorhq.com/locations/${locationId}/contacts/${contactId}`,
    `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
    `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
  ];

  let contactData = null;

  for (const url of endpoints) {
    console.log(`🔹 Trying endpoint: ${url}`);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const data = await response.json();
      console.log("Raw API response:", data);

      // Break if the response looks valid
      if (response.ok && data && !data.msg?.includes("Not found")) {
        console.log(`✅ Success with endpoint: ${url}`);
        contactData = data;
        break;
      }
    } catch (error) {
      console.error(`⚠️ Error calling ${url}:`, error.message);
    }
  }

  if (!contactData) {
    console.error("❌ Could not fetch contact from any endpoint");
    return res.status(404).json({ error: "Contact not found in any endpoint" });
  }

  res.status(200).json({ contactData });
}
