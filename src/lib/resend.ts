import { Resend } from 'resend';

// Initialize Resend with the API key
// We return null if the key is missing to avoid crashing app initialization
// but individual calls should check for the client
export const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set');
    return null;
  }
  return new Resend(apiKey);
};

export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
