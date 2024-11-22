import { config } from 'dotenv';
import { OpenAI } from 'openai';

// Load environment variables
config();

const runGPT = function (imageContent, langauage, icl) {

  // Initialize OpenAI API
  const client = new OpenAI({
    apiKey: process.env.OPEN_API_KEY
  });

  async function main() {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: messagesArray
    });
    let answer = response.choices[0]["message"]["content"];
    return JSON.stringify(answer);
  }
  main();
}

export { runGPT }