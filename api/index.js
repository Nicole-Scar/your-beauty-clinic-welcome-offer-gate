export default function handler(req, res) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
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
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <p>Verifying your offer...</p>
  <script>
    (function() {
      const params = new URLSearchParams(window.location.search);
      const contactId = params.get("contactId");
      let utmSource = params.get("utm_source");

      // Fallback if utm_source missing
      if (!utmSource) {
        const path = window.location.pathname.toLowerCase();
        if (path.includes("/email")) utmSource = "email";
        else if (path.includes("/sms")) utmSource = "sms";
      }

      if (!contactId) {
        return window.location.replace("https://yourbeautyclinic.bookedbeauty.co/your-beauty-clinic-welcome-offer-invalid-340971");
      }

      // Build URL for validateOffer API, preserving only contactId + utm_source
      const apiParams = new URLSearchParams();
      apiParams.set("contactId", contactId);
      if (utmSource) apiParams.set("utm_source", utmSource);

      const apiUrl = "/api/validateOffer?" + apiParams.toString();
      console.log("🪶 ContactId detected:", contactId);
      console.log("💡 Detected utm_source:", utmSource);
      console.log("🔄 Redirecting to API route:", apiUrl);

      // Spinner delay
      setTimeout(() => {
        window.location.replace(apiUrl);
      }, 2000);
    })();
  </script>
</body>
</html>
  `;

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}
