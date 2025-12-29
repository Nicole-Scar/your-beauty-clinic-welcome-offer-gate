// File: /api/checkOfferStatus.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { contactId } = req.query;
  if (!contactId) {
    console.log("❌ Missing contactId");
    return res.status(400).json({ offerActive: false });
  }

  try {
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
        contact = candidate;
        break;
      } else {
        console.log(`❌ Failed to fetch from ${endpoint} - Status: ${response.status}`);
      }
    }

    if (!contact) {
      console.log("❌ Contact not found");
      return res.status(404).json({ offerActive: false });
    }

    // Extract custom fields
    const cfArray = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([name, value]) => ({ name, value }));

    let expiryRawValue = null;
    let expiryFieldName = null;
    let expiryDate = null;
    let offerActive = false;

    for (const f of cfArray) {
      const name = String(f.name || '').trim();
      let val = Array.isArray(f.value) ? f.value[0] : f.value;
      if (!val) continue;

      if (name.toLowerCase() === 'welcome offer expiry') {
        expiryRawValue = val;
        expiryFieldName = name;
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
          expiryDate = parsed;
          offerActive = parsed >= new Date();
        }
        break; // stop at first matching field
      }
    }

    console.log("🧪 checkOfferStatus result:", { contactId, expiryFieldName, expiryRawValue, expiryDate, offerActive });

    return res.status(200).json({ offerActive });
  } catch (err) {
    console.error("🔥 Error in checkOfferStatus:", err);
    return res.status(500).json({ offerActive: false });
  }
}
