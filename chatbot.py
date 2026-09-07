# chatbot.py
import os

os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"]     = "False"

import chromadb
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

# ── LLM Configuration ────────────────────────────────────────────────────────
# Priority: OpenAI API key > Qwen vLLM server > Ollama local/remote
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
QWEN_API_URL   = os.environ.get("QWEN_API_URL", "")   # e.g. http://1.2.3.4:8000/v1
QWEN_MODEL     = os.environ.get("QWEN_MODEL", "Qwen/Qwen2.5-7B-Instruct-AWQ")
OLLAMA_HOST    = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

def _call_llm(prompt: str) -> str:
    """
    LLM call with priority:
    1. OpenAI (if OPENAI_API_KEY set)
    2. Qwen vLLM server (if QWEN_API_URL set)  ← your server
    3. Ollama local/remote fallback
    """

    # ── Option 1: OpenAI ──────────────────────────────────────────────────
    if OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            resp = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.3
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            print(f"OpenAI error: {e}")

    # ── Option 2: Qwen vLLM server (OpenAI-compatible API) ───────────────
    if QWEN_API_URL:
        try:
            from openai import OpenAI
            # vLLM serves OpenAI-compatible API — same client, different base_url
            client = OpenAI(
                api_key="EMPTY",        # vLLM needs any non-empty string
                base_url=QWEN_API_URL   # e.g. http://SERVER_IP:PORT/v1
            )
            resp = client.chat.completions.create(
                model=QWEN_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.3
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            print(f"Qwen vLLM error: {e}, falling back to Ollama")

    # ── Option 3: Ollama (local or remote) ───────────────────────────────
    import ollama
    client = ollama.Client(host=OLLAMA_HOST)
    resp = client.chat(
        model='llama3.2',
        messages=[{"role": "user", "content": prompt}]
    )
    return resp['message']['content']

# ── ChromaDB setup ────────────────────────────────────────────────────────────
print("Loading chatbot components...")
embedding_fn  = ONNXMiniLM_L6_V2()
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection    = chroma_client.get_or_create_collection(
    name="confluence_docs",
    embedding_function=embedding_fn
)
print("Chatbot ready!")

# ── Search ────────────────────────────────────────────────────────────────────
def search_documents(query: str, top_k: int = 5):
    return collection.query(
        query_texts=[query],
        n_results=top_k,
        include=["documents", "distances", "metadatas"]
    )

# ── Generate answer from KB context ──────────────────────────────────────────
def generate_answer(query: str, context_documents: list) -> str:
    context = "\n\n---\n\n".join(context_documents)
    prompt  = f"""You are an IT support assistant. Use ONLY the context below to answer.
Give a clear, step-by-step structured answer.

CONTEXT:
{context}

USER PROBLEM:
{query}

Answer:"""
    return _call_llm(prompt)

# ── Generate improved version of existing page ────────────────────────────────
def generate_updated_page(query: str, original_content: str, ai_answer: str) -> str:
    prompt = f"""You are a technical documentation writer.
Rewrite and improve the following document. Keep original structure, enhance with new insights.

ORIGINAL DOCUMENT:
{original_content}

NEW AI ANSWER TO INCORPORATE:
{ai_answer}

USER QUERY:
{query}

Generate improved document with sections: Title, Problem, Root Cause, Solution Steps, Additional Notes.
Use plain text labels (no ## markdown headers)."""
    return _call_llm(prompt)

# ── Generate new confluence page ──────────────────────────────────────────────
def generate_new_page(query: str, ai_answer: str) -> str:
    prompt = f"""You are a technical documentation writer for a company knowledge base.
Create a structured knowledge base document for this problem.

USER PROBLEM/TOPIC:
{query}

AI SOLUTION:
{ai_answer}

Generate document with sections: Title, Problem, Root Cause, Solution Steps, Additional Notes, Tags.
Use plain text labels. No markdown headers."""
    return _call_llm(prompt)

# ── File operations ───────────────────────────────────────────────────────────
def save_updated_document(filepath: str, new_content: str):
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

def save_new_document(filename: str, content: str) -> str:
    safe_name = filename.replace(" ", "_").lower()
    if not safe_name.endswith(".txt"):
        safe_name += ".txt"
    filepath = os.path.join("./data", safe_name)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    return filepath

def reingest_document(filepath: str, filename: str):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    collection.upsert(
        documents=[content],
        ids=[filename],
        metadatas={"filename": filename, "filepath": filepath}
    )

# ── Main query function ───────────────────────────────────────────────────────
def process_query(query: str):
    results      = search_documents(query, top_k=5)
    matched_docs = []
    context_docs = []
    MIN_SCORE    = 40.0

    for i in range(len(results['documents'][0])):
        content  = results['documents'][0][i]
        meta     = results['metadatas'][0][i]
        distance = results['distances'][0][i]
        score    = round(max(0, (1 - distance / 2) * 100), 1)

        if score >= MIN_SCORE:
            matched_docs.append({
                "filename": meta['filename'],
                "filepath": meta['filepath'],
                "content":  content,
                "score":    score
            })
            context_docs.append(content)

    if not context_docs:
        return {
            "answer":         "Sorry, no relevant information found in the Knowledge Base.",
            "matched_docs":   [],
            "has_good_match": False,
            "query":          query
        }

    answer = generate_answer(query, context_docs)
    return {
        "answer":         answer,
        "matched_docs":   matched_docs,
        "has_good_match": len(matched_docs) > 0,
        "query":          query
    }
