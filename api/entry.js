export default function handler(req, res) {
  // Log immediately so we can SEE what Vercel receives
  console.log("🟢 ENTRY QUERY:", req.query);

  const { contactId } = req.query;

  if (!contactId) {
    return res.redirect(
      302,
      "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971"
    );
  }

  // 🚨 Forward ALL query params EXACTLY as received
  const qs = new URLSearchParams(req.query).toString();

  return res.redirect(302, `/api/validateOffer?${qs}`);
}
