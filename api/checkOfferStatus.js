export default async function checkOfferStatus(req, res) {
  try {
    const fetch = (await import('node-fetch')).default;

    // ---------- HEADERS ----------
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // ---------- CONTACT ID ----------
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

    // ---------- CHECK WELCOME OFFER ACTIVE ----------
    const cfArray = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));

    let offerActive = false;

    for (const f of cfArray) {
      const name = String(f.name || f.label || '').trim().toLowerCase();
      const value = String(f.value || '').trim().toLowerCase();

      if (name === 'welcome offer active' && ['yes','true','1'].includes(value)) {
        offerActive = true;
        console.log("🧪 Matched Welcome Offer Active field:", { name: f.name, value });
        break;
      }
    }

    // ---------- OPTIONAL: CHECK TAG ----------
    const tags = Array.isArray(contact.tags) ? contact.tags.map(t => String(t).trim().toLowerCase()) : [];
    if (!tags.includes('welcome offer opt-in')) {
      offerActive = false;
    }

    console.log("🧪 checkOfferStatus result:", { contactId, offerActive });

    return res.status(200).json({ offerActive });

  } catch (err) {
    console.error("🔥 Error in checkOfferStatus:", err);
    return res.status(500).json({ offerActive: false });
  }
}
