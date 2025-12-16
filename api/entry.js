export default function handler(req, res) {
  const { contactId, utm_source, utm_medium, utm_campaign, source } = req.query;

  if (!contactId) {
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }

  // Build query for validateOffer
  const params = new URLSearchParams({ contactId });
  if (utm_source) params.set("utm_source", utm_source);
  if (utm_medium) params.set("utm_medium", utm_medium);
  if (utm_campaign) params.set("utm_campaign", utm_campaign);
  if (source) params.set("source", source);

  // **Redirect directly to validateOffer API**
  return res.redirect(
    302,
    `https://your-beauty-clinic-welcome-offer-ga.vercel.app/api/validateOffer?${params.toString()}`
  );
}
