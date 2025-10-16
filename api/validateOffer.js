// api/validateOffer.js
export default async function handler(req, res) {
  const { contactId } = req.query;

  console.log('🕹️ validateOffer called, contactId:', contactId);

  if (!contactId) {
    console.warn('❌ No contactId provided');
    return res.status(400).json({ error: 'Missing contactId' });
  }

  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing API Key in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration: API Key missing' });
  }

  const endpoint = 'https://api.gohighlevel.com/v1'; // GLOBAL endpoint only

  try {
    console.log('📡 Fetching contact from:', endpoint, 'contactId:', contactId);

    const response = await fetch(`${endpoint}/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      console.error(`❌ Fetch failed: HTTP ${response.status}`, await response.text());
      return res.status(response.status).json({
        error: 'Contact not found or API fetch failed',
        contactId,
        details: `HTTP ${response.status}`,
      });
    }

    const contact = await response.json();
    console.log('✅ Contact data retrieved:', contact);

    const fields = contact.contact?.customField || [];
    const tags = contact.contact?.tags || [];

    const hasTag = tags.includes('welcomeOffer');
    const welcomeOfferAccess = fields.find(f => f.name === 'welcomeOfferAccess')?.value;
    const offerBooked = fields.find(f => f.name === 'offerBooked')?.value;

    console.log('🔹 Checks:', { welcomeOfferAccess, offerBooked, hasTag });

    const contactFound = !!contact.contact;
    const redirectTo =
      contactFound && welcomeOfferAccess === 'Yes' && hasTag && offerBooked !== 'Yes'
        ? 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?{{contact.id}}'
        : 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971';

    return res.status(200).json({
      contactId,
      contactFound,
      hasTag,
      welcomeOfferAccess,
      offerBooked,
      redirectTo,
    });
  } catch (err) {
    console.error('⚠️ Server error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
