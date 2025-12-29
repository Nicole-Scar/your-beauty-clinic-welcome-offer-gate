// File: /app/api/entry/route.js

export default function handler(req, res) {
  const { contactId, booking_source } = req.query;

  if (!contactId) {
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }

  // Forward contactId + booking_source
  const qs = new URLSearchParams({ contactId });
  if (booking_source) qs.set("booking_source", booking_source);

  const redirectUrl = `https://your-beauty-clinic-welcome-offer-ga.vercel.app/api/validateOffer?${qs.toString()}`;
  return res.redirect(307, redirectUrl);
}
