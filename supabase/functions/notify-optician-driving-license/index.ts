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
  examinationId: string;
  opticianId: string;
  patientName: string;
  entryId: string;
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

    const { examinationId, opticianId, patientName, entryId }: EmailNotificationRequest = await req.json();

    console.log("Processing email notification for examination:", examinationId);

    // Get optician details
    const { data: optician, error: opticianError } = await supabase
      .from("users")
      .select("clerk_user_id")
      .eq("id", opticianId)
      .single();

    if (opticianError || !optician) {
      console.error("Error fetching optician:", opticianError);
      throw new Error("Kunde inte hitta optiker");
    }

    // Get optician email from Clerk (simplified - would need Clerk integration)
    // For now, we'll use a placeholder email structure
    const opticianEmail = `optician-${optician.clerk_user_id}@example.com`;

    // Get organization name for context
    const { data: entry, error: entryError } = await supabase
      .from("anamnes_entries")
      .select(`
        organization_id,
        organizations (name)
      `)
      .eq("id", entryId)
      .single();

    if (entryError || !entry) {
      console.error("Error fetching entry:", entryError);
      throw new Error("Kunde inte hitta anamnespost");
    }

    const organizationName = entry.organizations?.name || "Din organisation";

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: `${organizationName} <noreply@resend.dev>`,
      to: [opticianEmail],
      subject: "Ny körkortsundersökning tilldelad",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Ny körkortsundersökning</h2>
          
          <p>Hej,</p>
          
          <p>Du har blivit tilldelad en ny slutförd körkortsundersökning:</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af;">Patientinformation</h3>
            <p><strong>Namn:</strong> ${patientName}</p>
            <p><strong>Undersöknings-ID:</strong> ${examinationId}</p>
            <p><strong>Organisation:</strong> ${organizationName}</p>
          </div>
          
          <p>Logga in på plattformen för att se fullständiga resultat och hantera undersökningen.</p>
          
          <div style="margin: 30px 0;">
            <a href="${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '')}/dashboard" 
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