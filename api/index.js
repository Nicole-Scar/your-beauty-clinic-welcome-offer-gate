export default async function handler(req, res) {
  // Parse incoming params
  const { contactId, sessionId, trigger_link, cb, ...rest } = req.query;

  // STEP 1 — Force a clean reload ONCE using a cache-buster param
  if (!cb) {
    const clean = new URL(req.url, `https://${req.headers.host}`);
    clean.searchParams.set("cb", Date.now());
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.redirect(302, clean.toString());
  }

  // STEP 2 — Extract ONLY utm_* params
  const utms = {};
  Object.keys(rest).forEach((key) => {
    if (key.startsWith("utm_")) {
      utms[key] = rest[key];
    }
  });

  // STEP 3 — Build final redirect URL (only contactId + utms)
  const final = new URL(
    "https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-161477"
  );

  if (contactId) final.searchParams.set("contactId", contactId);
  Object.keys(utms).forEach((key) =>
    final.searchParams.set(key, utms[key])
  );

  const finalUrl = final.toString();

  // STEP 4 — Serve dynamic spinner page for 1 second
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Content-Type", "text/html");

  return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Validating your offer...</title>

  <style>
    body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #faf7f5;
      font-family: system-ui, sans-serif;
      color: #333;
      margin: 0;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #ddd;
      border-top: 4px solid #c49a6c;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 10px;
    }
    @keyframes spin { 
      to { transform: rotate(360deg); } 
    }
  </style>
</head>

<body>
  <div class="spinner"></div>
  <p>Verifying your offer...</p>

  <script>
    setTimeout(() => {
      window.location.replace("${finalUrl}");
    }, 1000);
  </script>
</body>
</html>
  `);
}
