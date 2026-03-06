import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import { localAnalyzeMessage, SpamVerdict } from '../data/sms';

export type GmailMessage = {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  date: number;
  verdict: SpamVerdict;
};

// Replace with your actual client IDs
const ANDROID_CLIENT_ID = '937562729236-l8cplo1r73c0pd6ksvqdll9foshp8ced.apps.googleusercontent.com';
const WEB_CLIENT_ID = '937562729236-7ia8ad56bqrikl8642r57kdmoe9utero.apps.googleusercontent.com';

export class GmailService {
  static configure() {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      offlineAccess: true,
    });
  }

  static async signIn(): Promise<{ accessToken: string | null; user: any }> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      return {
        accessToken: tokens.accessToken,
        user: userInfo.data?.user
      };
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the login flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in is in progress already');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('Play services not available or outdated');
      } else {
        console.log('Some other error happened:', error.message);
      }
      throw error;
    }
  }

  static async signOut() {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('SignOut error', error);
    }
  }

  static async getSignedInUser() {
    try {
      // Ensure configure is called before any operations
      this.configure();

      // First check if there falls back to a Play Services error
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Attempt to restore previous session silently (refreshes tokens if needed).
      // We do NOT use isSignedIn() here because on cold boot it may falsely return false
      // before signInSilently() has a chance to restore the token.
      const userInfo = await GoogleSignin.signInSilently();

      if (userInfo) {
        const tokens = await GoogleSignin.getTokens();
        return {
          accessToken: tokens.accessToken,
          user: userInfo.data?.user || (userInfo as any).user // Handle different versions of the lib
        }
      }
      return null;
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_REQUIRED) {
        // User has not signed in yet or session expired permanently
        console.log('User has not signed in yet');
      } else {
        console.log("Something went wrong restoring session", error);
      }
      return null;
    }
  }

  static async fetchRecentEmails(accessToken: string, maxResults = 20): Promise<GmailMessage[]> {
    try {
      console.log('Fetching emails with token:', accessToken.substring(0, 10) + '...');
      // 1. Get the list of message IDs
      const listResponse = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const messages = listResponse.data.messages;
      if (!messages || messages.length === 0) {
        console.log('No messages found.');
        return [];
      }

      console.log(`Found ${messages.length} messages, fetching details...`);

      // 2. Fetch full details for each message
      const detailedMessages: GmailMessage[] = [];

      for (const msg of messages) {
        try {
          const msgResponse = await axios.get(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          const data = msgResponse.data;
          const headers = data.payload.headers;

          const subjectHeader = headers.find((h: any) => h.name === 'Subject');
          const fromHeader = headers.find((h: any) => h.name === 'From');
          const dateHeader = headers.find((h: any) => h.name === 'Date');

          const subject = subjectHeader ? subjectHeader.value : '(No Subject)';
          const sender = fromHeader ? fromHeader.value : 'Unknown Sender';
          const dateStr = dateHeader ? dateHeader.value : new Date().toISOString();
          const date = new Date(dateStr).getTime();
          const snippet = data.snippet || '';

          // Extract body text if possible to improve ML context
          let bodyText = snippet;
          if (data.payload.parts) {
            const textPart = data.payload.parts.find((p: any) => p.mimeType === 'text/plain');
            if (textPart && textPart.body && textPart.body.data) {
              // Need to base64url decode
              try {
                // Simple b64 decoding fallback for react-native
                const base64str = textPart.body.data.replace(/-/g, '+').replace(/_/, '/');
                // This is a rough approximation, real b64 decode might be needed
                bodyText = decodeURIComponent(escape(atob(base64str))) || snippet;
              } catch (e) {
                console.log("Failed to decode body, using snippet", e);
              }
            }
          }

          // Combine subject and body for analysis
          const contentToAnalyze = `${subject}\n\n${bodyText}`;
          const verdict = localAnalyzeMessage(contentToAnalyze);

          detailedMessages.push({
            id: data.id,
            sender,
            subject,
            snippet,
            date,
            verdict,
          });
        } catch (err: any) {
          console.error(`Failed to fetch message ${msg.id}`, err?.response?.data || err.message);
        }
      }

      return detailedMessages.sort((a, b) => b.date - a.date);
    } catch (error: any) {
      console.error('Error fetching emails:', error?.response?.data || error.message);
      throw error;
    }
  }
}
