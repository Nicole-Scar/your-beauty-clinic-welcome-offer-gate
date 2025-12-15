export default function handler(req, res) {
  const { contactId } = req.query;
  if (!contactId) return res.redirect(302, "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");

  // Forward all query parameters to validateOffer
  const qs = new URLSearchParams(req.query); // <--- dynamically includes utm_source, utm_medium, etc.

  return res.redirect(302, `/api/validateOffer?${qs.toString()}`);
}
