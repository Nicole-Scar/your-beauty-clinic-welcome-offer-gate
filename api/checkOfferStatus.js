function norm(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

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

    // --- Extract custom fields ---
    const cfArray = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));

    let offerActive = false;
    let expiryDate = null;
    let expiryRawValue = null; // for logging

    for (const f of cfArray) {
      const name = normLower(f.name || f.label || '');
      const val = norm(f.value);

      if (name.includes('expiry') || name.includes('expiration')) {
        expiryRawValue = val; // capture raw value for logs

        // Parse date reliably
        let parsedDate = null;
        const cleaned = val.replace(/(\d+)(st|nd|rd|th)/gi, "$1").trim();

        // Try ISO YYYY-MM-DD first
        const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          const [_, year, month, day] = isoMatch;
          parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          parsedDate = new Date(cleaned);
        }

        if (!isNaN(parsedDate.getTime())) {
          expiryDate = parsedDate;
          offerActive = parsedDate >= new Date(); // Active if expiry is today or later
          break; // stop after first valid expiry field
        } else {
          console.warn("⚠️ Invalid date in expiry field:", { name: f.name, value: f.value });
        }
      }
    }

    // --- DEBUG LOG ---
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
