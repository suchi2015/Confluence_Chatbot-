# chatbot.py
# ---------------------------------------------------------------------------
# PURPOSE: User query ki related documents search cheyyadam + answer generate
#
# CHANGE: sentence-transformers బదులు ChromaDB built-in ONNX embedding use
#         torch DLL block avoid cheyyadaniki
#
# Flow:
#   query (text) → ChromaDB ONNX embed → search → matched docs → LLM → answer
# ---------------------------------------------------------------------------

import os

# ChromaDB telemetry (gRPC) disable
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"] = "False"

import chromadb
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
import ollama

# ---------------------------------------------------------------------------
# Models and DB load cheyyadam
# Ivi oka sari load avutai (app start ainapudu)
# ---------------------------------------------------------------------------
print("Loading chatbot components...")
embedding_fn = ONNXMiniLM_L6_V2()
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(
    name="confluence_docs",
    embedding_function=embedding_fn
)
print("Chatbot ready!")


def search_documents(query: str, top_k: int = 3):
    """
    User query ki most similar documents find chestundi.

    HOW IT WORKS:
    1. Query text ni ChromaDB ONNX embedding ga convert chestundi
    2. ChromaDB lo stored document embeddings tho compare chestundi
    3. Most similar top_k documents return chestundi

    Args:
        query: User typed problem (text)
        top_k: Enni documents return cheyyali (default 3)

    Returns:
        results: ChromaDB query results
    """
    # ChromaDB query_texts use chestam - auto embed chestundi
    # query_embeddings manually pass cheyyatledu - ChromaDB itself chestundi
    results = collection.query(
        query_texts=[query],   # text pass chestam, embedding_fn auto convert chestundi
        n_results=top_k,
        include=["documents", "distances", "metadatas"]
    )

    return results


def generate_answer(query: str, context_documents: list) -> str:
    """
    Matched documents ni context ga use chesi LLM tho answer generate cheyyadam.
    """
    context = "\n\n---\n\n".join(context_documents)

    prompt = f"""You are an IT support assistant. Use ONLY the information provided in the context below to answer the user's problem. 
Do not make up information. Give a clear, step-by-step structured answer.

CONTEXT FROM KNOWLEDGE BASE:
{context}

USER PROBLEM:
{query}

Provide a helpful, structured answer with numbered steps if applicable:"""

    response = ollama.chat(
        model='llama3.2',
        messages=[{"role": "user", "content": prompt}]
    )
    return response['message']['content']


def generate_updated_page(query: str, original_content: str, ai_answer: str) -> str:
    """
    Existing document content + AI answer ni combine chesi better formatted
    confluence page generate cheyyadam.
    """
    prompt = f"""You are a technical documentation writer. 
Rewrite and improve the following confluence/knowledge base document by incorporating the new AI-generated answer.
Keep the original structure but enhance it with the new solution steps. Format it professionally.

ORIGINAL DOCUMENT:
{original_content}

NEW AI ANSWER TO INCORPORATE:
{ai_answer}

USER QUERY THAT TRIGGERED THIS:
{query}

Generate an improved, well-formatted document that combines the original content with the new insights.
Use clear sections: Title, Problem, Root Cause, Solution Steps, Additional Notes.
Do NOT use markdown headers (##). Use plain text with clear labels like "Title:", "Problem:", etc."""

    response = ollama.chat(
        model='llama3.2',
        messages=[{"role": "user", "content": prompt}]
    )
    return response['message']['content']


def generate_new_page(query: str, ai_answer: str) -> str:
    """
    New problem ki structured confluence page generate cheyyadam.
    """
    prompt = f"""You are a technical documentation writer for a company's knowledge base (like Confluence).
Create a well-structured knowledge base document for the following new problem/topic.

USER PROBLEM/TOPIC:
{query}

AI GENERATED SOLUTION:
{ai_answer}

Generate a complete, professional knowledge base document with these sections:
- Title: (descriptive title)
- Problem: (description of the issue)
- Root Cause: (why this happens)
- Solution Steps: (numbered steps)
- Additional Notes: (tips, warnings, contacts)
- Tags: (relevant keywords)

Do NOT use markdown headers (##). Use plain text with clear labels.
Make it comprehensive and easy to follow."""

    response = ollama.chat(
        model='llama3.2',
        messages=[{"role": "user", "content": prompt}]
    )
    return response['message']['content']


