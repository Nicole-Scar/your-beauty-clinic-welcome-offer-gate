export const config = {
  regions: ['lhr1'] // Vercel function region (London)
};

export default async function handler(req, res) {
  const { contactId } = req.query;
  console.log('🕹️ validateOffer called, contactId:', contactId);

  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }

  const apiKey = process.env.GHL_API_KEY;
  const endpoints = [
    'https://api-uk1.gohighlevel.com/v1',
    'https://api-eu1.gohighlevel.com/v1',
    'https://api.gohighlevel.com/v1'
  ];

  let contact = null;
  let usedEndpoint = null;

  for (const baseUrl of endpoints) {
    try {
      console.log(`Fetching from: ${baseUrl}/contacts/${contactId}`);
      const response = await fetch(`${baseUrl}/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      if (response.ok) {
        contact = await response.json();
        usedEndpoint = baseUrl;
        console.log('✅ Contact fetched successfully from', baseUrl);
        break;
      } else {
        console.warn(`Fetch failed at ${baseUrl}: HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn(`Error fetching from ${baseUrl}:`, err.message);
    }
  }

  if (!contact) {
    return res.status(404).json({
      error: 'Contact not found or API fetch failed',
      contactId,
      triedEndpoints: endpoints,
    });
  }

  const contactData = contact.contact || {};
  const customFields = contactData.customField || [];
  const tags = contactData.tags || [];

  const welcomeOfferAccess = customFields.find(f => f.name === 'welcomeOfferAccess')?.value === 'Yes';
  const offerBooked = customFields.find(f => f.name === 'offerBooked')?.value === 'Yes';
  const hasTag = tags.includes('sent welcome offer tracking link');

  const redirectTo = (welcomeOfferAccess && !offerBooked && hasTag)
    ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${contactId}`
    : 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971';

  console.log('📝 Contact checks:', { welcomeOfferAccess, offerBooked, hasTag });
  console.log('➡️ Redirecting to:', redirectTo, 'from endpoint:', usedEndpoint);

  return res.status(200).json({
    contactId,
    usedEndpoint,
    welcomeOfferAccess,
    offerBooked,
    hasTag,
    redirectTo
  });
}
