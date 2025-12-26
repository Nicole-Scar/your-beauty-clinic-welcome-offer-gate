export default async function checkOfferStatus(req, res) {
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

    // ---------- Check expiry date ----------
    const cfArray = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));

    let offerActive = false;
    for (const f of cfArray) {
      const name = String(f.name || f.label || '').trim().toLowerCase();
      const value = String(f.value || '').trim();

      if (name.includes('expiry') || name.includes('expiration')) {
        const expiryDate = new Date(value);
        if (!isNaN(expiryDate.getTime()) && new Date() <= expiryDate) {
          offerActive = true;
        }
        break;
      }
    }

    // ---------- Optional: check tag ----------
    const tags = Array.isArray(contact.tags) ? contact.tags.map(t => String(t).trim().toLowerCase()) : [];
    if (!tags.includes('welcome offer opt-in')) {
      offerActive = false;
    }

    return res.status(200).json({ offerActive });

  } catch (err) {
    console.error("🔥 Error in checkOfferStatus:", err);
    return res.status(500).json({ offerActive: false });
  }
}
