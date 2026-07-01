import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record) {
      return json({ ok: false, reason: 'missing_record_payload', payload }, 400);
    }

    const userId = record.user_id;
    const title = record.title;
    const message = record.message ?? record.body;
    const type = record.type ?? undefined;
    const relatedId = record.related_id ?? record.meta?.reportId ?? undefined;
    const notificationId = record.id ?? undefined;

    if (!userId || !title || !message) {
      return json({ ok: false, reason: 'missing_required_fields', userId, title, message }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', userId);

    if (error) {
      return json({ ok: false, reason: 'token_query_failed', error }, 500);
    }

    if (!tokens?.length) {
      return json({ ok: false, reason: 'no_tokens', userId }, 200);
    }

    // Expo expects an array of message objects
    const expoMessages = tokens
      .map((t) => t.push_token)
      .filter(Boolean)
      .map((pushToken) => ({
        to: pushToken,
        title,
        body: message,
        sound: 'default',
        data: {
          type,
          relatedId,
          related_id: relatedId,
          notificationId,
        },
      }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(expoMessages),
    });

    const expoText = await expoRes.text();
    let expoResult: unknown = expoText;
    try {
      expoResult = JSON.parse(expoText);
    } catch {
      // keep as text
    }

    return json({
      ok: expoRes.ok,
      status: expoRes.status,
      expoResult,
      meta: { userId, tokensSent: expoMessages.length, type, relatedId },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}