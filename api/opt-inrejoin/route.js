// File: /app/api/opt-inrejoin/route.js

function norm(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export default async function handler(req, res) {
  const { cid } = req.query;

  const VALID_REDIRECT =
    "https://yourbeautyclinic.bookedbeauty.co/subscribe-866156";
  const INVALID_REDIRECT =
    "https://yourbeautyclinic.bookedbeauty.co/rejoin-invalid";

  if (!cid) {
    console.log("❌ Missing contact ID");
    return res.redirect(302, INVALID_REDIRECT);
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    // 1️⃣ Try multiple endpoints to reliably fetch the contact
    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${cid}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${cid}`
    ];

    let contact = null;
    for (const endpoint of endpoints) {
      console.log("🔹 Trying endpoint:", endpoint);
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      const candidate = data.contact || data;
      if (response.ok && candidate && (candidate.id || candidate.contact)) {
        contact = data.contact || candidate;
        console.log("✅ Contact fetched:", contact.id || contact);
        break;
      } else {
        console.log(`❌ Failed from ${endpoint} - Status: ${response.status}`);
      }
    }

    if (!contact) {
      console.error("❌ No contact found after both endpoints");
      return res.redirect(302, INVALID_REDIRECT);
    }

    // 2️⃣ TAG CHECKS
    const tags = Array.isArray(contact.tags) ? contact.tags.map(t => normLower(t)) : [];
    const hasEmailUnsubTag = tags.includes("unsubscribed from email");
    const hasSmsUnsubTag = tags.includes("unsubscribed from sms");

    // 3️⃣ LOG CUSTOM FIELDS (optional, for visibility only)
    const cf = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));
    console.log("🧩 Raw customField array:", JSON.stringify(cf, null, 2));

    // 4️⃣ CHANNEL-MATCHING (tag-only)
    if (hasEmailUnsubTag || hasSmsUnsubTag) {
      console.log("[REJOIN] ✅ Access granted via tag");
      return res.redirect(302, VALID_REDIRECT);
    }

    console.log("[REJOIN] ❌ Access denied — no unsubscribe tag found");
    return res.redirect(302, INVALID_REDIRECT);

  } catch (err) {
    console.error("🔥 REJOIN ERROR:", err);
    return res.redirect(302, INVALID_REDIRECT);
  }
}
