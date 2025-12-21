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
      `https://services.leadconnectorhq.com/contacts/${cid}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // 2a️⃣ Log response for debugging
    const body = await ghlRes.json();
    console.log("[REJOIN DEBUG] fetch status:", ghlRes.status, "body:", body);

    // 2b️⃣ Handle non-200 responses
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

    // 5️⃣ STATUS CHECKS
    const customFields = contact.customFields || {};
    const emailStatus =
      customFields["Email Marketing Status"] ||
      customFields["email marketing status"];
    const smsStatus =
      customFields["SMS Marketing Status"] ||
      customFields["sms marketing status"];
    const emailOptedOut = emailStatus === "Opted-Out";
    const smsOptedOut = smsStatus === "Opted-Out";

    // 6️⃣ DEBUG LOGGING (temporary)
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
