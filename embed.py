from sentence_transformers import SentenceTransformer
from pymongo import MongoClient
import sys

# Load embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# MongoDB Community Server
client = MongoClient("mongodb://127.0.0.1:27017")
db = client["rag_doc"]
collection = db["docs"]

# Text from command line
text = sys.argv[1]

# Generate embedding
embedding = model.encode(text).tolist()

# Insert into MongoDB
collection.insert_one({
    "text": text,
    "embedding": embedding
})

print("OK")
