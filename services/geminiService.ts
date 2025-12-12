import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateStyledText = async (referenceImageBase64: string, stylePrompt: string): Promise<string> => {
  const ai = getClient();
  
  // Clean base64
  const cleanBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");

  const prompt = `
    You are a texture mapping AI assistant.
    The attached image is a strict binary mask:
    - Black Pixels = The text/object to be styled.
    - White Pixels = The background (immutable).

    TASK:
    Apply the following style description ONLY to the black pixels of the input image. 
    
    STYLE DESCRIPTION:
    ${stylePrompt}
    
    STRICT CONSTRAINTS:
    1. MASK ADHERENCE: You MUST NOT alter the white background pixels. They must remain pure white (#FFFFFF). Do not add shadows, glow, or debris to the background.
    2. FILL ONLY: Replace the black fill of the letters with the requested texture/material (e.g., if the style is "lava", the letters should look like they are made of lava).
    3. SILHOUETTE: Preserve the exact shape and legibility of the letters. Do not distort the glyph boundaries.
    4. NO HALLUCINATION: Do not add new objects, text, or shapes. Work strictly within the provided black pixel mask.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          }
        ]
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response. The model may have blocked the request.");
  } catch (error) {
    console.error(`Error generating styled text:`, error);
    throw error;
  }
};