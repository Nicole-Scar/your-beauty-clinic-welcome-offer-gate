// File: /app/api/checkOfferStatus/route.js

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const fetch = (await import('node-fetch')).default;

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    if (!contactId) {
      return NextResponse.json({ offerActive: false }, { status: 400 });
    }

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = data.contact || candidate;
        break;
      }
    }

    if (!contact) {
      return NextResponse.json({ offerActive: false }, { status: 404 });
    }

    // --- Extract custom fields ---
    const cfArray = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([name, value]) => ({ name, value }));

    let offerActive = false;
    let expiryDate = null;
    let expiryRawValue = null;

    for (const f of cfArray) {
      const val = Array.isArray(f.value) ? f.value[0] : f.value;
      if (!val) continue;

      const name = String(f.name || '').trim().toLowerCase();
      const strVal = String(val).trim();

      // Match exact Welcome Offer Active field
      if (name === 'welcome offer active' && strVal.toLowerCase() === 'yes') {
        offerActive = true;
      }

      // Match exact Welcome Offer Expiry
      if (name === 'welcome offer expiry') {
        const parsedDate = new Date(strVal);
        if (!isNaN(parsedDate.getTime())) {
          expiryDate = parsedDate;
          expiryRawValue = strVal;
          if (parsedDate < new Date()) {
            offerActive = false; // expired
          } else {
            offerActive = offerActive && true; // still valid
          }
        }
      }
    }

    console.log("🧪 checkOfferStatus result:", {
      contactId,
      expiryRawValue,
      expiryDate: expiryDate ? expiryDate.toISOString().slice(0, 10) : null,
      offerActive
    });

    return NextResponse.json({ offerActive });

  } catch (err) {
    console.error("🔥 Error in checkOfferStatus:", err);
    return NextResponse.json({ offerActive: false }, { status: 500 });
  }
}
