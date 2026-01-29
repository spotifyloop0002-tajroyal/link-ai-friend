import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AlertPayload {
  alertType: 'linkedin_ui_changed' | 'posting_failed' | 'multi_user_failure' | 'extension_error' | 'extension_disconnected';
  severity: 'critical' | 'high' | 'medium';
  title: string;
  message: string;
  details?: Record<string, unknown>;
  userId?: string;
  postId?: string;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  linkedin_ui_changed: '🔴 LinkedIn UI Changed',
  posting_failed: '❌ Posting Failed',
  multi_user_failure: '⚠️ Multiple User Failures',
  extension_error: '🛠️ Extension Error',
  extension_disconnected: '🔌 Extension Disconnected',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#F97316',
  medium: '#EAB308',
};

async function sendEmailViaResend(
  apiKey: string, 
  to: string[], 
  subject: string, 
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LinkedBot Alerts <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', errorData);
      return { success: false, error: errorData };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload: AlertPayload = await req.json();
    const { alertType, severity, title, message, details, userId, postId } = payload;

    if (!alertType || !title || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check for recent duplicate alerts (within last 5 minutes) to prevent spam
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentAlerts } = await supabase
      .from('extension_alerts')
      .select('id')
      .eq('alert_type', alertType)
      .eq('is_resolved', false)
      .gte('created_at', fiveMinutesAgo)
      .limit(1);

    if (recentAlerts && recentAlerts.length > 0) {
      console.log('Duplicate alert suppressed:', alertType);
      return new Response(JSON.stringify({ success: true, suppressed: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert the alert into the database
    const { data: alert, error: insertError } = await supabase
      .from('extension_alerts')
      .insert({
        alert_type: alertType,
        severity,
        title,
        message,
        details,
        user_id: userId || null,
        post_id: postId || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert alert:', insertError);
      throw insertError;
    }

    console.log('Alert created:', alert.id);

    // Get admin emails for notification
    const { data: adminSettings } = await supabase
      .from('admin_alert_settings')
      .select('email, receive_critical_alerts, receive_high_alerts, receive_medium_alerts');

    // If no admin settings exist, get admins from user_roles and their profiles
    let adminEmails: string[] = [];
    
    if (!adminSettings || adminSettings.length === 0) {
      // Fallback: get admin users and their emails from profiles
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin']);

      if (adminRoles && adminRoles.length > 0) {
        const adminUserIds = adminRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('email')
          .in('user_id', adminUserIds)
          .not('email', 'is', null);

        if (profiles) {
          adminEmails = profiles.map(p => p.email).filter(Boolean) as string[];
        }
      }
    } else {
      // Filter admins based on their severity preferences
      adminEmails = adminSettings
        .filter(s => {
          if (severity === 'critical') return s.receive_critical_alerts;
          if (severity === 'high') return s.receive_high_alerts;
          if (severity === 'medium') return s.receive_medium_alerts;
          return true;
        })
        .map(s => s.email)
        .filter(Boolean);
    }

    if (adminEmails.length === 0) {
      console.log('No admin emails configured for alerts');
      return new Response(JSON.stringify({ success: true, emailSent: false, reason: 'No admin emails' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ success: true, emailSent: false, reason: 'Email not configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const alertLabel = ALERT_TYPE_LABELS[alertType] || alertType;
    const severityColor = SEVERITY_COLORS[severity] || '#6B7280';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 24px; background-color: ${severityColor}; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
          ${alertLabel}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 24px;">
        <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">
          ${title}
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280; line-height: 1.6;">
          ${message}
        </p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Alert Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #374151;">Severity:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: ${severityColor}; font-weight: 600; text-transform: uppercase;">${severity}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #374151;">Type:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #111827;">${alertType}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #374151;">Time:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #111827;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
                </tr>
                ${userId ? `<tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #374151;">User ID:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #111827; font-family: monospace;">${userId}</td>
                </tr>` : ''}
                ${postId ? `<tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #374151;">Post ID:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #111827; font-family: monospace;">${postId}</td>
                </tr>` : ''}
              </table>
              ${details ? `
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Additional Info</p>
                <pre style="margin: 0; font-size: 12px; color: #374151; background-color: #fff; padding: 8px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">${JSON.stringify(details, null, 2)}</pre>
              </div>` : ''}
            </td>
          </tr>
        </table>
        
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          This is an automated alert from LinkedBot. Please investigate immediately.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 24px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          LinkedBot Alert System • ${new Date().getFullYear()}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResult = await sendEmailViaResend(
      resendApiKey,
      adminEmails,
      `[${severity.toUpperCase()}] ${alertLabel}: ${title}`,
      htmlContent
    );

    if (emailResult.success) {
      console.log('Email sent successfully');

      // Update alert to mark email as sent
      await supabase
        .from('extension_alerts')
        .update({ 
          email_sent: true, 
          email_sent_at: new Date().toISOString() 
        })
        .eq('id', alert.id);

      return new Response(JSON.stringify({ 
        success: true, 
        alertId: alert.id,
        emailSent: true,
        recipients: adminEmails.length 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Failed to send email:', emailResult.error);
      
      // Still return success for alert creation, just note email failure
      return new Response(JSON.stringify({ 
        success: true, 
        alertId: alert.id,
        emailSent: false,
        emailError: emailResult.error
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Critical alert error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
