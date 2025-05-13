
/**
 * This Edge Function handles form submissions for anamnes entries.
 * It validates and processes the submitted form data, updating the entry status.
 * UNIFIED: Now handles both patient and optician submissions via the same endpoint.
 * Enhanced with better error handling, detailed logging, and input validation.
 * Sets the correct status to 'ready' for all completed submissions regardless of source.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { logSubmissionAttempt, checkAccessTokenValue, createSubmissionLogsTable } from "./utils/databaseFunctions.ts";

// Define CORS headers with expanded Access-Control-Allow-Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, x-client-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Type definitions to match frontend types
interface FormQuestion {
  id: string;
  label: string;
  type: string;
  options?: any[];
  show_in_mode?: string;
}

interface FormSection {
  section_title: string;
  questions: FormQuestion[];
}

interface FormTemplate {
  title: string;
  sections: FormSection[];
}

/**
 * Creates an optimized text representation of anamnesis data
 * Simplified version of the frontend function with the same name
 */
const createOptimizedPromptInput = (
  formTemplate: FormTemplate,
  answersData: any
): string => {
  // Initialize output text
  let outputText = "Patientens anamnesinformation:\n";

  // Create maps for questions and answers
  const questionLabelMap = new Map<string, string>();
  const answeredQuestionsMap = new Map<string, any>();
  
  // Extract answers into a map for easier lookup
  if (answersData && answersData.answeredSections) {
    answersData.answeredSections.forEach((section: any) => {
      if (section.responses && section.responses.length > 0) {
        section.responses.forEach((response: any) => {
          if (response && response.id && response.answer !== undefined && 
              response.answer !== null && response.answer !== '') {
            answeredQuestionsMap.set(response.id, response.answer);
          }
        });
      }
    });
  }

  // If we have no answers, return early
  if (answeredQuestionsMap.size === 0) {
    return outputText + "\nIngen information tillgänglig";
  }
  
  // Build question label map from form template
  if (formTemplate && formTemplate.sections) {
    formTemplate.sections.forEach(section => {
      if (section.questions) {
        section.questions.forEach(question => {
          // Skip optician-only questions
          if (question.show_in_mode === "optician") return;
          questionLabelMap.set(question.id, question.label || question.id);
        });
      }
    });
  }

  // Process sections in template order
  if (formTemplate && formTemplate.sections) {
    formTemplate.sections.forEach((section: FormSection) => {
      if (!section.questions || section.questions.length === 0) return;
      
      let sectionAdded = false;
      
      // Process questions in template order
      section.questions.forEach((question: FormQuestion) => {
        if (question.show_in_mode === "optician") return;
        
        const answer = answeredQuestionsMap.get(question.id);
        if (answer === undefined) return;
        
        if (!sectionAdded) {
          outputText += `\n-- ${section.section_title} --\n`;
          sectionAdded = true;
        }
        
        const label = questionLabelMap.get(question.id) || question.label || question.id;
        let formattedAnswer = formatAnswerValue(answer);
        
        outputText += `${label}: ${formattedAnswer}\n`;
      });
      
      // Look for follow-up questions
      Array.from(answeredQuestionsMap.keys()).forEach(key => {
        if (key.includes('_for_')) {
          const [baseQuestionId] = key.split('_for_');
          
          const baseQuestionBelongsToThisSection = section.questions.some(q => q.id === baseQuestionId);
          
          if (baseQuestionBelongsToThisSection) {
            const followUpAnswer = answeredQuestionsMap.get(key);
            
            if (followUpAnswer === undefined || followUpAnswer === null || followUpAnswer === '') return;
            
            if (!sectionAdded) {
              outputText += `\n-- ${section.section_title} --\n`;
              sectionAdded = true;
            }
            
            const parentValue = key.split('_for_')[1].replace(/_/g, ' ');
            const baseQuestionLabel = questionLabelMap.get(baseQuestionId) || baseQuestionId;
            const followUpLabel = `${baseQuestionLabel} (${parentValue})`;
            
            let formattedAnswer = formatAnswerValue(followUpAnswer);
            
            outputText += `${followUpLabel}: ${formattedAnswer}\n`;
          }
        }
      });
    });
  }

  return outputText;
};

/**
 * Helper function to format different answer types consistently
 */
