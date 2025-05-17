# retriever.py
import sys
import faiss
import pickle
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
index = faiss.read_index("faiss_index.idx")
with open("docs.pkl", "rb") as f:
    docs = pickle.load(f)

query = sys.argv[1]
embedding = model.encode([query])
D, I = index.search(embedding, 3)

for i in I[0]:
    print(docs[i])