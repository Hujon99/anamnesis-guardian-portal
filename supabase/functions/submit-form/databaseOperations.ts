
/**
 * This module handles database operations for the submit-form edge function.
 * It provides methods for fetching entries, updating entries, and logging attempts.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { EntryData, EntryUpdateData, OperationResult } from './types.ts';
import { Logger } from './logger.ts';
import { logSubmissionAttempt, checkAccessTokenValue } from '../utils/databaseFunctions.ts';

export class DatabaseOperations {
  private logger: Logger;
  private supabaseUrl: string;
  private supabaseKey: string;
  private supabaseServiceRoleKey: string;
  private supabase: any; // Regular client
  private supabaseAdmin: any; // Admin client with service role

  constructor(logger: Logger) {
    this.logger = logger;
    this.supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    this.supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    this.supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Initialize clients
    this.initializeClients();
  }

  /**
   * Initialize both regular and admin Supabase clients
   */
  private initializeClients(): void {
    // Regular client with anon key
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
      auth: { persistSession: false },
      global: { 
        headers: { 
          'X-Edge-Function': 'submit-form'
        } 
      }
    });

    // Admin client with service role key
    this.supabaseAdmin = createClient(this.supabaseUrl, this.supabaseServiceRoleKey, {
      auth: { persistSession: false },
      global: { 
        headers: { 
          'X-Edge-Function': 'submit-form-admin'
        } 
      }
    });
  }

  /**
   * Set access token for RLS policies
   */
  async setAccessToken(token: string): Promise<OperationResult<boolean>> {
    try {
      const { data, error } = await this.supabase.rpc('set_access_token', {
        token: token
      });
      
      if (error) {
        this.logger.error("Error setting access token:", error);
        return { 
          success: false, 
          error: error.message,
          errorDetails: JSON.stringify(error)
        };
      }
      
      this.logger.info("Access token set successfully", { result: data });
      
      // Verify token was set
      const tokenValue = await checkAccessTokenValue();
      this.logger.debug("Current token value after setting:", { tokenValue });
      
      return { success: true };
    } catch (error) {
      this.logger.error("Exception when setting access token:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error instanceof Error ? error.stack : JSON.stringify(error)
      };
    }
  }

  /**
   * Fetch an entry by token
   */
  async getEntryByToken(token: string): Promise<OperationResult<EntryData>> {
    // Try with regular client first (token auth)
    try {
      const { data, error } = await this.supabase
        .from('anamnes_entries')
        .select('id, status, is_magic_link, booking_id, form_id, organization_id, store_id, first_name, booking_date, created_by_name')
        .eq('access_token', token)
        .maybeSingle();
      
      if (error) {
        this.logger.error("Error fetching entry with token auth:", error);
      } else if (data) {
        this.logger.info(`Entry found with token auth: ${data.id}`);
        return { success: true, data };
      } else {
        this.logger.warn("No entry found with token auth");
      }
    } catch (error) {
      this.logger.error("Exception fetching entry with token auth:", error);
    }
    
    // Fallback to admin client if token auth failed
    this.logger.info("Trying admin client fallback for fetching entry");
    
    try {
      const { data, error } = await this.supabaseAdmin
        .from('anamnes_entries')
        .select('id, status, is_magic_link, booking_id, form_id, organization_id, store_id, first_name, booking_date, created_by_name')
        .eq('access_token', token)
        .maybeSingle();
        
      if (error) {
        this.logger.error("Admin client also failed to fetch entry:", error);
        return {
          success: false,
          error: "Failed to fetch entry",
          errorDetails: error.message,
          errorCode: "database_error"
        };
      }
      
      if (!data) {
        this.logger.warn("No entry found with admin client either");
        return {
          success: false,
          error: "Invalid token, no entry found",
          errorCode: "not_found"
        };
      }
      
      this.logger.info(`Entry found with admin client: ${data.id}`);
      return { success: true, data };
    } catch (error) {
      this.logger.error("Exception with admin client fetch:", error);
      return {
        success: false,
        error: "Server error fetching entry",
        errorDetails: error instanceof Error ? error.message : JSON.stringify(error),
        errorCode: "server_error"
      };
    }
  }

  /**
   * Fetch a form template by ID
   */
  async getFormTemplate(formId: string): Promise<OperationResult<any>> {
    try {
      // Use admin client for reliability
      const { data, error } = await this.supabaseAdmin
        .from('anamnes_forms')
        .select('schema')
        .eq('id', formId)
        .maybeSingle();
      
      if (error) {
        this.logger.error("Error fetching form template:", error);
        return {
          success: false,
          error: "Error fetching form template",
          errorDetails: error.message
        };
      }
      
      if (!data) {
        this.logger.warn(`No form template found with ID: ${formId}`);
        return {
          success: false,
          error: "Form template not found"
        };
      }
      
      this.logger.info("Form template fetched successfully");
      return { success: true, data: data.schema };
    } catch (error) {
      this.logger.error("Exception when fetching template:", error);
      // Continue with the submission even if we can't fetch the template
      return {
        success: false,
        error: "Exception fetching form template",
        errorDetails: error instanceof Error ? error.message : JSON.stringify(error)
      };
    }
  }

  /**
   * Update an entry with submission data
   */
  async updateEntry(entryId: string, updateData: EntryUpdateData): Promise<OperationResult<any>> {
    // Log the entry being updated
    await logSubmissionAttempt(
      null,
      entryId,
      updateData.status === 'optician_ready',
      'attempt',
      null,
      JSON.stringify(updateData).substring(0, 200)
    );
    
    // Try with admin client first for reliability
    try {
      const { error, data } = await this.supabaseAdmin
        .from('anamnes_entries')
        .update(updateData)
        .eq('id', entryId)
        .select();
      
      if (error) {
        this.logger.error("Error updating with admin client:", error);
        
        // Log the error
        await logSubmissionAttempt(
          null,
          entryId,
          updateData.status === 'optician_ready',
          'error',
          `Admin update error: ${error.message}`,
          JSON.stringify(updateData).substring(0, 200)
        );
        
        // Try with token-based client as fallback
        return await this.updateEntryWithTokenAuth(entryId, updateData);
      }
      
      this.logger.info(`Entry ${entryId} updated successfully with admin client`);
      
      // Log the success
      await logSubmissionAttempt(
        null,
        entryId,
        updateData.status === 'optician_ready',
        'success',
        null,
        `Updated with admin client`
      );
      
      // Verify the update
      await this.verifyEntryUpdate(entryId, updateData);
      
      return { success: true, data };
    } catch (adminUpdateError) {
      this.logger.error("Exception during admin update:", adminUpdateError);
      
      // Log the error
      await logSubmissionAttempt(
        null,
        entryId,
        updateData.status === 'optician_ready',
        'error',
        `Admin update exception: ${adminUpdateError instanceof Error ? adminUpdateError.message : JSON.stringify(adminUpdateError)}`,
        JSON.stringify(updateData).substring(0, 200)
      );
      
      // Try with token-based client as fallback
      return await this.updateEntryWithTokenAuth(entryId, updateData);
    }
  }

  /**
   * Fallback method to update entry with token auth
   */
  private async updateEntryWithTokenAuth(
    entryId: string,
    updateData: EntryUpdateData
  ): Promise<OperationResult<any>> {
    try {
      const { error } = await this.supabase
        .from('anamnes_entries')
        .update(updateData)
        .eq('id', entryId);
      
      if (error) {
        this.logger.error("Error updating with token-based client:", error);
        
        // Log the error
        await logSubmissionAttempt(
          null,
          entryId,
          updateData.status === 'optician_ready',
          'error',
          `Token update error: ${error.message}`,
          JSON.stringify(updateData).substring(0, 200)
        );
        
        return {
          success: false,
          error: "Failed to save form data",
          errorDetails: error.message,
          errorCode: "database_error"
        };
      }
      
      this.logger.info(`Entry ${entryId} updated successfully with token-based client`);
      
      // Log the success
      await logSubmissionAttempt(
        null,
        entryId,
        updateData.status === 'optician_ready',
        'success',
        null,
        `Updated with token-based client`
      );
      
      // Verify the update
      await this.verifyEntryUpdate(entryId, updateData);
      
      return { success: true };
    } catch (clientUpdateError) {
      this.logger.error("Exception during token-based update:", clientUpdateError);
      
      // Log the error
      await logSubmissionAttempt(
        null,
        entryId,
        updateData.status === 'optician_ready',
        'error',
        `Token update exception: ${clientUpdateError instanceof Error ? clientUpdateError.message : JSON.stringify(clientUpdateError)}`,
        JSON.stringify(updateData).substring(0, 200)
      );
      
      return {
        success: false,
        error: "Failed to save form data",
        errorDetails: clientUpdateError instanceof Error ? clientUpdateError.message : JSON.stringify(clientUpdateError),
        errorCode: "server_error"
      };
    }
  }

  /**
   * Verify that an entry was updated correctly
   */
  private async verifyEntryUpdate(
    entryId: string,
    updateData: EntryUpdateData
  ): Promise<void> {
    try {
      // Use admin client for reliable verification
      const { data, error } = await this.supabaseAdmin
        .from('anamnes_entries')
        .select('status, answers, formatted_raw_data')
        .eq('id', entryId)
        .maybeSingle();
        
      if (error) {
        this.logger.error("Error verifying update:", error);
      } else if (data) {
        this.logger.debug("Verification result:", {
          status: data.status,
          hasAnswers: data.answers !== null,
          hasFormattedRawData: data.formatted_raw_data !== null
        });
        
        if (data.status !== updateData.status) {
          this.logger.error("WARNING - Status mismatch after update");
        }
        
        if (data.answers === null) {
          this.logger.error("WARNING - Answers field is NULL after update");
        }
        
        if (data.formatted_raw_data === null) {
          this.logger.error("WARNING - formatted_raw_data field is NULL after update");
        }
      } else {
        this.logger.error("WARNING - Entry not found during verification");
      }
    } catch (verifyError) {
      this.logger.error("Exception during verification:", verifyError);
    }
  }

  /**
   * Trigger AI summary generation for an entry
   */
  async triggerAiSummary(entryId: string): Promise<boolean> {
    try {
      this.logger.info(`Triggering generate-summary function for entry: ${entryId}`);
      
      // Call the generate-summary function with the entry ID
      const { data, error } = await this.supabaseAdmin.functions.invoke('generate-summary', {
        body: { entryId }
      });
      
      if (error) {
        this.logger.error("Error calling generate-summary function:", error);
        return false;
      }
      
      this.logger.info("AI summary successfully triggered");
      return true;
    } catch (error) {
      this.logger.error("Exception in triggerAiSummary:", error);
      return false;
    }
  }
}