function formatAnswerValue(answer: any): string {
  if (answer === null || answer === undefined) {
    return "Inget svar";
  }
  
  // Handle arrays
  if (Array.isArray(answer)) {
    return answer
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          if ('value' in item) return item.value;
          return JSON.stringify(item);
        }
        return String(item);
      })
      .filter(value => value !== undefined && value !== null && value !== '')
      .join(', ');
  }
  
  // Handle objects with nested values
  if (typeof answer === 'object' && answer !== null) {
    if ('value' in answer) {
      return String(answer.value);
    }
    
    if ('parent_question' in answer && 'parent_value' in answer && 'value' in answer) {
      return String(answer.value);
    }
    
    return JSON.stringify(answer);
  }
  
  // Simple values
  return String(answer);
}

/**
 * Extracts the formatted answers structure from various possible answer formats
 */
const extractFormattedAnswers = (answers: Record<string, any>): any | undefined => {
  if (!answers || typeof answers !== 'object') {
    console.log("[submit-form/extractFormattedAnswers]: No answers provided or invalid format");
    return undefined;
  }

  // Case 1: Direct structure with answeredSections
  if ('answeredSections' in answers && Array.isArray(answers.answeredSections)) {
    console.log("[submit-form/extractFormattedAnswers]: Found direct structure with answeredSections");
    return answers;
  }

  // Case 2: Nested in formattedAnswers
  if ('formattedAnswers' in answers) {
    const formattedAnswers = answers.formattedAnswers;
    
    if (formattedAnswers && typeof formattedAnswers === 'object') {
      if ('answeredSections' in formattedAnswers) {
        console.log("[submit-form/extractFormattedAnswers]: Found single-nested formattedAnswers structure");
        return formattedAnswers;
      }
      
      if ('formattedAnswers' in formattedAnswers) {
        console.log("[submit-form/extractFormattedAnswers]: Found double-nested formattedAnswers structure");
        return formattedAnswers.formattedAnswers;
      }
    }
  }

  // Case 3: Look for answers within a metadata wrapper
  if ('rawAnswers' in answers && typeof answers.rawAnswers === 'object') {
    console.log("[submit-form/extractFormattedAnswers]: Found rawAnswers field, checking inside");
    const innerResult = extractFormattedAnswers(answers.rawAnswers);
    if (innerResult) {
      return innerResult;
    }
  }

  // Case 4: Raw answers format that needs transformation
  if (Object.keys(answers).length > 0) {
    console.log("[submit-form/extractFormattedAnswers]: Transforming raw answers to formatted structure");
    
    return {
      answeredSections: [{
        section_title: "Patientens svar",
        responses: Object.entries(answers)
          .filter(([key]) => !['formMetadata', 'metadata', '_metadata', '_isOptician'].includes(key))
          .map(([id, answer]) => {
            // Handle dynamic follow-up questions
            if (id.includes('_for_')) {
              const [baseQuestion, parentValue] = id.split('_for_');
              return {
                id,
                answer: {
                  parent_question: baseQuestion,
                  parent_value: parentValue.replace(/_/g, ' '),
                  value: answer
                }
              };
            }
            // Regular questions
            return { id, answer };
          })
      }]
    };
  }

  console.log("[submit-form/extractFormattedAnswers]: No valid answer structure found");
  return undefined;
};

/**
 * Trigger AI summary generation for an entry
 */
async function generateAiSummary(entryId: string, supabaseClient: any) {
  try {
    console.log(`[submit-form]: Triggering generate-summary function for entry: ${entryId}`);
    
    // Call the generate-summary function with the entry ID
    const { data: summaryData, error: summaryError } = await supabaseClient.functions.invoke('generate-summary', {
      body: { entryId }
    });
    
    if (summaryError) {
      console.error("[submit-form]: Error calling generate-summary function:", summaryError);
      return false;
    }
    
    console.log("[submit-form]: AI summary successfully generated");
    
    // The summary will be saved by the generate-summary function directly
    return true;
  } catch (error: any) {
    console.error("[submit-form]: Exception in generateAiSummary:", error);
    return false;
  }
}

// Create a Supabase client with admin permissions
const createAdminClient = () => {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
    global: { 
      headers: { 
        'X-Edge-Function': 'submit-form-admin'
      } 
    }
  });
};

