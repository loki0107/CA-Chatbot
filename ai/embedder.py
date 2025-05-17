# embedder.py
import mysql.connector
from sentence_transformers import SentenceTransformer
import faiss
import pickle

conn = mysql.connector.connect(
  host="localhost", user="root", password="Loki@1705", database="ca_chatbot"
)
cursor = conn.cursor()
cursor.execute("SELECT user_message, bot_response FROM conversations")
rows = cursor.fetchall()

docs = [f"Q: {r[0]} A: {r[1]}" for r in rows]
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(docs)

index = faiss.IndexFlatL2(embeddings.shape[1])
index.add(embeddings)

faiss.write_index(index, "faiss_index.idx")
with open("docs.pkl", "wb") as f:
    pickle.dump(docs, f)