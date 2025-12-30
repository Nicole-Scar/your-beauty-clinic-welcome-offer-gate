import fs from "fs";
import path from "path";

function norm(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}
function normLower(v) {
  return norm(v).toLowerCase();
}

export default async function validateExpiryFields(req, res) {
  try {
    const fetch = (await import("node-fetch")).default;
    const { contactId } = req.query;

    if (!contactId) {
      console.error("❌ No contactId in URL");
      return res.status(400).json({ error: "No contactId" });
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
        console.error("✅ Contact fetched:", contact.id || contact);
        break;
      }
    }

    if (!contact) {
      console.error("❌ No contact found");
      return res.status(404).json({ error: "Contact not found" });
    }

    const cfArray = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));

    let welcomeOfferActive = null;
    let welcomeOfferExpiry = null;

    cfArray.forEach((f) => {
      if (!f) return;
      const name = (f.name || f.label || "").trim();
      const val = f.value;

      // write all logs to Vercel
      console.error("📌 Custom Field:", name, "Value:", val);

      if (name.toLowerCase().includes("active")) {
        welcomeOfferActive = ["yes", "true", "1"].includes(normLower(val));
        console.error("🔎 Welcome Offer Active detected:", val, "=>", welcomeOfferActive);
      }

      if (name.toLowerCase().includes("expiry") || name.toLowerCase().includes("expiration")) {
        const cleaned = String(val).trim().replace(/(\d+)(st|nd|rd|th)/gi, "$1");
        let parsed = null;
        const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          const [_, year, month, day] = isoMatch;
          parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          parsed = new Date(cleaned);
        }

        if (!isNaN(parsed.getTime())) {
          welcomeOfferExpiry = parsed;
          console.error("🗓️ Welcome Offer Expiry detected:", val, "=>", welcomeOfferExpiry.toISOString().slice(0, 10));
        } else {
          console.error("⚠️ Invalid expiry field:", val);
        }
      }
    });

    console.error("🎯 Final parsed values:");
    console.error("welcomeOfferActive:", welcomeOfferActive);
    console.error("welcomeOfferExpiry:", welcomeOfferExpiry ? welcomeOfferExpiry.toISOString().slice(0, 10) : "N/A");

    const isExpired = welcomeOfferExpiry ? new Date() > welcomeOfferExpiry : false;
    console.error("⏰ Is expired?", isExpired);

    return res.json({ welcomeOfferActive, welcomeOfferExpiry, isExpired });

  } catch (err) {
    console.error("🔥 Error in validateExpiryFields:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
