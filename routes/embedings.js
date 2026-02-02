/* const { OpenAI } = require("openai");
async function createEmbedings(text) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAIKEY,
    });

    const embeddings = await openai.embeddings.create({
      input: text,
      model: "text-embedding-ada-002",
    });

    return embeddings;
  } catch (error) {
    throw new Error(error);
  }
}

module.exports = { createEmbedings }; */




const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

async function createEmbedings(text) {
  try {
    const result = await model.embedContent(text);
    return result.embedding.values; // vector array
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = { createEmbedings };
