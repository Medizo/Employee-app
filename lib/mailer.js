// Microsoft Graph API — Send emails with attachments via Azure AD Client Credentials flow
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 300_000) return cachedToken;

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure AD credentials not configured.');
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
 * Send a task notification email with optional attachment via Microsoft Graph API.
 * @param {Object} opts
 * @param {string} opts.to - Recipient email
 * @param {string} opts.toName - Recipient display name
 * @param {string} opts.subject - Email subject
 * @param {string} opts.htmlBody - HTML email body
 * @param {Object} [opts.attachment] - { filename, contentType, base64Data }
 */
export async function sendTaskEmail({ to, toName, subject, htmlBody, attachment }) {
  const senderEmail = process.env.AZURE_SENDER_EMAIL || 'indiaops@cluso.in';

  try {
    const accessToken = await getAccessToken();

    const message = {
      message: {
        subject,
        body: { contentType: 'HTML', content: htmlBody },
        toRecipients: [{ emailAddress: { address: to, name: toName || to } }],
      },
      saveToSentItems: true,
    };

    // Add attachment if provided
    if (attachment && attachment.base64Data) {
      message.message.attachments = [{
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.filename,
        contentType: attachment.contentType || 'application/octet-stream',
        contentBytes: attachment.base64Data,
      }];
    }

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (res.status === 202 || res.status === 200) {
      console.log(`✅ Task email sent to ${to}`);
      return { success: true };
    }

    const errorText = await res.text();
    console.error(`❌ Graph API send error (${res.status}):`, errorText);
    return { success: false, error: `Graph API error: ${res.status}` };
  } catch (err) {
    console.error('❌ Task email send error:', err.message);
    return { success: false, error: err.message };
  }
}
