export const config = {
  regions: ['lhr1'] // London region
};

export default async function handler(req, res) {
  // ⏱ 30-second pause for inspection
  await new Promise(resolve => setTimeout(resolve, 30000));

  const { contactId } = req.query;
  const apiKey = process.env.GHL_API_KEY;

  console.log('🕹️ validateOffer called, contactId:', contactId);
  console.log('🕹️ Function executing region:', process.env.VERCEL_REGION);

  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }

  const baseUrls = [
    'https://api-eu1.gohighlevel.com/v1',
    'https://api.gohighlevel.com/v1'
  ];

  let contact = null;
  let lastError = null;

  // 🔹 Try both endpoints
  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status} from ${baseUrl}`;
        continue;
      }

      contact = await response.json();
      break;

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

  // ✅ Safe checks
  const welcomeOfferAccess = (fields.find(f => f.name === 'welcomeOfferAccess')?.value || '').trim();
  const offerBooked = (fields.find(f => f.name === 'offerBooked')?.value || '').trim();
  const hasTag = tags.includes('sent welcome offer tracking link');

  // 🔹 Debug logs
  console.log('Tags:', tags);
  console.log('welcomeOfferAccess:', welcomeOfferAccess);
  console.log('offerBooked:', offerBooked);
  console.log('hasTag:', hasTag);

  const contactFound = Boolean(contact);
  const redirectTo =
    contactFound &&
    welcomeOfferAccess === 'Yes' &&
    hasTag &&
    offerBooked !== 'Yes'
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${contactId}`
      : 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971';

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
