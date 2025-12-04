import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const GEMINI_API_KEY: string = 'AIzaSyAFvqjXLN-wld3HqKlU3ZpZ29bChgwkemk';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface StepValidationResult {
  isValid: boolean;
  isStepCountImage: boolean;
  extractedStepCount: number | null;
  matchesUserInput: boolean;
  confidence: 'high' | 'medium' | 'low';
  message: string;
  aiReason?: string;
}

export const geminiService = {
  async validateStepCountImage(
    imageUri: string,
    userEnteredSteps: number
  ): Promise<StepValidationResult> {
    try {
      let base64Image: string;
      
      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Image = await blobToBase64(blob);
      } else {
        base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const prompt = `You are a step count validation assistant. Analyze this image and determine:

1. Is this a valid screenshot from a fitness app, smartwatch, or health tracking device showing step count?
2. What is the step count number shown in the image? Extract the main daily step count.
3. The user claims they walked ${userEnteredSteps} steps. Does this match the image?

IMPORTANT RULES:
- Only accept screenshots from legitimate fitness apps (Google Fit, Samsung Health, Apple Health, Fitbit, Mi Fit, Zepp, Garmin, etc.) or smartwatches
- The step count should be clearly visible as a number
- Random photos, edited images, or non-fitness screenshots should be rejected
- Allow a tolerance of ±500 steps for minor discrepancies

Respond in this exact JSON format only, no other text:
{
  "isStepCountImage": true/false,
  "extractedStepCount": number or null if not readable,
  "matchesUserInput": true/false,
  "confidence": "high"/"medium"/"low",
  "reason": "brief reason if invalid"
}`;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          },
        }),
      });

      if (!response.ok) {
        return {
          isValid: false,
          isStepCountImage: false,
          extractedStepCount: null,
          matchesUserInput: false,
          confidence: 'low',
          message: 'Verification failed. Please try again.',
        };
      }

      const result = await response.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        return {
          isValid: false,
          isStepCountImage: false,
          extractedStepCount: null,
          matchesUserInput: false,
          confidence: 'low',
          message: 'Could not verify image. Please try a clearer photo.',
        };
      }

      const aiResult = JSON.parse(jsonMatch[0]);
      const isValid = aiResult.isStepCountImage && aiResult.matchesUserInput;
      
      let message = 'AI Validation Failed';
      let aiReason = aiResult.reason || '';
      
      if (!aiResult.isStepCountImage) {
        message = 'AI Validation Failed';
      } else if (!aiResult.matchesUserInput) {
        message = `Step count mismatch. Image shows ${aiResult.extractedStepCount?.toLocaleString() || '?'} steps, you entered ${userEnteredSteps.toLocaleString()}.`;
        aiReason = '';
      } else {
        message = 'Verified successfully!';
        aiReason = '';
      }

      return {
        isValid,
        isStepCountImage: aiResult.isStepCountImage,
        extractedStepCount: aiResult.extractedStepCount,
        matchesUserInput: aiResult.matchesUserInput,
        confidence: aiResult.confidence,
        message,
        aiReason,
      };
    } catch (error) {
      return {
        isValid: false,
        isStepCountImage: false,
        extractedStepCount: null,
        matchesUserInput: false,
        confidence: 'low',
        message: 'Verification failed. Please try again.',
      };
    }
  },

  isConfigured(): boolean {
    return GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY' && GEMINI_API_KEY.trim().length > 0;
  },
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default geminiService;
