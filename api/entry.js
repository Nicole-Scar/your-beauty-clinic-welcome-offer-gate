// Minimal redirect logic if you want a direct API route
export default function handler(req, res) {
  const { contactId, utm_source, utm_medium, utm_campaign, source } = req.query;

  if (!contactId) return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");

  const qs = new URLSearchParams();
  qs.set("contactId", contactId);
  if(utm_source) qs.set("utm_source", utm_source);
  if(utm_medium) qs.set("utm_medium", utm_medium);
  if(utm_campaign) qs.set("utm_campaign", utm_campaign);
  if(source) qs.set("source", source);

  return res.redirect(302, `/api/validateOffer?${qs.toString()}`);
}
