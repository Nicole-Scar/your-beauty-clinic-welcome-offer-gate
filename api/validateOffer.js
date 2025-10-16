import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { contactId } = req.query;

  if (!contactId) {
    console.error('❌ No contactId provided');
    return res.status(400).json({ error: 'Missing contactId' });
  }

  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) {
    console.error('❌ No API Key found in environment variables');
    return res.status(500).json({ error: 'Missing API Key' });
  }

  // Mask API Key for logging
  const maskedKey = apiKey.slice(0, 4) + '…' + apiKey.slice(-4);

  // Possible endpoints to try
  const endpoints = [
    `https://api.gohighlevel.com/v1/contacts/${contactId}`,
    `https://api.gohighlevel.com/v1/locations/izQwdnA1xbbcTt7Z7wzU/contacts/${contactId}`
  ];

  console.log('🕹️ validateOffer called, contactId:', contactId);
  console.log('API Key (masked):', maskedKey);

  let contact = null;
  let triedEndpoints = [];

  for (const url of endpoints) {
    try {
      console.log('🔹 Fetching contact from:', url);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      const data = await response.json();
      console.log('Raw API response:', data);

      triedEndpoints.push({ url, status: response.status, data });

      if (response.ok) {
        contact = data;
        break;
      }
    } catch (err) {
      console.error(`❌ Fetch failed for ${url}:`, err.message);
      triedEndpoints.push({ url, error: err.message });
    }
  }

  if (!contact) {
    console.error('❌ Could not fetch contact from any endpoint');
    return res.status(404).json({
      error: 'Contact not found or API fetch failed',
      contactId,
      triedEndpoints
    });
  }

  // Check custom fields and tags
  const fields = contact.contact?.customField || [];
  const tags = contact.contact?.tags || [];
  const hasTag = tags.includes('welcomeOffer');
  const welcomeOfferAccess = fields.find(f => f.name === 'welcomeOfferAccess')?.value;
  const offerBooked = fields.find(f => f.name === 'offerBooked')?.value;

  const contactFound = !!contact;
  const redirectTo =
    contactFound && welcomeOfferAccess === 'Yes' && hasTag && offerBooked !== 'Yes'
      ? 'https://your-booking-page.com'
      : 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971';

  console.log('✅ Final computed values:', { contactFound, hasTag, welcomeOfferAccess, offerBooked, redirectTo });

  return res.status(200).json({
    contactId,
    contactFound,
    hasTag,
    welcomeOfferAccess,
    offerBooked,
    redirectTo,
    triedEndpoints
  });
}
