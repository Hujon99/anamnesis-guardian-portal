/**
 * Edge function to send email notifications to opticians when a driving license
 * examination is completed and assigned to them.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailNotificationRequest {
  entryId: string;
  opticianEmail?: string; // Optional - will be fetched from DB if not provided
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { entryId, opticianEmail, appUrl }: EmailNotificationRequest = await req.json();

    console.log("Processing email notification for entry:", entryId);

    // Validate required fields
    if (!entryId || !appUrl) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: entryId and appUrl are required' 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get entry and organization information  
    const { data: entryData, error: entryError } = await supabase
      .from('anamnes_entries')
      .select('organization_id, first_name, examination_type, booking_date, optician_id')
      .eq('id', entryId)
      .single();

    if (entryError || !entryData) {
      console.error('Entry fetch error:', entryError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch entry details' }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get organization name
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', entryData.organization_id)
      .single();

    if (orgError || !orgData) {
      console.error('Organization fetch error:', orgError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch organization details' }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get optician email if not provided in request
    let finalOpticianEmail = opticianEmail;
    if (!finalOpticianEmail && entryData.optician_id) {
      const { data: opticianData, error: opticianError } = await supabase
        .from('users')
        .select('email, display_name, first_name, last_name')
        .eq('clerk_user_id', entryData.optician_id)
        .eq('organization_id', entryData.organization_id)
        .single();

      if (opticianError || !opticianData?.email) {
        console.error('Optician fetch error:', opticianError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch optician email. Please ensure the optician has an email address in their profile.' 
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      finalOpticianEmail = opticianData.email;
    }

    if (!finalOpticianEmail) {
      return new Response(
        JSON.stringify({ 
          error: 'No optician email provided and no optician assigned to entry' 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const organizationName = orgData.name || "Din organisation";

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: `${organizationName} <noreply@resend.dev>`,
      to: [finalOpticianEmail],
      subject: "Ny körkortsundersökning tilldelad",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Ny körkortsundersökning</h2>
          
          <p>Hej,</p>
          
          <p>Du har blivit tilldelad en ny slutförd körkortsundersökning:</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af;">Patientinformation</h3>
            <p><strong>Namn:</strong> ${entryData.first_name || 'Okänd patient'}</p>
            <p><strong>Undersökningstyp:</strong> ${entryData.examination_type || 'Körkortsundersökning'}</p>
            <p><strong>Organisation:</strong> ${organizationName}</p>
          </div>
          
          <p>Logga in på plattformen för att se fullständiga resultat och hantera undersökningen.</p>
          
          <div style="margin: 30px 0;">
            <a href="${appUrl}/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Öppna Dashboard
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Detta är ett automatiskt meddelande från ${organizationName}.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "E-post skickad till optiker",
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in notify-optician-driving-license function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Kunde inte skicka e-post",
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);