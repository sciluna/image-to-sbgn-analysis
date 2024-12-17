import { config } from 'dotenv';
import { OpenAI } from 'openai';

// Load environment variables
config();

const runLLM = function (llmType, imageContent, langauage, icl) {

  // Initialize API
  let client = "";
  let llmModel = "";
  if (llmType == "gpt-4o") {
    client = new OpenAI({
      apiKey: process.env.OPEN_API_KEY
    });
    llmModel = "gpt-4o";
  }
  else if (llmType == "gemini_pro_1.5") {
    client = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    });
    llmModel = "gemini-1.5-pro";
  }

  async function main() {
    const response = await client.chat.completions.create({
      model: llmModel,
      messages: messagesArray
    });
    let answer = response.choices[0]["message"]["content"];
    return JSON.stringify(answer);
  }
  main();
}

export { runGPT }