export default async function handler(req, res) {
  const fetch = (await import('node-fetch')).default;
  console.log("🟢 checkOfferStatus triggered");


  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { contactId } = req.query;
    if (!contactId) {
      console.log("❌ Missing contactId");
      return res.status(400).json({ offerActive: false });
    }

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      console.log(`🔹 Fetching ${endpoint}`);
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}` } });
      const data = await response.json().catch(() => ({}));
      contact = data.contact || data;
      if (response.ok && contact && (contact.id || contact.contact)) break;
    }

    if (!contact) {
      console.log("❌ Contact not found");
      return res.status(404).json({ offerActive: false });
    }

    console.log("📄 Contact data:", JSON.stringify(contact));

    const cfArray = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([name, value]) => ({ name, value }));

    let offerActive = false;
    let expiryDate = null;

    for (const f of cfArray) {
      const val = Array.isArray(f.value) ? f.value[0] : f.value;
      if (!val) continue;

      const name = String(f.name || '').trim().toLowerCase();
      const strVal = String(val).trim();

      if (name === 'welcome offer active' && strVal.toLowerCase() === 'yes') offerActive = true;
      if (name === 'welcome offer expiry') {
        const parsed = new Date(strVal);
        if (!isNaN(parsed.getTime())) {
          expiryDate = parsed;
          if (parsed < new Date()) offerActive = false;
        }
      }
    }

    console.log("🧪 checkOfferStatus result:", { offerActive, expiryDate });
    return res.status(200).json({ offerActive });

  } catch (err) {
    console.error("🔥 checkOfferStatus error:", err);
    return res.status(500).json({ offerActive: false });
  }
}
