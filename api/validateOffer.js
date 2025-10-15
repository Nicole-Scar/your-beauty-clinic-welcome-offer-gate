// api/validateOffer.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const { contactId } = req.query;

  // 🧩 Step 1: Validate input
  if (!contactId) {
    return res.status(400).json({ error: "Missing contactId" });
  }

  const GHL_API_KEY = process.env.GHL_API_KEY?.trim();
  const endpoint = `https://api.gohighlevel.com/v1/contacts/${contactId}`;

  const debug = {
    contactId,
    apiKeyPresent: !!GHL_API_KEY,
    endpoint,
  };

  // 🧩 Step 2: Ensure API key exists
  if (!GHL_API_KEY) {
    return res.status(401).json({ ...debug, error: "Missing GHL API key" });
  }

  try {
    // 🧪 Step 3: Test network connectivity
    try {
      const test = await fetch("https://api.gohighlevel.com/v1/");
      if (test.ok) {
        console.log("🌍 Network test to GHL Global succeeded");
      } else {
        console.error("⚠️ Network test to GHL Global returned non-OK", test.status);
      }
    } catch (err) {
      console.error("🌍 Network test to GHL Global failed:", err.message);
    }

    // 🧩 Step 4: Fetch contact data
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
      },
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      return res.status(response.status).json({
        ...debug,
        error: "Server error fetching contact data",
        details: JSON.stringify(json),
      });
    }

    // 🧩 Step 5: Parse contact data
    const contact = json.contact || {};
    const customFields = contact.customField || [];
    const tags = contact.tags || [];

    const welcomeOfferAccess =
      customFields.find((f) => f.name === "welcomeOfferAccess")?.value === "Yes";
    const offerBooked =
      customFields.find((f) => f.name === "offerBooked")?.value === "Yes";
    const hasTag = tags.includes("sent welcome offer tracking link");

    // 🧩 Step 6: Return structured response
    res.json({
      debug,
      contactFound: !!contact.id,
      welcomeOfferAccess,
      offerBooked,
      hasTag,
      contact,
    });
  } catch (err) {
    console.error("❌ Server error in validateOffer function:", err);
    res.status(500).json({
      ...debug,
      error: "Server error in validateOffer function",
      details: err.message,
    });
  }
}
