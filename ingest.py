# ingest.py
# ---------------------------------------------------------------------------
# PURPOSE: data/ folder lo unna .txt files ni chadi ChromaDB lo store cheyyadam
#
# CHANGE: sentence-transformers (torch based) బదులు ChromaDB built-in
#         ONNXMiniLM embedding use chestunnam - torch DLL block issue avoid
# ---------------------------------------------------------------------------

import os

# ChromaDB telemetry (gRPC) disable - company policy block chestundi
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"] = "False"

import chromadb
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

# ---------------------------------------------------------------------------
# STEP 1: ChromaDB built-in embedding function create cheyyadam
#
# ONNXMiniLM_L6_V2 - idi chromadb built-in model
# torch అవసరం లేదు - onnxruntime use chestundi (already installed, works!)
# Same quality embeddings - 'all-MiniLM-L6-v2' model same
# ---------------------------------------------------------------------------
print("Loading embedding function (ONNX - no torch needed)...")
embedding_fn = ONNXMiniLM_L6_V2()
print("Embedding function ready!")

# ---------------------------------------------------------------------------
# STEP 2: ChromaDB client create cheyyadam
#
# chroma_db/ folder lo data persist avutundi
# ---------------------------------------------------------------------------
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# ---------------------------------------------------------------------------
# STEP 3: Collection create cheyyadam
#
# embedding_function=embedding_fn pass cheyyadam - auto embed avutundi
# ---------------------------------------------------------------------------
collection = chroma_client.get_or_create_collection(
    name="confluence_docs",
    embedding_function=embedding_fn  # ChromaDB auto embed chestundi
)

# ---------------------------------------------------------------------------
# STEP 4: data/ folder lo anni .txt files cheyyadam
# ---------------------------------------------------------------------------
data_folder = "./data"
files = [f for f in os.listdir(data_folder) if f.endswith(".txt")]

print(f"\nFound {len(files)} documents to process: {files}\n")

# ---------------------------------------------------------------------------
# STEP 5: Each file ni chadi ChromaDB lo store cheyyadam
# ---------------------------------------------------------------------------
for filename in files:
    filepath = os.path.join(data_folder, filename)

    # File content chadadam
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # ChromaDB lo upsert cheyyadam
    # embedding_function set chesamu kaabatti - ChromaDB auto embed chestundi
    # documents pass chesthe chromadb itself embedding calculate chestundi
    collection.upsert(
        documents=[content],
        ids=[filename],
        metadatas=[{
            "filename": filename,
            "filepath": filepath
        }]
    )

    print(f"✓ Ingested: {filename}")

print(f"\n✅ Done! {len(files)} documents stored in ChromaDB.")
print("Now run: python -m streamlit run app.py")
