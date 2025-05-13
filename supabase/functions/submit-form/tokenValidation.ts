
/**
 * This module handles token validation for the submit-form edge function.
 * It validates tokens and extracts submission type (patient or optician).
 */

import { Logger } from './logger.ts';
import { OperationResult } from './types.ts';

export class TokenValidator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validates token and extracts submission data
   */
  validateSubmissionData(
    requestData: any
  ): OperationResult<{ token: string; answers: any; isOptician: boolean }> {
    // Extract necessary data
    const { token, answers } = requestData;
    
    // Check if this is an optician submission
    const isOptician = answers?._isOptician === true || 
                      answers?._metadata?.submittedBy === 'optician';
                      
    this.logger.info(`Submission type: ${isOptician ? "Optician" : "Patient"}`);
    
    // Validate token
    if (!token) {
      this.logger.error("Missing token parameter");
      
      return {
        success: false,
        error: 'Missing token parameter',
        errorCode: 'missing_token'
      };
    }
    
    // Basic token validation
    if (typeof token !== 'string' || token.length < 10) {
      this.logger.error(`Invalid token format: ${typeof token}, length: ${token?.length}`);
      
      return {
        success: false,
        error: 'Invalid token format',
        errorCode: 'invalid_token'
      };
    }
    
    // Validate answers
    if (!answers) {
      this.logger.error("Missing form data");
      
      return {
        success: false,
        error: 'Missing form data',
        errorCode: 'missing_data'
      };
    }
    
    this.logger.info(`Form submission received for token: ${token.substring(0, 6)}...`);
    
    return {
      success: true,
      data: {
        token,
        answers,
        isOptician
      }
    };
  }

  /**
   * Validates if an entry can be updated
   */
  validateEntryStatus(
    status: string | null,
    isOptician: boolean
  ): OperationResult<boolean> {
    // If the form was already submitted by optician, return success
    if (status === 'ready' && isOptician) {
      this.logger.info("Form was already submitted by optician, returning success");
      return { 
        success: false, 
        error: 'Form was already submitted',
        data: true // Indicate submission already complete
      };
    } 
    
    // If the form was already submitted by patient, return success
    if (status === 'ready' && !isOptician) {
      this.logger.info("Form was already submitted by patient, returning success");
      return { 
        success: false, 
        error: 'Form was already submitted',
        data: true // Indicate submission already complete
      };
    }
    
    return { success: true };
  }
}

// Create a default token validator
export const createTokenValidator = (logger: Logger): TokenValidator => new TokenValidator(logger);
