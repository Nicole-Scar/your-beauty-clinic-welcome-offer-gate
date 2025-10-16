// /api/validateOffer.js
export const config = {
  regions: ['lhr1']  // forces function to run in London
};

export default async function handler(req, res) {
  const { contactId } = req.query;

  console.log('🕹️ validateOffer called, contactId:', contactId);
  console.log('🕹️ Function executing region:', process.env.VERCEL_REGION);

  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }

  const apiKey = process.env.GHL_API_KEY;
  const baseUrls = [
    'https://api-eu1.gohighlevel.com/v1', // EU endpoint
    'https://api.gohighlevel.com/v1'       // fallback
  ];

  let contact = null;
  let lastError = null;

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status} from ${baseUrl}`;
        continue; // try next baseUrl
      }

      contact = await response.json();
      break; // success
    } catch (err) {
      lastError = err.message;
    }
  }

  if (!contact) {
    console.error('Fetch failed:', lastError);
    return res.status(500).json({
      error: 'Contact not found or API fetch failed',
      contactId,
      details: lastError
    });
  }

  const fields = contact?.contact?.customFields || [];
  const tags = contact?.contact?.tags || [];

  const hasTag = tags.includes('welcomeOffer');
  const welcomeOfferAccess = fields.find(f => f.name === 'welcomeOfferAccess')?.value;
  const offerBooked = fields.find(f => f.name === 'offerBooked')?.value;

  const contactFound = Boolean(contact);
  const redirectTo =
    contactFound && welcomeOfferAccess === 'Yes' && hasTag && offerBooked !== 'Yes'
      ? 'https://your-booking-page.com'
      : '/invalid';

  return res.status(200).json({
    contactId,
    contactFound,
    hasTag,
    welcomeOfferAccess,
    offerBooked,
    redirectTo
  });
}
