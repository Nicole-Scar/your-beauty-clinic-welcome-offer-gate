export default function Home() {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <title>Welcome Offer Redirect</title>
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
          const params = new URLSearchParams(window.location.search);
          const contactId = params.get('contactId');
          if (!contactId) return window.location.href = '/invalid';
          fetch(\`/api/validateOffer?contactId=\${contactId}\`)
            .then(res => res.json())
            .then(data => {
              console.log('API response:', data);
              if (!data.contactFound) return window.location.href = '/invalid';
              if (data.redirectTo === '/invalid') {
                console.warn('Redirecting to /invalid. Failed conditions:', {
                  welcomeOfferAccess: data.welcomeOfferAccess,
                  offerBooked: data.offerBooked,
                  hasTag: data.hasTag
                });
              }
              window.location.href = data.redirectTo || '/invalid';
            })
            .catch(err => window.location.href = '/invalid');
        ` }} />
      </body>
    </html>
  );
}
