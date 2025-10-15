export default async function handler(req, res) {
  const { contactId, testEnv } = req.query;
  const GHL_API_KEY = process.env.GHL_API_KEY;

  // Quick environment test
  if (testEnv) {
    return res.status(200).json({ envFound: !!GHL_API_KEY });
  }

  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }

  if (!GHL_API_KEY) {
    return res.status(401).json({ error: 'Missing GHL API key' });
  }

  const baseUrls = [
    'https://api-eu1.gohighlevel.com',
    'https://api-eu2.gohighlevel.com',
    'https://api-uk.gohighlevel.com',
    'https://api.gohighlevel.com',
  ];

  let json = null;
  let usedEndpoint = null;
  let lastError = null;

  for (const base of baseUrls) {
    try {
      const endpoint = `${base}/v1/contacts/${contactId}`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` },
      });

      if (response.ok) {
        json = await response.json();
        usedEndpoint = endpoint;
        break;
      } else {
        const errData = await response.text();
        console.log(`❌ Failed [${base}] → ${response.status}: ${errData}`);
        lastError = `${response.status}: ${errData}`;
      }
    } catch (err) {
      console.log(`⚠️ Network error on ${base}:`, err.message);
      lastError = err.message;
    }
  }

  if (!json) {
    return res.status(502).json({
      error: 'All endpoint attempts failed',
      details: lastError,
    });
  }

  const contact = json.contact || {};
  const cf = contact.customField || {};
  const tags = contact.tags || [];

  // Handle both possible formats of custom fields
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

  // Handle both possible formats of tags
  let hasTag = false;
  if (Array.isArray(tags)) {
    if (typeof tags[0] === 'string') {
      hasTag = tags.includes('sent welcome offer tracking link');
    } else if (typeof tags[0] === 'object') {
      hasTag = tags.some(
        (t) => t.name === 'sent welcome offer tracking link'
      );
    }
  }

  return res.status(200).json({
    contactId,
    welcomeOfferAccess,
    offerBooked,
    hasTag,
    isValid: welcomeOfferAccess && !offerBooked && hasTag,
    debug: {
      usedEndpoint,
      fetchedCustomFields: cf,
      fetchedTags: tags,
    },
  });
}
