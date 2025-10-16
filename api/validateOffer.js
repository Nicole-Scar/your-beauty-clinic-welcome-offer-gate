// validateOffer.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { contactId } = req.query;
  const apiKey = process.env.GHL_API_KEY; // Your global API Key
  const locationId = 'izQwdnA1xbbcTt7Z7wzU'; // Your location ID

  console.log('🕹️ validateOffer called, contactId:', contactId);
  console.log('API Key:', apiKey);
  console.log('Location ID:', locationId);

  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }

  const baseUrls = [
    `https://api.gohighlevel.com/v1/contacts/${contactId}`,
    `https://api.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
  ];

  let contact = null;
  for (const url of baseUrls) {
    try {
      console.log('Fetching contact from:', url);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      const data = await response.json();
      console.log('Raw API response:', data);

      if (response.ok) {
        contact = data;
        break;
      } else {
        console.warn(`❌ Fetch failed from ${url} - Status: ${response.status}`);
      }
    } catch (err) {
      console.error(`⚠️ Could not reach ${url}`, err.message);
    }
  }

  if (!contact) {
    return res.status(404).json({
      error: 'Contact not found or API fetch failed',
      contactId
    });
  }

  // Extract relevant fields
  const fields = contact.contact?.customField || [];
  const hasTag = (contact.contact?.tags || []).includes('welcomeOffer');
  const welcomeOfferAccess = fields.find(f => f.name === 'welcomeOfferAccess')?.value;
  const offerBooked = fields.find(f => f.name === 'offerBooked')?.value;

  const contactFound = !!contact;
  const redirectTo =
    contactFound && welcomeOfferAccess === 'Yes' && hasTag && offerBooked !== 'Yes'
      ? 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?{{contact.id}}'
      : 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971';

  console.log('✅ contactFound:', contactFound);
  console.log('hasTag:', hasTag, 'welcomeOfferAccess:', welcomeOfferAccess, 'offerBooked:', offerBooked);
  console.log('Redirecting to:', redirectTo);

  return res.status(200).json({
    contactId,
    contactFound,
    hasTag,
    welcomeOfferAccess,
    offerBooked,
    redirectTo
  });
}
