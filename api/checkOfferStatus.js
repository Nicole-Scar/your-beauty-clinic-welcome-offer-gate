export default async function checkOfferStatus(req, res) {
  try {
    const fetch = (await import('node-fetch')).default;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

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
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));

    let offerActive = false;
    let expiryDate = null;
    let expiryRawValue = null;
    let expiryFieldName = null;

    for (const f of cfArray) {
      const name = String(f.name || '').trim();
      const val = Array.isArray(f.value) ? f.value[0] : f.value;
      if (!val) continue;

      if (name.toLowerCase() === 'welcome offer expiry') {
        expiryRawValue = val;
        expiryFieldName = name;
        const parsedDate = new Date(val);
        if (!isNaN(parsedDate.getTime())) {
          expiryDate = parsedDate;
          offerActive = parsedDate >= new Date();
        }
        break; // stop at the matching field
      }
    }

    console.log("🧪 checkOfferStatus result:", {
      contactId,
      expiryFieldName,
      expiryRawValue,
      expiryDate: expiryDate ? expiryDate.toISOString().slice(0, 10) : null,
      offerActive
    });

    return res.status(200).json({ offerActive });

  } catch (err) {
    console.error("🔥 Error in checkOfferStatus:", err);
    return res.status(500).json({ offerActive: false });
  }
}
