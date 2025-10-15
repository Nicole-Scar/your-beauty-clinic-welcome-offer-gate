export default async function handler(req, res) {
  const { contactId } = req.query;

  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }

  const apiKey = process.env.GHL_API_KEY;
  const baseUrls = [
    'https://api-eu1.gohighlevel.com/v1',
    'https://api.gohighlevel.com/v1'
  ];

  try {
    let contact = null;
    for (const baseUrl of baseUrls) {
      const response = await fetch(`${baseUrl}/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        contact = await response.json();
        break;
      }
    }

    if (!contact) {
      return res.status(404).json({
        error: 'Contact not found or API fetch failed',
        contactId,
      });
    }

    const fields = contact.contact?.customField || [];
    const hasTag = (contact.contact?.tags || []).includes('welcomeOffer');
    const welcomeOfferAccess = fields.find(f => f.name === 'welcomeOfferAccess')?.value;
    const offerBooked = fields.find(f => f.name === 'offerBooked')?.value;

    const contactFound = !!contact;
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
      redirectTo,
    });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({
      error: 'Server error',
      details: err.message,
    });
  }
}
