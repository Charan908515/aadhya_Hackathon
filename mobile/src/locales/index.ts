import { Language, Translations } from './types';
import { en } from './en';
import { hi } from './hi';
import { ta } from './ta';
import { te } from './te';

export const translations: Record<Language, Translations> = {
  en,
  hi,
  ta,
  te,
};

export const languages = [
  { code: 'en' as Language, name: 'English', nativeName: 'English' },
  { code: 'hi' as Language, name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta' as Language, name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te' as Language, name: 'Telugu', nativeName: 'తెలుగు' },
];

export const getLanguagePrompt = (language: Language): string => {
  switch (language) {
    case 'hi':
      return 'Please provide your response in Hindi language.';
    case 'ta':
      return 'Please provide your response in Tamil language.';
    case 'te':
      return 'Please provide your response in Telugu language.';
    case 'en':
    default:
      return 'Please provide your response in English language.';
  }
};

export const getSystemPrompt = (language: Language): string => {
  const basePrompt = `You are a fraud detection expert. Analyze the image of a message and determine if it's fraudulent. 
Extract the text from the image and provide a detailed analysis.
Respond with a JSON object containing:
{
  "text": "extracted message text",
  "isFraud": true/false,
  "confidence": 0-100,
  "riskLevel": "SAFE"/"SUSPICIOUS"/"HIGH RISK",
  "fraudType": "type of fraud if detected",
  "explanation": "detailed explanation of why it's considered fraud or not"
}

Consider factors like:
- Urgency and pressure tactics
- Suspicious links or requests
- Grammar and spelling errors
- Unusual sender information
- Requests for personal/financial information
- Too good to be true offers`;

  const languageInstruction = getLanguagePrompt(language);
  
  switch (language) {
    case 'hi':
      return `${basePrompt}\n\n${languageInstruction}\n\nअपनी प्रतिक्रिया में सभी फ़ील्ड वैल्यूज़ (text, explanation, fraudType आदि) को हिंदी में प्रदान करें, केवल मूल संदेश पाठ को छोड़कर।`;
    case 'ta':
      return `${basePrompt}\n\n${languageInstruction}\n\nஉங்கள் பதிலில் அனைத்து புலப் பெறுமதிகளையும் (text, explanation, fraudType முதலியவை) தமிழில் வழங்கவும், அசல் செய்தி உரையைத் தவிர.`;
    case 'te':
      return `${basePrompt}\n\n${languageInstruction}\n\nమీ ప్రత్యుత్తరంలో అన్ని ఫీల్డ్ విలువలను (text, explanation, fraudType మొదలైనవి) తెలుగులో అందించండి, అసలు సందేశ టెక్స్ట్‌ను మినహాా.`;
    case 'en':
    default:
      return `${basePrompt}\n\n${languageInstruction}\n\nProvide all field values (text, explanation, fraudType, etc.) in English, except for the original message text.`;
  }
};
