export default async function handler(req, res) {
  const { contactId } = req.query;

  if (!contactId) return res.status(400).json({ error: "Missing contactId" });

  const GHL_API_KEY = process.env.GHL_API_KEY?.trim();
  if (!GHL_API_KEY) return res.status(401).json({ error: "Missing GHL API key" });

  // Global GHL endpoint (fallback if EU fetch fails)
  const endpoints = [
    `https://api-eu1.gohighlevel.com/v1/contacts/${contactId}`,
    `https://api.gohighlevel.com/v1/contacts/${contactId}`
  ];

  const debug = { contactId, apiKeyPresent: !!GHL_API_KEY, triedEndpoints: [] };

  let contact = null;

  for (const url of endpoints) {
    try {
      debug.triedEndpoints.push(url);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` },
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.contact) {
        contact = json.contact;
        break; // success
      }
    } catch (err) {
      // log but continue to next endpoint
      console.error("Fetch failed for", url, err.message);
    }
  }

  // If no contact found, redirect to /invalid
  if (!contact) {
    return res.status(200).json({
      debug,
      contactFound: false,
      redirectTo: "/invalid",
      message: "Contact not found or fetch failed"
    });
  }

  // Safe parsing
  const customFields = Array.isArray(contact.customField) ? contact.customField : [];
  const tags = Array.isArray(contact.tags) ? contact.tags : [];

  const welcomeOfferAccess =
    customFields.find(f => f.name === "welcomeOfferAccess")?.value === "Yes";
  const offerBooked =
    customFields.find(f => f.name === "offerBooked")?.value === "Yes";
  const hasTag = tags.includes("sent welcome offer tracking link");

  const redirectTo = (welcomeOfferAccess && !offerBooked && hasTag) ? "/valid" : "/invalid";

  return res.status(200).json({
    debug,
    contactFound: true,
    welcomeOfferAccess,
    offerBooked,
    hasTag,
    redirectTo
  });
}
