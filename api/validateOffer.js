import fetch from 'node-fetch';

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;

    if (!contactId) {
      console.error('❌ Missing contactId');
      return res.redirect(
        302,
        'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971'
      );
    }

    console.log('🕹️ validateOffer called, contactId:', contactId);

    const apiKey = process.env.GHL_API_KEY; // stored in Vercel
    const locationId = process.env.GHL_LOCATION_ID; // stored in Vercel

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact;
    let usedEndpoint;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.contact) {
          contact = data.contact;
          usedEndpoint = endpoint;
          console.log('✅ Contact fetched:', contact.id);
          console.log('🔹 Endpoint used:', usedEndpoint);
          break;
        }
      } catch (err) {
        console.warn(`⚠️ Could not fetch from ${endpoint}`, err);
      }
    }

    if (!contact) {
      console.error('❌ Could not fetch contact from any endpoint');
      return res.redirect(
        302,
        'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971'
      );
    }

    // Check if contact has the "sent welcome offer tracking link" tag
    const hasTrackingTag = contact.tags.includes('sent welcome offer tracking link');
    console.log('Has tracking tag?', hasTrackingTag);

    // Determine redirect URL
    const redirectTo = hasTrackingTag
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?contactId=${contact.id}`
      : 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971';

    console.log('➡️ Redirecting to:', redirectTo);
    return res.redirect(302, redirectTo);

  } catch (error) {
    console.error('Error in validateOffer:', error);
    return res.status(500).send('Server error');
  }
}
