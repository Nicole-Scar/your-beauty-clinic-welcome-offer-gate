// FILE: checkOfferStatus.js

export default async function handler(req, res) {
  try {
    const fetch = (await import('node-fetch')).default;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { contactId } = req.query;
    if (!contactId) return res.status(400).json({ offerActive: false });

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = data.contact || candidate;
        break;
      }
    }

    if (!contact) return res.status(404).json({ offerActive: false });

    const cfArray = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([name, value]) => ({ name, value }));

    let offerActive = false;
    let expiryDate = null;
    let expiryRawValue = null;

    for (const f of cfArray) {
      const val = Array.isArray(f.value) ? f.value[0] : f.value;
      if (!val) continue;

      const name = String(f.name || '').trim().toLowerCase();
      if (name === 'welcome offer expiry') {
        expiryRawValue = String(val).trim();
        const parsed = new Date(expiryRawValue);
        if (!isNaN(parsed.getTime())) {
          expiryDate = parsed;
          if (expiryDate >= new Date()) offerActive = true; // active only if not expired
        }
      }
    }

    console.log("🧪 checkOfferStatus log:", {
      contactId,
      expiryRawValue,
      expiryDate,
      offerActive,
      customFields: cfArray.map(f => ({ name: f.name, value: f.value }))
    });

    return res.status(200).json({ offerActive });

  } catch (err) {
    console.error("🔥 Error in checkOfferStatus:", err);
    return res.status(500).json({ offerActive: false });
  }
}
