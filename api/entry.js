export default function handler(req, res) {
  const { contactId, utm_source } = req.query;

  if (!contactId) {
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }

  // FORCE param forward in a single redirect
  let redirectUrl = `/api/validateOffer?contactId=${contactId}`;

  if (utm_source) {
    redirectUrl += `&utm_source=${encodeURIComponent(utm_source)}`;
  }

  return res.redirect(302, redirectUrl);
}
