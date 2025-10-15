export default async function handler(req, res) {
  try {
    const { contactId, testEnv } = req.query;

    const GHL_API_KEY = process.env.GHL_API_KEY;
    const endpoint = contactId
      ? `https://api-eu1.gohighlevel.com/v1/contacts/${contactId}`
      : null;

    // 🔍 Environment test
    if (testEnv) {
      return res.status(200).json({ envFound: !!GHL_API_KEY });
    }

    if (!contactId) {
      return res.status(400).json({ error: 'Missing contactId' });
    }

    if (!GHL_API_KEY) {
      return res.status(401).json({ error: 'Missing GHL API key' });
    }

    // Fetch from GHL
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` },
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Error fetching contact',
        details: json,
      });
    }

    const contact = json.contact || {};
    const cf = contact.customField || {};
    const tags = contact.tags || [];

    // Handle both possible formats
    let welcomeOfferAccess = false;
    let offerBooked = false;

    if (Array.isArray(cf)) {
      welcomeOfferAccess =
        cf.find((f) => f.name === 'welcomeOfferAccess')?.value === 'Yes';
      offerBooked = cf.find((f) => f.name === 'offerBooked')?.value === 'Yes';
    } else {
      welcomeOfferAccess = cf['welcomeOfferAccess'] === 'Yes';
      offerBooked = cf['offerBooked'] === 'Yes';
    }

    let hasTag = false;
    if (Array.isArray(tags)) {
      if (typeof tags[0] === 'string') {
        hasTag = tags.includes('sent welcome offer tracking link');
      } else if (typeof tags[0] === 'object') {
        hasTag = tags.some((t) => t.name === 'sent welcome offer tracking link');
      }
    }

    return res.status(200).json({
      contactId,
      welcomeOfferAccess,
      offerBooked,
      hasTag,
      isValid: welcomeOfferAccess && !offerBooked && hasTag,
      debug: { endpoint, fetchedCustomFields: cf, fetchedTags: tags },
    });
  } catch (err) {
    console.error('❌ validateOffer crashed:', err);
    return res.status(500).json({
      error: 'Server error in validateOffer function',
      details: err.message,
    });
  }
}
