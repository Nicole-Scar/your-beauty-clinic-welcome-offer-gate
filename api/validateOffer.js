export default async function handler(req, res) {
  const { contactId } = req.query;

  if (!contactId) return res.status(400).json({ error: "Missing contactId" });

  const GHL_API_KEY = process.env.GHL_API_KEY?.trim();
  if (!GHL_API_KEY) return res.status(401).json({ error: "Missing GHL API key" });

  const endpoint = `https://api.gohighlevel.com/v1/contacts/${contactId}`;
  const debug = { contactId, apiKeyPresent: !!GHL_API_KEY, endpoint };

  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` },
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      return res.status(response.status).json({ ...debug, error: "API error", details: json });
    }

    const contact = json?.contact || {};
    const customFields = Array.isArray(contact.customField) ? contact.customField : [];
    const tags = Array.isArray(contact.tags) ? contact.tags : [];

    const welcomeOfferAccess =
      customFields.find((f) => f.name === "welcomeOfferAccess")?.value === "Yes";
    const offerBooked =
      customFields.find((f) => f.name === "offerBooked")?.value === "Yes";
    const hasTag = tags.includes("sent welcome offer tracking link");

    return res.status(200).json({ debug, contactFound: !!contact.id, welcomeOfferAccess, offerBooked, hasTag });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ ...debug, error: "Server error in validateOffer", details: err.message });
  }
}
