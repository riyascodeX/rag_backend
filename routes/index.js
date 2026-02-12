var express = require("express");
var router = express.Router();
const { MongoClient, ObjectId } = require("mongodb");
const fs=require("fs")
const { execSync } = require("child_process");

/* const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chatModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
}); */


var PDFParser = require("pdf2json");
const parser = new PDFParser(this, 1);


/* GET home page. */
router.get("/", async (req, res) => {
  try {
    const client = new MongoClient(process.env.DB);
    await client.connect();

    const db = client.db("rag_doc");
    await db.collection("test").insertOne({ status: "OK" });

    await client.close();

    res.json({ message: "MongoDB Community Server Connected ✅" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "MongoDB Connection Failed ❌" });
  }
});





router.post("/load-document", async (req, res) => {
  try {
    parser.loadPDF("./docs/amcpdf2.pdf");

    parser.once("pdfParser_dataReady", async () => {
      try {
        const content = parser.getRawTextContent();

        const splitContent = content
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 5);

        if (splitContent.length === 0) {
          return res.status(400).json({ message: "No valid text found" });
        }

        // MongoDB connect (optional – embed.py itself inserts)
        const client = await MongoClient.connect(process.env.DB);
        const db = client.db("rag_doc");
        const collection = db.collection("docs");

        // OPTIONAL: clear old docs (first time only)
        // await collection.deleteMany({});

        for (let line of splitContent) {
          // quotes break aagama irukka
          const safeLine = line.replace(/"/g, "");

          // 🔥 LOCAL EMBEDDING (Python)
          execSync(`python embed.py "${safeLine}"`, {
            stdio: "inherit"
          });
        }

        await client.close();

        res.json({
          message: "Document loaded successfully (LOCAL EMBEDDINGS)",
          chunks: splitContent.length
        });

      } catch (err) {
        console.error("Processing error:", err);
        res.status(500).json({ message: "Embedding failed" });
      }
    });

    parser.once("pdfParser_dataError", err => {
      console.error("PDF error:", err);
      res.status(500).json({ message: "PDF parse error" });
    });

  } catch (error) {
    console.error("Route error:", error);
    res.status(500).json({ message: "Error loading document" });
  }
});



/* router.post("/load-document", async (req, res) => {
  try {
    parser.loadPDF("./docs/amcpdf2.pdf");

    parser.once("pdfParser_dataReady", async () => {
      try {
        const content = parser.getRawTextContent();

        const splitContent = content
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 5);

        if (splitContent.length === 0) {
          return res.status(400).json({ message: "No valid text found" });
        }

        const client = await MongoClient.connect(process.env.DB);
        const db = client.db("rag_doc");
        const collection = db.collection("docs");

        const documents = [];

        const limitedContent = splitContent.slice(0, 50); // 👈 LIMIT

        for (let line of limitedContent) {
          const embedding = await createEmbedings(line);

          documents.push({
            text: line,
            embedding: embedding
          });

          await sleep(700); // 👈 DELAY
        }

        await collection.insertMany(documents);
        await client.close();

        res.json({
          message: "Document loaded successfully",
          chunks: documents.length
        });

      } catch (err) {
        console.error("Processing error:", err);
        res.status(500).json({ message: "Embedding failed" });
      }
    });

    parser.once("pdfParser_dataError", err => {
      console.error("PDF error:", err);
      res.status(500).json({ message: "PDF parse error" });
    });

  } catch (error) {
    console.error("Route error:", error);
    res.status(500).json({ message: "Error loading document" });
  }
}); */







