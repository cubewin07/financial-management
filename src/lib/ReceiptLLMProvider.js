import { GoogleGenerativeAI } from "@google/generative-ai";

const CATEGORIES = ['Food', 'Groceries', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Education', 'Other'];

export class ReceiptLLMProvider {
  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!this.apiKey) {
      console.warn("VITE_GEMINI_API_KEY is not defined.");
    }
    this.genAI = new GoogleGenerativeAI(this.apiKey || "dummy");
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  getSystemPrompt() {
    return `You are an AI assistant that extracts expense data from receipt images.
Extract all individual line items from the receipt.
If the image is blurry, unreadable, or not a receipt, return an error message in the "error" field.
Otherwise, return the extracted items in the following JSON format. Do not return markdown, just raw JSON.
The "category" must be one of: ${CATEGORIES.join(', ')}. Try to best guess the category.
The "date" must be in YYYY-MM-DD format. If no date is found, use today's date or omit it (leave empty string).
The "amount" must be a number.
The "note" should be the name of the item or description.

Expected output schema:
{
  "items": [
    {
      "amount": 0.00,
      "category": "Food",
      "date": "2023-10-27",
      "note": "Item description"
    }
  ],
  "error": null | "Reason why it failed"
}`;
  }

  async parseReceipt(file) {
    if (!this.apiKey) {
        return { items: [], error: "Gemini API key is not configured." };
    }

    try {
      // Convert File to base64
      const base64Data = await this.fileToGenerativePart(file);

      const result = await this.model.generateContent([
        this.getSystemPrompt(),
        base64Data
      ]);

      const text = result.response.text();
      // Try to parse JSON from the text
      let jsonStr = text;
      // Remove markdown code blocks if any
      if (text.includes('```json')) {
        jsonStr = text.split('```json')[1].split('```')[0].trim();
      } else if (text.includes('```')) {
        jsonStr = text.split('```')[1].split('```')[0].trim();
      }

      const parsed = JSON.parse(jsonStr);
      
      // Validate schema
      if (!parsed.items || !Array.isArray(parsed.items)) {
          return { items: [], error: parsed.error || "Failed to extract items properly." };
      }

      return {
          items: parsed.items,
          error: parsed.error
      };

    } catch (error) {
      console.error("Error parsing receipt:", error);
      return {
          items: [],
          error: "An unexpected error occurred while parsing the receipt."
      };
    }
  }

  async fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });

    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  }
}