def save_updated_document(filepath: str, new_content: str):
    """Existing file ni new content tho update cheyyadam."""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)


def save_new_document(filename: str, content: str) -> str:
    """New document ni data/ folder lo save cheyyadam. Returns filepath."""
    # filename safe ga cheyyadam
    safe_name = filename.replace(" ", "_").lower()
    if not safe_name.endswith(".txt"):
        safe_name += ".txt"
    filepath = os.path.join("./data", safe_name)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    return filepath


def reingest_document(filepath: str, filename: str):
    """
    New/updated document ni ChromaDB lo re-index cheyyadam.
    Ingest.py logic ikkade repeat chestunnam.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    collection.upsert(
        documents=[content],
        ids=[filename],
        metadatas={"filename": filename, "filepath": filepath}
    )


# def process_query(query: str):
#     """
#     Main function - query vastundi, full result return chestundi.

#     Returns:
#         dict with:
#             - answer: LLM generated answer
#             - matched_docs: list of matched document info
#     """

#     # Step 1: Similar documents search
#     results = search_documents(query, top_k=3)

#     # Step 2: Results organize cheyyadam
#     matched_docs = []
#     documents_for_context = []

#     for i in range(len(results['documents'][0])):
#         doc_content = results['documents'][0][i]
#         doc_metadata = results['metadatas'][0][i]
#         distance = results['distances'][0][i]
#         # distance 0 = perfect match, higher = less similar
#         # percentage ga convert: max distance ~2 assume chestam
#         similarity_score = round(max(0, (1 - distance / 2) * 100), 1)

#         matched_docs.append({
#             "filename": doc_metadata['filename'],
#             "filepath": doc_metadata['filepath'],
#             "content": doc_content,
#             "score": similarity_score
#         })
#         documents_for_context.append(doc_content)

#     # Step 3: LLM answer generate
#     answer = generate_answer(query, documents_for_context)

#     return {
#         "answer": answer,
#         "matched_docs": matched_docs
#     }


def process_query(query: str):
    """
    Main function - query vastundi, full result return chestundi.

    Only documents with 65% or higher similarity
    will be shown and passed to the LLM.
    """

    # Step 1: Similar documents search - top 5 lo search cheyyadam
    results = search_documents(query, top_k=5)

    # Step 2: Results organize cheyyadam
    matched_docs = []
    documents_for_context = []

    # Minimum similarity required - lowered to 40% to show more relevant results
    MIN_SIMILARITY = 40.0

    for i in range(len(results['documents'][0])):
        doc_content = results['documents'][0][i]
        doc_metadata = results['metadatas'][0][i]
        distance = results['distances'][0][i]

        # Distance ni similarity percentage ga convert cheyyadam
        similarity_score = round(
            max(0, (1 - distance / 2) * 100),
            1
        )

        # Only 65% or above documents accept cheyyadam
        if similarity_score >= MIN_SIMILARITY:

            matched_docs.append({
                "filename": doc_metadata['filename'],
                "filepath": doc_metadata['filepath'],
                "content": doc_content,
                "score": similarity_score
            })

            documents_for_context.append(doc_content)

    # Step 3: Relevant documents dorakakapothe
    if not documents_for_context:
        return {
            "answer": "Sorry, I could not find any relevant information in the Knowledge Base.",
            "matched_docs": []
        }

    # Step 4: Only 65%+ matched documents ni LLM ki pampadam
    answer = generate_answer(
        query,
        documents_for_context
    )

    return {
        "answer": answer,
        "matched_docs": matched_docs,
        "has_good_match": len(matched_docs) > 0,
        "query": query
    }