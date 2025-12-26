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

    // --- Extract custom fields robustly ---
    const cfArray = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));

    let offerActive = false;
    let expiryDate = null;
    let expiryRawValue = null;

    for (const f of cfArray) {
      const val = Array.isArray(f.value) ? f.value[0] : f.value; // handle array values
      if (!val) continue;

      const strVal = String(val).trim();

      // Basic date check: YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(strVal) || !isNaN(new Date(strVal).getTime())) {
        expiryRawValue = strVal;
        const parsedDate = new Date(strVal);
        if (!isNaN(parsedDate.getTime())) {
          expiryDate = parsedDate;
          offerActive = parsedDate >= new Date();
          break; // stop at first valid date
        }
      }
    }

    console.log("🧪 checkOfferStatus result:", {
      contactId,
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
