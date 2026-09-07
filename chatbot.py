# chatbot.py — LLM-free version
# Only ChromaDB vector search — no Ollama, no OpenAI needed
import os

os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"]     = "False"

import chromadb
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

# ── ChromaDB setup ────────────────────────────────────────────────────────────
print("Loading chatbot components...")
embedding_fn  = ONNXMiniLM_L6_V2()
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection    = chroma_client.get_or_create_collection(
    name="confluence_docs",
    embedding_function=embedding_fn
)
print("Chatbot ready! (LLM-free mode)")

# ── Search ────────────────────────────────────────────────────────────────────
def search_documents(query: str, top_k: int = 5):
    return collection.query(
        query_texts=[query],
        n_results=top_k,
        include=["documents", "distances", "metadatas"]
    )

# ── Extract structured content from document text ────────────────────────────
def extract_answer_from_doc(content: str, query: str) -> str:
    """
    LLM lekundane document content ni structured ga present cheyyadam.
    Solution Steps section find chesi return chestundi.
    """
    lines = content.split('\n')

    # Try to find Solution Steps section
    solution_lines = []
    in_solution = False

    for line in lines:
        line_lower = line.lower().strip()

        # Solution section start detect
        if any(k in line_lower for k in ['solution', 'resolution', 'fix', 'steps', 'how to']):
            in_solution = True
            solution_lines.append(line)
            continue

        # Stop at next major section
        if in_solution and line.strip() and line_lower.endswith(':') and len(line.strip()) < 40:
            if line_lower not in ['solution steps:', 'resolution steps:', 'solution:']:
                break

        if in_solution:
            solution_lines.append(line)

    if solution_lines:
        return '\n'.join(solution_lines).strip()

    # Fallback: return first 500 chars of content
    clean = '\n'.join(l for l in lines if l.strip())
    return clean[:600] + ('...' if len(clean) > 600 else '')


# ── Generate answer — no LLM, uses document content directly ─────────────────
def generate_answer(query: str, context_documents: list) -> str:
    """
    LLM call cheyyadam ledu.
    Top matched document nundi Solution Steps extract chesi return chestundi.
    """
    if not context_documents:
        return "No relevant information found in the Knowledge Base."

    # Use top document
    top_doc = context_documents[0]
    answer  = extract_answer_from_doc(top_doc, query)

    # If multiple docs, mention them
    if len(context_documents) > 1:
        answer += f"\n\n(Based on {len(context_documents)} matched knowledge base articles)"

    return answer


# ── Stub functions (no LLM — return template-based responses) ─────────────────
def generate_updated_page(query: str, original_content: str, ai_answer: str) -> str:
    """Returns original content — no LLM to improve it."""
    return original_content


def generate_new_page(query: str, ai_answer: str) -> str:
    """Returns a blank template — user fills it in."""
    return f"""Title: {query[:80]}

Problem:
Describe the issue here.

Root Cause:
Explain why this happens.

Solution Steps:
1. Step one
2. Step two
3. Step three

Additional Notes:
Add any warnings, escalation contacts, or tips here.

Tags: {', '.join(query.split()[:5])}
"""


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
            "answer":         "No relevant documents found. Try different keywords.",
            "matched_docs":   [],
            "has_good_match": False,
            "query":          query
        }

    # Extract answer from document content — no LLM
    answer = generate_answer(query, context_docs)

    return {
        "answer":         answer,
        "matched_docs":   matched_docs,
        "has_good_match": len(matched_docs) > 0,
        "query":          query
    }
