import fetch from 'node-fetch';

export default async function validateOffer(req, res) {
  try {
    const { contactId } = req.query;

    if (!contactId) {
      console.log("❌ No contactId in URL");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    console.log("🕹️ validateOffer called, contactId:", contactId);

    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    const endpoints = [
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      `https://rest.gohighlevel.com/v1/locations/${locationId}/contacts/${contactId}`
    ];

    let contact;
    for (const endpoint of endpoints) {
      console.log("🔹 Trying endpoint:", endpoint);
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("🔸 Response keys:", Object.keys(data));

      if (response.ok && data.contact) {
        contact = data.contact;
        console.log("✅ Contact found:", contact.id);
        break;
      } else {
        console.log(`❌ ${endpoint} failed with status ${response.status}`);
      }
    }

    if (!contact) {
      console.error("❌ No contact found after all endpoints");
      return res.redirect(
        302,
        "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
      );
    }

    const hasTag =
      Array.isArray(contact.tags) &&
      contact.tags.includes("sent welcome offer tracking link");

    console.log("🏷️ Contact tags:", contact.tags);
    console.log("✅ hasTag:", hasTag);

    const redirectTo = hasTag
      ? "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477"
      : "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971";

    console.log("➡️ Redirecting to:", redirectTo);
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, redirectTo);
  } catch (err) {
    console.error("🔥 Error in validateOffer:", err);
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }
}
