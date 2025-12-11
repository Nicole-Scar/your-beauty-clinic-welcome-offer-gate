import fetch from 'node-fetch';

function norm(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}
function valueIsYes(v) {
  const s = normLower(v);
  return s === 'yes' || s === 'true' || s === '1';
}

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;
    if (!contactId) {
      return res.redirect(
        302,
        'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971'
      );
    }

    console.log('🕹️ validateOffer called, contactId:', contactId);
    console.log('📝 Incoming query params:', req.query);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const fieldWelcomeId = process.env.GHL_FIELD_WELCOME_ID;
    const fieldOfferBookedId = process.env.GHL_FIELD_OFFERBOOKED_ID;

    // Fetch contact
    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const url of endpoints) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = data.contact || candidate;
        console.log('✅ Contact fetched:', contact.id || contact);
        break;
      } else {
        console.log(`❌ Failed from ${url} - Status: ${response.status}`);
      }
    }
    if (!contact) {
      return res.redirect(
        302,
        'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971'
      );
    }

    // Tag check
    const hasTag =
      Array.isArray(contact.tags) &&
      contact.tags.some(tag => normLower(tag) === 'welcome offer opt-in');
    console.log('🏷️ Contact tags:', contact.tags, 'hasTag:', hasTag);

    // Custom fields
    const cf = Array.isArray(contact.customField) ? contact.customField : contact.customFields || [];
    let welcomeOfferAccess = null;
    let offerBooked = null;
    let expiryDate = null;

    if (fieldWelcomeId || fieldOfferBookedId) {
      for (const f of cf) {
        if (!f || !f.id) continue;
        if (fieldWelcomeId && f.id === fieldWelcomeId) welcomeOfferAccess = valueIsYes(f.value);
        if (fieldOfferBookedId && f.id === fieldOfferBookedId) offerBooked = valueIsYes(f.value);
      }
    }

    // Fallback boolean mapping
    const booleanFields = cf
      .map(f => ({ id: f.id || '', name: normLower(f.name || f.label || ''), val: normLower(f.value), raw: f }))
      .filter(x => typeof x.raw.value === 'string' && ['yes', 'no', 'true', 'false', '1', '0', ''].includes(x.val));

    if (booleanFields.length === 1) {
      if (welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].raw.value);
      if (offerBooked === null) offerBooked = false;
      console.log('🔎 Fallback: single boolean field mapped to welcomeOfferAccess');
    } else if (booleanFields.length >= 2) {
      if (welcomeOfferAccess === null) welcomeOfferAccess = valueIsYes(booleanFields[0].raw.value);
      if (offerBooked === null) offerBooked = valueIsYes(booleanFields[1].raw.value);
      console.log('🔎 Fallback: first boolean -> welcomeOfferAccess, second -> offerBooked');
    }

    // Expiry date field
    const expiryField = cf.find(f => (f.name || f.label || '').toLowerCase().includes('welcome offer expiry'));
    if (expiryField && expiryField.value) expiryDate = new Date(expiryField.value);

    if (welcomeOfferAccess === null) welcomeOfferAccess = false;
    if (offerBooked === null) offerBooked = false;

    console.log('🎯 final -> welcomeOfferAccess:', welcomeOfferAccess, 'offerBooked:', offerBooked, 'expiryDate:', expiryDate);

    // Validate
    const now = new Date();
    const isValid =
      hasTag && welcomeOfferAccess === true && offerBooked === false && (!expiryDate || now <= expiryDate);
    console.log('➡️ isValid:', isValid);

    // Preserve UTMs and other query params
    const searchParams = new URLSearchParams(req.url.split('?')[1] || '');
    searchParams.set('contactId', contact.id); // ensure correct contactId

    const redirectTo = isValid
      ? `https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477?${searchParams.toString()}`
      : 'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971';

    console.log('➡️ Redirecting to:', redirectTo);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.redirect(302, redirectTo);
  } catch (err) {
    console.error('🔥 Error in validateOffer:', err);
    return res.redirect(
      302,
      'https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971'
    );
  }
}
