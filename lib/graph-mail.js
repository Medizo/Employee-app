// Microsoft Graph API — Send emails via Azure AD Client Credentials flow
// Uses the Mail.Send application permission to send as indiaops@cluso.in

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get an OAuth2 access token using Azure AD Client Credentials flow.
 * Caches the token until it expires.
 */
async function getAccessToken() {
  const now = Date.now();

  // Return cached token if still valid (with 5-minute buffer)
  if (cachedToken && now < tokenExpiresAt - 300_000) {
    return cachedToken;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure AD credentials not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in .env');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Azure AD token error:', errorText);
    throw new Error(`Failed to get Azure AD token: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in * 1000);

  return cachedToken;
}

/**
 * Send an email via Microsoft Graph API.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.toName - Recipient display name (optional)
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Email body (plain text, will be converted to HTML)
 * @param {string} [options.from] - Override sender email (defaults to AZURE_SENDER_EMAIL)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendEmail({ to, toName, subject, body, from }) {
  const senderEmail = from || process.env.AZURE_SENDER_EMAIL || 'indiaops@cluso.in';

  try {
    const accessToken = await getAccessToken();

    // Convert plain text body to HTML (preserve line breaks)
    const htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')
      .replace(/  /g, '&nbsp; ');

    const message = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: `<div style="font-family: Calibri, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${htmlBody}</div>`,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
              name: toName || to,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    const graphUrl = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

    const res = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (res.status === 202 || res.status === 200) {
      console.log(`✅ Email sent successfully to ${to} via ${senderEmail}`);
      return { success: true };
    }

    const errorText = await res.text();
    console.error(`❌ Graph API send error (${res.status}):`, errorText);
    return { success: false, error: `Graph API error: ${res.status}` };

  } catch (err) {
    console.error('❌ Email send error:', err.message);
    return { success: false, error: err.message };
  }
}
