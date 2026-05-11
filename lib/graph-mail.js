// Microsoft Graph API — Send & Read emails via Azure AD Client Credentials flow
// Uses Mail.Send + Mail.Read application permissions for indiaops@cluso.in

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get an OAuth2 access token using Azure AD Client Credentials flow.
 * Caches the token until it expires.
 */
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
 * Send an email via Microsoft Graph API.
 */
export async function sendEmail({ to, toName, subject, body, from }) {
  const senderEmail = from || process.env.AZURE_SENDER_EMAIL || 'indiaops@cluso.in';

  try {
    const accessToken = await getAccessToken();
    const htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')
      .replace(/  /g, '&nbsp; ');

    const message = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: `<div style="font-family: Calibri, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${htmlBody}</div>`,
        },
        toRecipients: [{ emailAddress: { address: to, name: toName || to } }],
      },
      saveToSentItems: true,
    };

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (res.status === 202 || res.status === 200) {
      console.log(`✅ Email sent to ${to} via ${senderEmail}`);
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

/**
 * Read inbox messages from indiaops@cluso.in.
 * Filters to only emails from specific senders (lead emails).
 * 
 * @param {Object} options
 * @param {string[]} [options.fromAddresses] - Only fetch emails from these addresses
 * @param {number} [options.top] - Max messages to fetch (default 50)
 * @param {string} [options.since] - ISO date string — only fetch messages after this date
 * @returns {Promise<Array>} Array of simplified message objects
 */
export async function readInbox({ fromAddresses = [], top = 50, since } = {}) {
  const senderEmail = process.env.AZURE_SENDER_EMAIL || 'indiaops@cluso.in';

  try {
    const accessToken = await getAccessToken();

    // Build OData filter
    let filter = '';
    if (fromAddresses.length > 0) {
      // Filter by sender addresses using OR
      const senderFilters = fromAddresses.map(
        addr => `from/emailAddress/address eq '${addr.replace(/'/g, "''")}'`
      );
      filter = senderFilters.join(' or ');
    }
    if (since) {
      const sinceFilter = `receivedDateTime ge ${since}`;
      filter = filter ? `(${filter}) and ${sinceFilter}` : sinceFilter;
    }

    let url = `https://graph.microsoft.com/v1.0/users/${senderEmail}/mailFolders/inbox/messages?$top=${top}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,receivedDateTime,isRead,conversationId,internetMessageId`;
    if (filter) {
      url += `&$filter=${encodeURIComponent(filter)}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Graph inbox read error:', errText);
      return [];
    }

    const data = await res.json();
    return (data.value || []).map(msg => ({
      graphId: msg.id,
      subject: msg.subject || '(No Subject)',
      bodyPreview: msg.bodyPreview || '',
      bodyHtml: msg.body?.content || '',
      fromEmail: msg.from?.emailAddress?.address || '',
      fromName: msg.from?.emailAddress?.name || '',
      receivedAt: msg.receivedDateTime,
      isRead: msg.isRead,
      conversationId: msg.conversationId,
      internetMessageId: msg.internetMessageId,
    }));
  } catch (err) {
    console.error('❌ Inbox read error:', err.message);
    return [];
  }
}

/**
 * Mark a message as read in the inbox.
 */
export async function markAsRead(graphMessageId) {
  const senderEmail = process.env.AZURE_SENDER_EMAIL || 'indiaops@cluso.in';
  try {
    const accessToken = await getAccessToken();
    await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/messages/${graphMessageId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    });
  } catch (err) {
    console.error('Mark as read error:', err.message);
  }
}
