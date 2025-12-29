export default async function checkOfferStatus(req, res) {
  try {
    const fetch = (await import('node-fetch')).default;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    const { contactId } = req.query;
    if (!contactId) {
      return res.status(200).json({ valid: false });
    }

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;

    for (const url of endpoints) {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const j = await r.json().catch(() => ({}));
      const c = j.contact || j;
      if (r.ok && c?.id) {
        contact = c;
        break;
      }
    }

    if (!contact || !Array.isArray(contact.customField)) {
      return res.status(200).json({ valid: false });
    }

    // ✅ NAME-BASED MATCH (no IDs, no guessing)
    const expiryField = contact.customField.find(f =>
      String(f.name).trim().toLowerCase() === 'welcome offer expiry'
    );

    if (!expiryField?.value) {
      return res.status(200).json({ valid: false });
    }

    const expiry = new Date(String(expiryField.value).trim());
    const valid = !isNaN(expiry) && expiry >= new Date();

    console.log('🧪 Offer check:', {
      contactId,
      field: expiryField.name,
      value: expiryField.value,
      valid
    });

    return res.status(200).json({ valid });

  } catch (err) {
    console.error('🔥 checkOfferStatus error:', err);
    return res.status(200).json({ valid: false });
  }
}
