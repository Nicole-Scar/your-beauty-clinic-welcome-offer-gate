export default function handler(req, res) {
  const { contactId, utm_source, utm_medium, utm_campaign, source } = req.query;

  if (!contactId) {
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }

  // Forward all UTMs + fallback source
  const qs = new URLSearchParams({ contactId });
  qs.set("utm_source", utm_source || source || "");
  if (utm_medium) qs.set("utm_medium", utm_medium);
  if (utm_campaign) qs.set("utm_campaign", utm_campaign);
  if (source) qs.set("source", source);

  // Use **absolute URL** to prevent query param stripping
  const redirectUrl = `https://your-beauty-clinic-welcome-offer-ga.vercel.app/api/validateOffer?${qs.toString()}`;

  return res.redirect(302, redirectUrl); // 302 is fine if Vercel routing is correct
}