////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/* router.post("/conversation", async (req, res) => {
  try {
    let sessionId = req.body.sessionId;
    const connection = await MongoClient.connect(process.env.DB);
    const db = connection.db("rag_doc");

    if (!sessionId) {
      const collection = db.collection("sessions");
      const sessionData = await collection.insertOne({ createdAt: new Date() });
      sessionId = sessionData._id;
    }

    if (sessionId) {
      const collection = db.collection("sessions");
      const sessionData = await collection.findOne({
        _id: new ObjectId(sessionId),
      });
      if (sessionData) {
        sessionId = sessionData._id;
      } else {
        return res.json({
          message: "Session Not Found",
        });
      }
    }

    // Lets work conversation
    const message = req.body.message;
    const conCollection = db.collection("conversation");
    await conCollection.insertOne({
      sessionId: sessionId,
      message: message,
      role: "USER",
      createdAt: new Date(),
    });

    // Convert message to vector
    console.log(req.body.message);
    const messageVector = await createEmbedings(req.body.message);

    const docsCollection = db.collection("docs");
    const vectorSearch = await docsCollection.aggregate([
      {
        $vectorSearch: {
          index: "default",
          path: "embedding",
          queryVector: messageVector.data[0].embedding,
          numCandidates: 150,
          limit: 10,
        },
      },
      {
        $project: {
          _id: 0,
          text: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ]);

    let finalResult = []

    for await(let doc of vectorSearch){
      finalResult.push(doc)
    }

    const ai = new OpenAI({
      apiKey : process.env.OPENAIKEY
    })

    const chat = await ai.chat.completions.create({
      model : "gpt-4",
      messages : [
        {
          role : "system",
          content : "You are a humble helper who can answer for questions asked by users from the given context."
        },
        {
          role : "user",
          content : `${finalResult.map(doc => doc.text + "\n")}
          \n
          From the above context, answer the following question: ${message}`
        }
      ]
    })

    console.log(`${finalResult.map(doc => doc.text + "\n")}
    \n
    From the above context, answer the following question: ${message}`)

    return res.json(chat.choices[0].message.content);
  } catch (error) {
    res.json({ message: "Something went wrong" });
    console.log(error);
  }
});

module.exports = router;
 */

///////////////////////////////////////////////////////////////////////////////////////////////////////////
/* router.post("/conversation", async (req, res) => {
  try {
    let sessionId = req.body.sessionId;
    const message = req.body.message;

    const connection = await MongoClient.connect(process.env.DB);
    const db = connection.db("rag_doc");

    // Session create
    if (!sessionId) {
      const sessionCol = db.collection("sessions");
      const sessionData = await sessionCol.insertOne({
        createdAt: new Date(),
      });
      sessionId = sessionData._id;
    }

    // Save user message
    const conCollection = db.collection("conversation");
    await conCollection.insertOne({
      sessionId,
      message,
      role: "USER",
      createdAt: new Date(),
    });

    // 🔑 EMBEDDING (Gemini)
    const messageVector = await createEmbedings(message); // ARRAY

    // 🔍 VECTOR SEARCH
    const docsCollection = db.collection("docs");
    const vectorSearch = await docsCollection.aggregate([
      {
        $vectorSearch: {
          index: "default",
          path: "embedding",
          queryVector: messageVector, // ✅ FIX
          numCandidates: 150,
          limit: 5,
        },
      },
      {
        $project: {
          _id: 0,
          text: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    let finalResult = [];
    for await (let doc of vectorSearch) {
      finalResult.push(doc);
    }

    // 🤖 GEMINI CHAT
    const prompt = `
Answer the question using ONLY the context below.

CONTEXT:
${finalResult.map(doc => doc.text).join("\n")}

QUESTION:
${message}
`;

    const result = await chatModel.generateContent(prompt);
    const answer = result.response.text();

    await connection.close();
    return res.json({ answer });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router; */



router.post("/conversation", async (req, res) => {
  try {
    let sessionId = req.body.sessionId;
    const message = req.body.message;

    const client = await MongoClient.connect(process.env.DB);
    const db = client.db("rag_doc");

    // Session create
    if (!sessionId) {
      const sessionCol = db.collection("sessions");
      const sessionData = await sessionCol.insertOne({
        createdAt: new Date(),
      });
      sessionId = sessionData._id;
    }

    // Save user message
    const conCollection = db.collection("conversation");
    await conCollection.insertOne({
      sessionId,
      message,
      role: "USER",
      createdAt: new Date(),
    });

    // 🔑 LOCAL EMBEDDING (Python)
    const safeMsg = message.replace(/"/g, "");
    const embeddingOutput = execSync(
      `python embed_query.py "${safeMsg}"`
    ).toString();

    const queryVector = JSON.parse(embeddingOutput);

    // 📥 Fetch all docs
    const docs = await db.collection("docs").find().toArray();

    // 📐 Cosine similarity
    function cosineSimilarity(a, b) {
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    const ranked = docs
      .map(doc => ({
        text: doc.text,
        score: cosineSimilarity(queryVector, doc.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // 🤖 GEMINI CHAT (ONLY ONCE)
    const prompt = `
Answer the question using ONLY the context below.

CONTEXT:
${ranked.map(d => d.text).join("\n")}

QUESTION:
${message}
`;

    const result = await chatModel.generateContent(prompt);
    const answer = result.response.text();

    await client.close();
    res.json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Conversation failed" });
  }
});

module.exports = router;


/////////////////////////////////////////////////////////////////////////////////////////////////////