import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Using Pollinations AI for completely free, unlimited AI generation without an API key
async function callAI(prompt) {
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai', // Maps to a high-quality free model like GPT-4o or Llama 3
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Pollinations API error:', errText);
      throw new Error(`API returned ${res.status}`);
    }

    const text = await res.text(); // Pollinations returns plain text directly
    if (!text) throw new Error('AI returned an empty response');
    
    return text.trim();
  } catch (err) {
    console.error('AI fetch error:', err.message);
    throw new Error('Failed to connect to AI service. Please try again.');
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { action, leadInfo, existingSubject, existingBody, context } = body;

  try {
    // ── ACTION: "polish" — Improve grammar & tone of existing email ──
    if (action === 'polish') {
      if (!existingBody) {
        return NextResponse.json({ error: 'No email body to polish' }, { status: 400 });
      }

      const prompt = `You are a professional business email editor. Your job is to polish and improve the following email.

Rules:
- Fix all grammar, spelling, and punctuation errors
- Improve sentence structure for clarity and professionalism
- Maintain the original intent, tone, and key information
- Keep it concise — remove filler words
- Use a warm but professional business tone
- Do NOT add new information or change the meaning
- Return ONLY the improved email body text, nothing else (no "Subject:" line, no quotes, no explanation)

${existingSubject ? `Email Subject: ${existingSubject}` : ''}

Email to polish:
${existingBody}`;

      const polished = await callAI(prompt);
      return NextResponse.json({ body: polished });
    }

    // ── ACTION: "generate" — Write a full email from context ──
    if (action === 'generate') {
      if (!context) {
        return NextResponse.json({ error: 'Please provide context for the email' }, { status: 400 });
      }

      const leadContext = leadInfo
        ? `Lead Details:
- Company: ${leadInfo.companyName || 'Unknown'}
- Contact Person: ${leadInfo.contactPerson || 'Unknown'}
- Designation: ${leadInfo.designation || 'N/A'}
- Industry: ${leadInfo.industry || 'N/A'}
- Services Interested: ${leadInfo.servicesInterested?.join(', ') || 'N/A'}
- Current Status: ${leadInfo.status || 'New'}
- Notes: ${leadInfo.notes || 'None'}`
        : '';

      const prompt = `You are a professional business email writer. Generate a complete, ready-to-send email based on the context below.

${leadContext}

User's Context / Instructions:
${context}

Rules:
- Write a professional, warm, and engaging business email
- Be concise but thorough — get to the point quickly
- Include a clear call-to-action
- Use proper greeting and sign-off
- Do NOT include fake contact info, phone numbers, or addresses
- Sign off with just "Best regards" (the sender name will be added automatically)

Return your response in EXACTLY this format:
SUBJECT: <the subject line>
---
<the email body>`;

      const result = await callAI(prompt);

      // Parse subject and body
      let subject = '';
      let emailBody = result;

      const subjectMatch = result.match(/^SUBJECT:\s*(.+)/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        // Remove the SUBJECT line and separator from body
        emailBody = result
          .replace(/^SUBJECT:\s*.+\n/i, '')
          .replace(/^---\s*\n?/, '')
          .trim();
      }

      return NextResponse.json({ subject, body: emailBody });
    }

    // ── ACTION: "rewrite" — Rewrite existing email with new context ──
    if (action === 'rewrite') {
      if (!existingBody && !context) {
        return NextResponse.json({ error: 'Provide either existing email or context' }, { status: 400 });
      }

      const leadContext = leadInfo
        ? `Lead Details:
- Company: ${leadInfo.companyName || 'Unknown'}
- Contact Person: ${leadInfo.contactPerson || 'Unknown'}
- Designation: ${leadInfo.designation || 'N/A'}
- Industry: ${leadInfo.industry || 'N/A'}
- Services Interested: ${leadInfo.servicesInterested?.join(', ') || 'N/A'}`
        : '';

      const prompt = `You are a professional business email writer. Rewrite the following email incorporating the new context/instructions provided by the user.

${leadContext}

Original Email Subject: ${existingSubject || '(none)'}
Original Email Body:
${existingBody || '(empty)'}

User's New Context / Instructions:
${context || 'Improve and make more professional'}

Rules:
- Completely rewrite the email based on the new context
- Maintain professionalism and clarity
- Be concise and include a clear call-to-action
- Sign off with just "Best regards"

Return your response in EXACTLY this format:
SUBJECT: <the subject line>
---
<the email body>`;

      const result = await callAI(prompt);

      let subject = existingSubject || '';
      let emailBody = result;

      const subjectMatch = result.match(/^SUBJECT:\s*(.+)/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        emailBody = result
          .replace(/^SUBJECT:\s*.+\n/i, '')
          .replace(/^---\s*\n?/, '')
          .trim();
      }

      return NextResponse.json({ subject, body: emailBody });
    }

    return NextResponse.json({ error: 'Invalid action. Use: polish, generate, or rewrite' }, { status: 400 });
  } catch (err) {
    console.error('AI Email Error:', err);
    return NextResponse.json({ error: err.message || 'AI generation failed. Please try again.' }, { status: 500 });
  }
}
