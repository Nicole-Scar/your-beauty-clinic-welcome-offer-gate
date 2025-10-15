// validateOffer.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { contactId } = req.query;

  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }

  // Read API key from environment
  const GHL_API_KEY = process.env.GHL_API_KEY;

  // Prepare EU endpoint URL
  const endpoint = `https://api-eu1.gohighlevel.com/v1/contacts/${contactId}`;

  // Prepare debug info
  const debug = {
    apiKeyPresent: !!GHL_API_KEY,
    endpoint,
  };

  try {
    // Fetch contact data
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    debug.fetchStatus = response.status;

    const text = await response.text();
    debug.fetchResponseText = text;

    let contactData;
    try {
      contactData = JSON.parse(text);
      debug.jsonParsed = true;
    } catch (err) {
      debug.jsonParsed = false;
    }

    // Default values in case of fetch failure
    let offerBooked = null;
    let welcomeOfferAccess = null;

    if (contactData && contactData.customField) {
      const fields = contactData.customField;

      // Assuming your custom field names are exactly 'offerBooked' and 'welcomeOfferAccess'
      const offerBookedField = fields.find(f => f.name === 'offerBooked');
      const welcomeOfferField = fields.find(f => f.name === 'welcomeOfferAccess');

      offerBooked = offerBookedField ? offerBookedField.value : null;
      welcomeOfferAccess = welcomeOfferField ? welcomeOfferField.value : null;
    }

    return res.status(200).json({
      debug,
      contact: contactData || null,
      offerBooked,
      welcomeOfferAccess,
    });

  } catch (error) {
    return res.status(500).json({
      debug,
      error: 'Server error fetching contact data',
      details: error.message,
    });
  }
}
