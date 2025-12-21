export default async function handler(req, res) {
  const { cid } = req.query;

  const VALID_REDIRECT =
    "https://yourbeautyclinic.bookedbeauty.co/subscribe-866156";

  const INVALID_REDIRECT =
    "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

  /* ===============================
     BASIC VALIDATION
  =============================== */
  if (!cid) {
    console.log("[REJOIN] ❌ Missing contact ID");
    return res.writeHead(302, { Location: INVALID_REDIRECT }).end();
  }

  try {
    /* ===============================
       FETCH CONTACT
    =============================== */
    const ghlRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/${cid}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
      }
    );

    if (!ghlRes.ok) {
      throw new Error("Failed to fetch contact");
    }

    const { contact } = await ghlRes.json();

    if (!contact) {
      throw new Error("Contact not found");
    }

    /* ===============================
       TAG CHECKS
    =============================== */
    const tags = (contact.tags || []).map(t =>
      t.toLowerCase().trim()
    );

    const hasEmailUnsubTag = tags.includes("unsubscribed from email");
    const hasSmsUnsubTag = tags.includes("unsubscribed from sms");

    /* ===============================
       STATUS CHECKS
    =============================== */
    const customFields = contact.customFields || {};

    const emailStatus =
      customFields["Email Marketing Status"] ||
      customFields["email marketing status"];

    const smsStatus =
      customFields["SMS Marketing Status"] ||
      customFields["sms marketing status"];

    const emailOptedOut = emailStatus === "Opted-Out";
    const smsOptedOut = smsStatus === "Opted-Out";

    /* ===============================
       DEBUG LOGGING (TEMPORARY)
    =============================== */
    console.log("[REJOIN DEBUG]", {
      contactId: cid,
      hasEmailUnsubTag,
      hasSmsUnsubTag,
      emailStatus,
      smsStatus,
      emailOptedOut,
      smsOptedOut
    });

    /* ===============================
       CHANNEL-MATCHING LOGIC
    =============================== */
    const emailMatch = hasEmailUnsubTag && emailOptedOut;
    const smsMatch = hasSmsUnsubTag && smsOptedOut;

    if (emailMatch || smsMatch) {
      console.log("[REJOIN] ✅ Access granted");
      return res.writeHead(302, { Location: VALID_REDIRECT }).end();
    }

    console.log("[REJOIN] ❌ Access denied — no channel match");
    return res.writeHead(302, { Location: INVALID_REDIRECT }).end();

  } catch (error) {
    console.error("[REJOIN ERROR]", error);
    return res.writeHead(302, { Location: INVALID_REDIRECT }).end();
  }
}