// Check if the submission logs table exists and create it if not
async function ensureSubmissionLogsTableExists() {
  try {
    const result = await createSubmissionLogsTable();
    if (result) {
      console.log("[submit-form]: Submission logs table exists or was created successfully");
    } else {
      console.error("[submit-form]: Failed to create submission logs table");
    }
    return result;
  } catch (error) {
    console.error("[submit-form]: Error checking/creating submission logs table:", error);
    return false;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("[submit-form]: Handling OPTIONS request (CORS preflight)");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[submit-form]: Received form submission request");
    
    // Create the submission logs table if it doesn't exist yet
    await ensureSubmissionLogsTableExists();
    
    // Log the headers for debugging CORS issues
    const headersList = {};
    req.headers.forEach((value, key) => {
      headersList[key] = value;
    });
    console.log("[submit-form]: Request headers:", JSON.stringify(headersList));
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("[submit-form]: Request body parsed successfully");
    } catch (parseError) {
      console.error("[submit-form]: Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Enhanced debugging: log the entire request structure (excluding sensitive data)
    console.log("[submit-form]: Request structure:", JSON.stringify({
      hasToken: !!requestData?.token,
      tokenType: typeof requestData?.token,
      tokenLength: requestData?.token?.length,
      hasAnswers: !!requestData?.answers,
      answersType: typeof requestData?.answers,
      hasRawAnswers: !!requestData?.answers?.rawAnswers,
      rawAnswersType: typeof requestData?.answers?.rawAnswers,
      hasFormattedAnswers: !!requestData?.answers?.formattedAnswers,
      formattedAnswersType: typeof requestData?.answers?.formattedAnswers,
      hasMetadata: !!requestData?.answers?.metadata,
      isOptician: !!requestData?.answers?._isOptician || !!requestData?.answers?._metadata?.submittedBy === 'optician',
    }, null, 2));
    
    // Extract necessary data
    const { token, answers } = requestData;
    
    // Check if this is an optician submission
    const isOptician = answers?._isOptician === true || 
                      answers?._metadata?.submittedBy === 'optician';
                      
    console.log("[submit-form]: Submission type:", isOptician ? "Optician" : "Patient");
    
    // Validate token
    if (!token) {
      console.error("[submit-form]: Missing token parameter");
      
      await logSubmissionAttempt(
        null,
        null,
        isOptician,
        'error',
        'Missing token parameter',
        null
      );
      
      return new Response(
        JSON.stringify({ error: 'Missing token parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Basic token validation
    if (typeof token !== 'string' || token.length < 10) {
      console.error("[submit-form]: Invalid token format");
      
      await logSubmissionAttempt(
        token,
        null,
        isOptician,
        'error',
        'Invalid token format',
        null
      );
      
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate answers
    if (!answers) {
      console.error("[submit-form]: Missing form data");
      
      await logSubmissionAttempt(
        token,
        null,
        isOptician,
        'error',
        'Missing form data',
        null
      );
      
      return new Response(
        JSON.stringify({ error: 'Missing form data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("[submit-form]: Form submission received for token:", token.substring(0, 6) + "...");
    
    // Initialize both clients up front
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { 
        headers: { 
          'X-Edge-Function': 'submit-form'
        } 
      }
    });

    // Initialize admin client with service role key
    const supabaseAdmin = createAdminClient();
    
    // *** Step 1: First try to create the submission logs table to ensure logging works ***
    await ensureSubmissionLogsTableExists();
    
    // *** Step 2: Try to get the current token setting for debugging ***
    let currentToken = await checkAccessTokenValue();
    console.log("[submit-form]: Before setting token, current token value:", currentToken);
    
    // *** Step 3: Try setting access token for RLS policies ***
    console.log("[submit-form]: Setting access token in database session...");
    let setTokenSuccess = false;
    let setTokenErrorMessage = null;
    try {
      const { data: setTokenData, error: setTokenError } = await supabase.rpc('set_access_token', {
        token: token
      });
      
      if (setTokenError) {
        console.error("[submit-form]: Error setting access token:", setTokenError);
        setTokenErrorMessage = setTokenError.message;
        // Don't return yet, we'll try to continue with the admin client as fallback
      } else {
        console.log("[submit-form]: Access token set successfully. Result:", setTokenData);
        setTokenSuccess = true;
        
        // Double check that token was set
        let tokenAfterSetting = await checkAccessTokenValue();
        console.log("[submit-form]: After setting token, current token value:", tokenAfterSetting);
      }
    } catch (tokenError) {
      console.error("[submit-form]: Exception when setting access token:", tokenError);
      setTokenErrorMessage = tokenError.message;
      // Don't return yet, we'll try to continue with the admin client as fallback
    }
    
    // Log the token setting attempt
    await logSubmissionAttempt(
      token,
      null,
      isOptician,
      setTokenSuccess ? 'success' : 'error',
      setTokenErrorMessage ? `Token setting error: ${setTokenErrorMessage}` : null,
      null
    );
    
    // 1. First fetch the entry by token to get its ID and check its status
    console.log("[submit-form]: Fetching entry by token...");
    
    // Try with regular client first
    let entry = null;
    let entryError = null;
    
    // First attempt with token-based auth
    try {
      const { data: entryData, error: fetchEntryError } = await supabase
        .from('anamnes_entries')
        .select('id, status, is_magic_link, booking_id, form_id, organization_id')
        .eq('access_token', token)
        .maybeSingle();
      
      if (fetchEntryError) {
        console.error("[submit-form]: Error fetching entry with token auth:", fetchEntryError);
        entryError = fetchEntryError;
      } else if (entryData) {
        entry = entryData;
        console.log("[submit-form]: Entry found with token auth:", entry.id);
      } else {
        console.error("[submit-form]: No entry found with token auth");
      }
    } catch (fetchError) {
      console.error("[submit-form]: Exception fetching entry with token auth:", fetchError);
      entryError = fetchError;
    }
    
    // If token auth failed, try with admin client as fallback
    if (!entry) {
      console.log("[submit-form]: Trying admin client fallback for fetching entry...");
      try {
        const { data: adminEntryData, error: adminFetchError } = await supabaseAdmin
          .from('anamnes_entries')
          .select('id, status, is_magic_link, booking_id, form_id, organization_id')
          .eq('access_token', token)
          .maybeSingle();
          
        if (adminFetchError) {
          console.error("[submit-form]: Admin client also failed to fetch entry:", adminFetchError);
          
          // Log the error
          await logSubmissionAttempt(
            token,
            null,
            isOptician,
            'error',
            `Failed to fetch entry: ${entryError?.message || adminFetchError?.message}`,
            null
          );
          
          // If both methods fail, return the original error
          return new Response(
            JSON.stringify({ error: 'Failed to fetch entry', details: entryError?.message || adminFetchError?.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (!adminEntryData) {
          console.error("[submit-form]: No entry found with admin client either");
          
          // Log the error
          await logSubmissionAttempt(
            token,
            null,
            isOptician,
            'error',
            'Invalid token, no entry found',
            null
          );
          
          return new Response(
            JSON.stringify({ error: 'Invalid token, no entry found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        entry = adminEntryData;
        console.log("[submit-form]: Entry found with admin client:", entry.id);
      } catch (adminFetchError) {
        console.error("[submit-form]: Exception with admin client fetch:", adminFetchError);
        
        // Log the error
        await logSubmissionAttempt(
          token,
          null,
          isOptician,
          'error',
          `Server error fetching entry: ${adminFetchError.message}`,
          null
        );
        
        return new Response(
          JSON.stringify({ error: 'Server error fetching entry', details: adminFetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (!entry) {
      console.error("[submit-form]: No entry found with token:", token.substring(0, 6) + "...");
      
      // Log the error
      await logSubmissionAttempt(
        token,
        null,
        isOptician,
        'error',
        'Invalid token, no entry found after multiple attempts',
        null
      );
      
      return new Response(
        JSON.stringify({ error: 'Invalid token, no entry found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log that we found the entry
    await logSubmissionAttempt(
      token,
      entry.id,
      isOptician,
      'success',
      null,
      `Found entry with status: ${entry.status}`
    );
    
    console.log(`[submit-form]: Found entry ${entry.id}, status: ${entry.status}, is_magic_link: ${entry.is_magic_link}, form_id: ${entry.form_id}, org_id: ${entry.organization_id}`);
    
    // If the form was already submitted, return a success response
    if (entry.status === 'ready' && isOptician) {
      console.log("[submit-form]: Form was already submitted by optician, returning success");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Form was already submitted',
          submitted: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (entry.status === 'ready' && !isOptician) {
      console.log("[submit-form]: Form was already submitted by patient, returning success");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Form was already submitted',
          submitted: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch the form template to use for better formatting
    console.log("[submit-form]: Fetching form template with ID:", entry.form_id);
    let formTemplate = null;
    
    try {
      // Try with admin client for reliability
      const { data: templateData, error: templateError } = await supabaseAdmin
        .from('anamnes_forms')
        .select('schema')
        .eq('id', entry.form_id)
        .maybeSingle();
      
      if (templateError) {
        console.error("[submit-form]: Error fetching form template:", templateError);
      } else if (templateData) {
        formTemplate = templateData.schema;
        console.log("[submit-form]: Form template fetched successfully");
      } else {
        console.log("[submit-form]: No form template found with ID:", entry.form_id);
      }
    } catch (templateFetchError) {
      console.error("[submit-form]: Exception when fetching template:", templateFetchError);
      // Continue with the submission even if we can't fetch the template
    }

    // Prepare data for database update
    let updateData;
    
    try {
      // Enhanced answer extraction and validation
      console.log("[submit-form]: Data inspection and validation");
      console.log("[submit-form]: Answers type:", typeof answers);
      console.log("[submit-form]: Answers structure:", {
        isObject: typeof answers === 'object',
        hasRawAnswers: !!answers.rawAnswers,
        rawAnswersType: typeof answers.rawAnswers,
        hasFormattedAnswers: !!answers.formattedAnswers,
        formattedAnswersType: typeof answers.formattedAnswers,
        hasAnswersProperty: !!answers.answers,
        answersPropertyType: typeof answers.answers,
        directAnswersKeys: typeof answers === 'object' ? Object.keys(answers) : []
      });
      
      // Extract form data using safer access patterns with detailed validation
      let formData;
      
      // Handle different possible structures with more explicit validation
      if (answers.rawAnswers) {
        console.log("[submit-form]: Using rawAnswers property");
        formData = answers.rawAnswers;
      } else if (answers.answers) {
        console.log("[submit-form]: Using answers property");
        formData = answers.answers;
      } else if (typeof answers === 'object' && !Array.isArray(answers)) {
        console.log("[submit-form]: Using answers object directly");
        // Filter out special properties that aren't actual form answers
        formData = {};
        for (const key in answers) {
          if (!['metadata', 'formattedAnswers', 'rawAnswers', '_isOptician', '_metadata'].includes(key)) {
            formData[key] = answers[key];
          }
        }
      } else {
        console.error("[submit-form]: Could not determine valid answer structure");
        throw new Error("Invalid answer structure in submission");
      }
      
      // Generate formatted raw data using the improved algorithm
      let formattedRawData;
      
      // Try to use provided formatted data first
      if (typeof answers.formattedRawData === 'string' && answers.formattedRawData.trim() !== '') {
        console.log("[submit-form]: Using provided formattedRawData string");
        formattedRawData = answers.formattedRawData;
      } else if (answers.formatted_raw_data) {
        console.log("[submit-form]: Using provided formatted_raw_data");
        formattedRawData = answers.formatted_raw_data;
      } else {
        console.log("[submit-form]: Generating formatted raw data using improved algorithm");
        
        // Try to extract formatted answers structure
        const formattedAnswersObj = extractFormattedAnswers(answers);
        
        if (formTemplate && formattedAnswersObj) {
          // Use the optimized algorithm with the form template
          formattedRawData = createOptimizedPromptInput(formTemplate, formattedAnswersObj);
          console.log("[submit-form]: Generated formatted raw data using template and answers");
        } else {
          console.log("[submit-form]: Using fallback simple text formatting");
          // Fallback to simple formatting
          formattedRawData = "Patientens anamnesinformation:\n\n";
          if (typeof formData === 'object' && formData !== null) {
            Object.entries(formData).forEach(([key, value]) => {
              if (key !== 'metadata' && key !== 'formattedAnswers' && value !== null && value !== undefined) {
                formattedRawData += `${key}: ${JSON.stringify(value)}\n`;
              }
            });
          }
        }
      }
      
      // Log sample of the formatted raw data
      console.log("[submit-form]: Formatted raw data sample:", 
        formattedRawData ? formattedRawData.substring(0, 200) + "..." : "None generated");
        
      // Set status to 'ready' regardless of submission type (patient or optician)
      const status = 'ready';
      console.log(`[submit-form]: Setting status to '${status}' for all completed submissions`);
      
      // Prepare the update data
      updateData = { 
        answers: formData,
        formatted_raw_data: formattedRawData,
        status: status,
        updated_at: new Date().toISOString()
      };
      
      // Add sent_at if it's not already set
      if (status === 'ready') {
        updateData.sent_at = new Date().toISOString();
      }
      
      console.log("[submit-form]: Update data prepared successfully");
      console.log("[submit-form]: formData keys:", Object.keys(formData).length > 0 ? Object.keys(formData).slice(0, 5) + "..." : "EMPTY");
      console.log("[submit-form]: formData sample:", JSON.stringify(formData).substring(0, 100) + "...");
      
      // Log the update preparation
      await logSubmissionAttempt(
        token,
        entry.id,
        isOptician,
        'success',
        null,
        `Update data prepared with status: ${status}`
      );
      
    } catch (dataError) {
      console.error("[submit-form]: Error preparing update data:", dataError);
      
      // Log the submission attempt with error details
      await logSubmissionAttempt(
        token,
        entry.id,
        isOptician,
        'error',
        `Data preparation error: ${dataError.message}`,
        null
      );
      
      return new Response(
        JSON.stringify({ error: 'Failed to process form data', details: dataError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. Update the entry with the submitted data
    console.log("[submit-form]: Updating entry with submitted data...");
    console.log("[submit-form]: Entry ID:", entry.id);
    console.log("[submit-form]: Update data structure validation:",
      "answers is " + (updateData.answers ? "present" : "missing"),
      "answers has " + Object.keys(updateData.answers).length + " keys",
      "formatted_raw_data is " + (updateData.formatted_raw_data ? `present (${updateData.formatted_raw_data.substring(0, 50)}...)` : "missing")
    );
    
    // Log sample of data we're about to insert
    const sampleData = {
      answersSample: JSON.stringify(updateData.answers).substring(0, 200) + '...',
      formattedRawDataSample: updateData.formatted_raw_data.substring(0, 200) + '...',
      status: updateData.status
    };
    console.log("[submit-form]: Sample of data being inserted:", sampleData);
    
    // CRITICAL FIX - Always try the admin client first for reliable database updates
    // This ensures we bypass any RLS policy issues that might be preventing updates
    let updateSuccess = false;
    let updateError = null;
    
    console.log("[submit-form]: Attempting update with admin client for reliability...");
    try {
      const { error: adminUpdateError, data: adminUpdateData } = await supabaseAdmin
        .from('anamnes_entries')
        .update(updateData)
        .eq('id', entry.id)
        .select();
      
      if (adminUpdateError) {
        console.error("[submit-form]: Error updating with admin client:", adminUpdateError);
        updateError = adminUpdateError;
        
        // Log the error
        await logSubmissionAttempt(
          token,
          entry.id,
          isOptician,
          'error',
          `Admin update error: ${adminUpdateError.message}`,
          JSON.stringify(sampleData).substring(0, 200)
        );
      } else {
        console.log("[submit-form]: Entry updated successfully with admin client", adminUpdateData);
        updateSuccess = true;
        
        // Log the success
        await logSubmissionAttempt(
          token,
          entry.id,
          isOptician,
          'success',
          null,
          `Updated entry with admin client`
        );
      }
    } catch (adminUpdateCatchError) {
      console.error("[submit-form]: Exception during admin update:", adminUpdateCatchError);
      
      // Log the error
      await logSubmissionAttempt(
        token,
        entry.id,
        isOptician,
        'error',
        `Admin update exception: ${adminUpdateCatchError.message}`,
        JSON.stringify(sampleData).substring(0, 200)
      );
    }
    
    // If admin client failed, try with token-based client as fallback
    if (!updateSuccess && setTokenSuccess) {
      console.log("[submit-form]: Attempting update with token-based client as fallback...");
      try {
        const { error: clientUpdateError } = await supabase
          .from('anamnes_entries')
          .update(updateData)
          .eq('id', entry.id);
        
        if (clientUpdateError) {
          console.error("[submit-form]: Error updating with token-based client:", clientUpdateError);
          
          // Log the error
          await logSubmissionAttempt(
            token,
            entry.id,
            isOptician,
            'error',
            `Token update error: ${clientUpdateError.message}`,
            JSON.stringify(sampleData).substring(0, 200)
          );
          
          // If both methods failed, return error
          if (!updateSuccess) {
            return new Response(
              JSON.stringify({ 
                error: 'Failed to save form data', 
                details: updateError?.message || clientUpdateError.message 
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          console.log("[submit-form]: Entry updated successfully with token-based client");
          updateSuccess = true;
          
          // Log the success
          await logSubmissionAttempt(
            token,
            entry.id,
            isOptician,
            'success',
            null,
            `Updated entry with token-based client`
          );
        }
      } catch (clientUpdateCatchError) {
        console.error("[submit-form]: Exception during token-based update:", clientUpdateCatchError);
        
        // Log the error
        await logSubmissionAttempt(
          token,
          entry.id,
          isOptician,
          'error',
          `Token update exception: ${clientUpdateCatchError.message}`,
          JSON.stringify(sampleData).substring(0, 200)
        );
        
        // If both methods failed, return error
        if (!updateSuccess) {
          return new Response(
            JSON.stringify({ 
              error: 'Failed to save form data', 
              details: updateError?.message || clientUpdateCatchError.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Log the final update result
    if (updateSuccess) {
      console.log("[submit-form]: Entry successfully updated with final status:", updateData.status);
      
      // Check if entry was actually updated correctly by verifying it in the database
      console.log("[submit-form]: Verifying update was applied in database...");
      
      try {
        // Use admin client for reliable verification
        const { data: verifyData, error: verifyError } = await supabaseAdmin
          .from('anamnes_entries')
          .select('status, answers, formatted_raw_data')
          .eq('id', entry.id)
          .maybeSingle();
          
        if (verifyError) {
          console.error("[submit-form]: Error verifying update:", verifyError);
        } else if (verifyData) {
          console.log("[submit-form]: Verification result:", {
            status: verifyData.status,
            hasAnswers: verifyData.answers !== null,
            hasFormattedRawData: verifyData.formatted_raw_data !== null
          });
          
          if (verifyData.status !== updateData.status) {
            console.error("[submit-form]: WARNING - Status mismatch after update");
          }
          
          if (verifyData.answers === null) {
            console.error("[submit-form]: WARNING - Answers field is NULL after update");
          }
          
          if (verifyData.formatted_raw_data === null) {
            console.error("[submit-form]: WARNING - formatted_raw_data field is NULL after update");
          }
        } else {
          console.error("[submit-form]: WARNING - Entry not found during verification");
        }
      } catch (verifyError) {
        console.error("[submit-form]: Exception during verification:", verifyError);
      }
      
      // 3. Try to generate AI summary in background (don't block the response)
      console.log("[submit-form]: Attempting to trigger AI summary generation...");
      
      try {
        // Use EdgeRuntime.waitUntil for background processing to prevent blocking the response
        if (typeof EdgeRuntime !== 'undefined') {
          console.log("[submit-form]: Using EdgeRuntime.waitUntil for background summary generation");
          
          // Run AI summary generation in the background
          EdgeRuntime.waitUntil(generateAiSummary(entry.id, supabaseAdmin).catch((summaryError) => {
            console.error("[submit-form] Background AI summary generation failed:", summaryError);
          }));
        } else {
          console.log("[submit-form]: EdgeRuntime not available, attempting direct summary generation");
          
          // Try to generate but don't wait for the result
          generateAiSummary(entry.id, supabaseAdmin).catch((summaryError) => {
            console.error("[submit-form] Direct AI summary generation failed:", summaryError);
          });
        }
      } catch (aiError) {
        // Log the error but don't fail the submission
        console.error("[submit-form]: Error initiating AI summary generation:", aiError);
      }
      
      // Return success response to client
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Form successfully submitted',
          submitted: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // This should not happen as we should have returned earlier if both update methods failed
      console.error("[submit-form]: No update method was successful");
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save form data', 
          details: 'Both update methods failed' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    // Handle unexpected errors
    console.error("[submit-form]: Unexpected error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