// Create a default database operations instance
export const createDatabaseOperations = (logger: Logger): DatabaseOperations => 
  new DatabaseOperations(logger);

/**
 * Main function to process form submission - coordinates all database operations
 */
export async function processFormSubmission(
  token: string,
  formData: any
): Promise<{ success: boolean; error?: string; statusCode?: number; entryId?: string }> {
  const logger = new Logger('processFormSubmission');
  const dbOps = createDatabaseOperations(logger);
  
  logger.info(`Processing form submission for token: ${token.substring(0, 6)}...`);
  
  try {
    // Set access token for RLS policies
    const setTokenResult = await dbOps.setAccessToken(token);
    if (!setTokenResult.success) {
      logger.error("Failed to set access token:", setTokenResult.error);
      return {
        success: false,
        error: "Authentication failed",
        statusCode: 401
      };
    }

    // Get entry by token
    const entryResult = await dbOps.getEntryByToken(token);
    if (!entryResult.success || !entryResult.data) {
      logger.error("Failed to get entry by token:", entryResult.error);
      return {
        success: false,
        error: entryResult.error || "Entry not found",
        statusCode: entryResult.errorCode === "not_found" ? 404 : 500
      };
    }

    const entry = entryResult.data;
    logger.info(`Found entry: ${entry.id}, current status: ${entry.status}`);

    // Check if form was already submitted
    if (entry.status === 'ready') {
      logger.info("Form was already submitted, returning success");
      return {
        success: true,
        entryId: entry.id
      };
    }

    // Determine if this is an optician submission
    const isOptician = formData._isOptician === true || 
                      formData._metadata?.submittedBy === 'optician';

    // Prepare update data
    const updateData: EntryUpdateData = {
      answers: formData,
      formatted_raw_data: JSON.stringify(formData, null, 2),
      status: isOptician ? 'ready' : 'ready',
      updated_at: new Date().toISOString()
    };

    // Update the entry
    const updateResult = await dbOps.updateEntry(entry.id, updateData);
    if (!updateResult.success) {
      logger.error("Failed to update entry:", updateResult.error);
      return {
        success: false,
        error: updateResult.error || "Failed to save form data",
        statusCode: updateResult.errorCode === "database_error" ? 500 : 400
      };
    }

    logger.info(`Form submission completed successfully for entry: ${entry.id}`);
    
    return {
      success: true,
      entryId: entry.id
    };

  } catch (error) {
    logger.error("Exception in processFormSubmission:", error);
    return {
      success: false,
      error: "Internal server error",
      statusCode: 500
    };
  }
}
