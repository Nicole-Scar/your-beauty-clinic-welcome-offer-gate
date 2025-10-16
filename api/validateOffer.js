export const config = {
  regions: ['lhr1'], // London, United Kingdom
};

export default async function handler(req, res) {
  const { contactId } = req.query;

  console.log('🕹️ validateOffer called, contactId:', contactId);
  console.log('🕹️ Function executing region: lhr1');

  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }

  const apiKey = process.env.GHL_API_KEY;
  const baseUrl = 'https://api-eu1.gohighlevel.com/v1';

  try {
    console.log('Fetching contact from:', baseUrl, 'contactId:', contactId);

    const response = await fetch(`${baseUrl}/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      console.error('Fetch failed:', response.status, 'from', `${baseUrl}/contacts/${contactId}`);
      return res.status(500).json({
        error: 'Contact not found or API fetch failed',
        contactId,
        details: `HTTP ${response.status} from ${baseUrl}`,
      });
    }

    const json = await response.json();
    const contact = json.contact || {};
    const fields = contact.customField || [];
    const tags = contact.tags || [];

    const welcomeOfferAccess = fields.find(f => f.name === 'welcomeOfferAccess')?.value?.trim() || 'No';
    const offerBooked = fields.find(f => f.name === 'offerBooked')?.value?.trim() || 'No';
    const hasTag = tags.includes('sent welcome offer tracking link');

    console.log('✅ welcomeOfferAccess:', welcomeOfferAccess);
    console.log('✅ offerBooked:', offerBooked);
    console.log('✅ hasTag:', hasTag);

    // Pause for 30 seconds to inspect logs
    await new Promise(resolve => setTimeout(resolve, 30000));

    const contactFound = true;
    const redirectTo =
      contactFound && welcomeOfferAccess === 'Yes' && hasTag && offerBooked !== 'Yes'
        ? 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?{{contact.id}}'
        : 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971';

    console.log('➡️ Redirecting to:', redirectTo);

    return res.status(200).json({
      contactId,
      contactFound,
      welcomeOfferAccess,
      offerBooked,
      hasTag,
      redirectTo,
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
