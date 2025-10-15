export default async function handler(req, res) {
  const { contactId } = req.query;

  if (!contactId) return res.status(400).json({ error: "Missing contactId" });

  const GHL_API_KEY = process.env.GHL_API_KEY?.trim();
  if (!GHL_API_KEY) return res.status(401).json({ error: "Missing GHL API key" });

  const endpoint = `https://api-eu1.gohighlevel.com/v1/contacts/${contactId}`;

  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` },
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.contact) {
      return res.status(200).json({
        contactFound: false,
        redirectTo: "/invalid",
        message: "Contact not found or fetch failed",
      });
    }

    const contact = json.contact;
    const customFields = Array.isArray(contact.customField) ? contact.customField : [];
    const tags = Array.isArray(contact.tags) ? contact.tags : [];

    const welcomeOfferAccess = customFields.find(f => f.name === "welcomeOfferAccess")?.value === "Yes";
    const offerBooked = customFields.find(f => f.name === "offerBooked")?.value === "Yes";
    const hasTag = tags.includes("sent welcome offer tracking link");

    const redirectTo = (welcomeOfferAccess && !offerBooked && hasTag) ? "/valid" : "/invalid";

    res.status(200).json({
      contactFound: true,
      welcomeOfferAccess,
      offerBooked,
      hasTag,
      redirectTo
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
