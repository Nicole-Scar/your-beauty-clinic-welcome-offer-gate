export default async function handler(req, res) {
  const { cid } = req.query;

  const VALID_REDIRECT =
    "https://yourbeautyclinic.bookedbeauty.co/subscribe-866156";

  const INVALID_REDIRECT =
    "https://yourbeautyclinic.bookedbeauty.co/rejoin-invalid";

  // 1️⃣ Basic validation
  if (!cid) {
    console.log("[REJOIN] ❌ Missing contact ID");
    return res.writeHead(302, { Location: INVALID_REDIRECT }).end();
  }

  try {
    // 2️⃣ Fetch contact from GHL
    const ghlRes = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/${cid}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // 2a️⃣ Parse and log response
    const body = await ghlRes.json();
    console.log("[REJOIN DEBUG] fetch status:", ghlRes.status, "body:", body);

    if (!ghlRes.ok) {
      throw new Error(`Failed to fetch contact: ${ghlRes.status}`);
    }

    // 3️⃣ Extract contact
    const contact = body.contact || body.contacts?.[0];
    if (!contact) throw new Error("Contact not found in response");

    // 4️⃣ TAG CHECKS
    const tags = (contact.tags || []).map(t => t.toLowerCase().trim());
    const hasEmailUnsubTag = tags.includes("unsubscribed from email");
    const hasSmsUnsubTag = tags.includes("unsubscribed from sms");

    // 5️⃣ ROBUST CUSTOM FIELD HANDLING
    const cf = Array.isArray(contact.customField)
      ? contact.customField
      : Object.entries(contact.customFields || {}).map(([key, value]) => ({ name: key, value }));

    console.log("🧩 Raw customField array:", JSON.stringify(cf, null, 2));

    const customFields = {};
    cf.forEach(field => {
      if (field.name && field.value !== undefined) {
        customFields[field.name.trim()] = field.value;
      }
    });

    const emailStatus = customFields["Email Marketing Status"];
    const smsStatus = customFields["SMS Marketing Status"];
    const emailOptedOut = emailStatus === "Opted-Out";
    const smsOptedOut = smsStatus === "Opted-Out";

    // 6️⃣ DEBUG LOGGING
    console.log("[REJOIN DEBUG] contactId:", cid, {
      hasEmailUnsubTag,
      hasSmsUnsubTag,
      emailStatus,
      smsStatus,
      emailOptedOut,
      smsOptedOut
    });

    // 7️⃣ CHANNEL-MATCHING LOGIC
    const emailMatch = hasEmailUnsubTag && emailOptedOut;
    const smsMatch = hasSmsUnsubTag && smsOptedOut;

    if (emailMatch || smsMatch) {
      console.log("[REJOIN] ✅ Access granted");
      return res.writeHead(302, { Location: VALID_REDIRECT }).end();
    }

    console.log("[REJOIN] ❌ Access denied — no matching channel");
    return res.writeHead(302, { Location: INVALID_REDIRECT }).end();

  } catch (error) {
    console.error("[REJOIN ERROR]", error);
    return res.writeHead(302, { Location: INVALID_REDIRECT }).end();
  }
}
