import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { contactId } = req.query;

  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const endpoint = `https://api-eu1.gohighlevel.com/v1/contacts/${contactId}`;

  if (!GHL_API_KEY) {
    return res.status(401).json({ error: 'Missing GHL API key' });
  }

  const debug = { apiKeyPresent: !!GHL_API_KEY, endpoint };

  try {
    // Fetch contact from GHL
    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${GHL_API_KEY}` },
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        debug,
        error: 'Error fetching contact from GHL',
        details: json,
      });
    }

    const contact = json.contact || {};
    const cf = contact.customField || {};
    const tags = contact.tags || [];

    // Handle both custom field formats (object or array)
    let welcomeOfferAccess = false;
    let offerBooked = false;

    if (Array.isArray(cf)) {
      // Format: [{ name: "welcomeOfferAccess", value: "Yes" }, ...]
      welcomeOfferAccess = cf.find(f => f.name === 'welcomeOfferAccess')?.value === 'Yes';
      offerBooked = cf.find(f => f.name === 'offerBooked')?.value === 'Yes';
    } else if (typeof cf === 'object') {
      // Format: { welcomeOfferAccess: "Yes", offerBooked: "No" } or { cf_123: "Yes" }
      welcomeOfferAccess = cf['welcomeOfferAccess'] === 'Yes';
      offerBooked = cf['offerBooked'] === 'Yes';
    }

    // Handle tag formats (array of strings or objects)
    let hasTag = false;
    if (Array.isArray(tags)) {
      if (tags.length && typeof tags[0] === 'string') {
        hasTag = tags.includes('sent welcome offer tracking link');
      } else if (tags.length && typeof tags[0] === 'object') {
        hasTag = tags.some(t => t.name === 'sent welcome offer tracking link');
      }
    }

    // Respond
    return res.status(200).json({
      debug: {
        ...debug,
        fetchedCustomFields: cf,
        fetchedTags: tags,
      },
      contactId,
      welcomeOfferAccess,
      offerBooked,
      hasTag,
      isValid:
        contact &&
        welcomeOfferAccess &&
        !offerBooked &&
        hasTag,
    });

  } catch (err) {
    console.error('❌ Serverless function error:', err);
    return res.status(500).json({
      debug,
      error: 'Server error in validateOffer function',
      details: err.message,
    });
  }
}
