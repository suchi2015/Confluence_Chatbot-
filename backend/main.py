# backend/main.py
# FastAPI backend — React frontend ki API endpoints provide cheyyadam

import os, sys

# parent folder ni path lo add cheyyadam (chatbot.py access cheyyadaniki)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"]     = "False"

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os

from chatbot import (
    process_query,
    generate_updated_page,
    generate_new_page,
    save_updated_document,
    save_new_document,
    reingest_document,
)

app = FastAPI(title="Confluence Chatbot API")

# CORS — React dev server (localhost:5173) allow cheyyadam
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://15.206.180.134",
        "http://15.206.180.134:80",
        "*"   # dev lo anni allow cheyyadaniki
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response Models ─────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str

class UpdateRequest(BaseModel):
    query:            str
    filename:         str
    filepath:         str
    original_content: str
    ai_answer:        str

class SaveUpdateRequest(BaseModel):
    filepath:    str
    filename:    str
    new_content: str

class NewPageRequest(BaseModel):
    query:     str
    ai_answer: str

class SaveNewPageRequest(BaseModel):
    filename: str
    content:  str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Confluence Chatbot API running"}


@app.post("/search")
def search(req: SearchRequest):
    """
    User query → matched documents + AI answer return chestundi.
    Only >=40% match documents return avutayi.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    result = process_query(req.query)
    return result


@app.get("/health")
def health():
    """Health check — also shows ChromaDB document count."""
    try:
        from chatbot import collection
        count = collection.count()
        return {"status": "ok", "chromadb_docs": count}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@app.post("/search-fast")
def search_fast(req: SearchRequest):
    """
    Fast search — only returns matched documents, NO LLM call.
    Instant response. Use this for showing matched files quickly.
    AI answer can be fetched separately via /generate-answer.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    from chatbot import search_documents
    results = search_documents(req.query, top_k=5)

    matched_docs = []
    MIN_SIMILARITY = 30.0

    for i in range(len(results['documents'][0])):
        doc_content  = results['documents'][0][i]
        doc_metadata = results['metadatas'][0][i]
        distance     = results['distances'][0][i]
        score        = round(max(0, (1 - distance / 2) * 100), 1)

        if score >= MIN_SIMILARITY:
            matched_docs.append({
                "filename": doc_metadata['filename'],
                "filepath": doc_metadata['filepath'],
                "content":  doc_content,
                "score":    score
            })

    return {
        "matched_docs":   matched_docs,
        "has_good_match": len(matched_docs) > 0,
        "query":          req.query,
        "answer":         ""   # empty — fetch via /generate-answer
    }


class AnswerRequest(BaseModel):
    query: str
    context_docs: list[str]


class GeneralAnswerRequest(BaseModel):
    query: str


@app.post("/generate-answer")
def generate_answer_endpoint(req: AnswerRequest):
    """Separate endpoint for LLM answer generation."""
    from chatbot import generate_answer
    if not req.context_docs:
        return {"answer": "No relevant documents found to generate an answer."}
    answer = generate_answer(req.query, req.context_docs)
    return {"answer": answer}


@app.post("/general-answer")
def general_answer(req: GeneralAnswerRequest):
    """
    General AI answer — responds to any query using Ollama.
    Falls back to smart rule-based responses if Ollama is offline.
    """
    import ollama as ollama_lib

    prompt = f"""You are a helpful AI assistant for a telecom support team's knowledge base.
Answer the following question helpfully and concisely.
If it's a greeting or casual message, respond naturally.
If it's a technical question, give a clear structured answer.

Question: {req.query}

Answer:"""

    try:
        response = ollama_lib.chat(
            model='llama3.2',
            messages=[{"role": "user", "content": prompt}]
        )
        return {"answer": response['message']['content']}
    except Exception:
        # Ollama offline — smart fallback responses
        return {"answer": _fallback_answer(req.query)}


def _fallback_answer(query: str) -> str:
    """Rule-based fallback when Ollama is not running."""
    q = query.lower().strip()

    if any(w in q for w in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
        return "Hello! 👋 I'm your AI assistant for telecom support. How can I help you today?"

    if any(w in q for w in ['how are you', 'how r u', "how's it going"]):
        return "I'm doing great, thanks for asking! I'm here to help with telecom support issues. What's your question?"

    if any(w in q for w in ['thank', 'thanks', 'thank you']):
        return "You're welcome! 😊 Feel free to ask if you have any other questions."

    if any(w in q for w in ['bye', 'goodbye', 'see you']):
        return "Goodbye! Come back anytime if you need help. 👋"

    if any(w in q for w in ['what can you do', 'help me', 'how do you work', 'capabilities']):
        return ("I can help you with:\n"
                "• Finding solutions in the knowledge base\n"
                "• Telecom issues: billing, recharge, network, SIM, roaming\n"
                "• Creating and updating confluence pages\n"
                "• Answering general support questions\n\n"
                "Just type your problem and I'll find the best solution!")

    if any(w in q for w in ['payment', 'recharge', 'not credited', 'deducted']):
        return ("For payment/recharge issues:\n"
                "1. Check your transaction ID or payment screenshot\n"
                "2. Verify payment status in the billing portal\n"
                "3. If paid but not credited — raise a manual credit request\n"
                "4. Credit reflects within 2–4 hours\n"
                "5. If payment failed — retry with alternate payment method\n\n"
                "Search the Knowledge Base tab for detailed confluence pages on this issue.")

    if any(w in q for w in ['network', 'signal', 'no service', 'coverage']):
        return ("For network/signal issues:\n"
                "1. Toggle Airplane Mode OFF/ON\n"
                "2. Check for network outages in your area\n"
                "3. Verify APN settings are correct\n"
                "4. Restart your device\n"
                "5. Try Wi-Fi Calling if indoor signal is poor\n\n"
                "Check the Knowledge Base tab for detailed troubleshooting guides.")

    if any(w in q for w in ['vpn', 'connect', 'internet', 'slow', 'speed']):
        return ("For VPN/internet issues:\n"
                "1. Check if your data plan is active\n"
                "2. Verify APN settings: Settings → Mobile Networks → APN\n"
                "3. Restart device and reconnect\n"
                "4. Check if FUP (Fair Usage Policy) limit is reached\n"
                "5. For VPN — ensure your plan supports enterprise connectivity\n\n"
                "Search the Knowledge Base for specific solutions.")

    if any(w in q for w in ['bill', 'billing', 'charge', 'invoice', 'overcharge']):
        return ("For billing issues:\n"
                "1. Pull your itemized bill for the billing period\n"
                "2. Check for any unauthorized VAS subscriptions\n"
                "3. Compare charges with your plan details\n"
                "4. Raise a reversal request if overcharged\n"
                "5. Credit reflects in 24–48 hours\n\n"
                "Check the Knowledge Base tab for detailed billing confluence pages.")

    # Generic fallback
    return (f"I understand you're asking about: \"{query}\"\n\n"
            "Here's how I can help:\n"
            "• Check the **Knowledge Base** tab — it may have a matching confluence page\n"
            "• Check the **Web Search** tab for general information\n"
            "• Try rephrasing your question with specific keywords\n\n"
            "Note: Full AI responses require the Ollama service to be running on the server.")


@app.post("/upload-query")
async def upload_query(file: UploadFile = File(...)):
    """
    .txt file upload chesthe content ni query ga use chesi search chestundi.
    """
    content = await file.read()
    query   = content.decode("utf-8")
    result  = process_query(query)
    return result


@app.post("/generate-update-preview")
def generate_update_preview(req: UpdateRequest):
    """
    Existing document + AI answer combine chesi improved version generate chestundi.
    """
    improved = generate_updated_page(req.query, req.original_content, req.ai_answer)
    return {"preview": improved}


@app.post("/save-update")
def save_update(req: SaveUpdateRequest):
    """
    Updated document ni file lo save chesi ChromaDB re-index chestundi.
    """
    save_updated_document(req.filepath, req.new_content)
    reingest_document(req.filepath, req.filename)
    return {"success": True, "message": f"{req.filename} updated and re-indexed"}


@app.post("/generate-new-page-preview")
def generate_new_page_preview(req: NewPageRequest):
    """
    New problem ki structured confluence document generate chestundi.
    """
    content = generate_new_page(req.query, req.ai_answer)
    return {"preview": content}


@app.post("/save-new-page")
def save_new_page(req: SaveNewPageRequest):
    """
    New document ni data/ folder lo save chesi ChromaDB lo index chestundi.
    """
    filepath = save_new_document(req.filename, req.content)
    filename = os.path.basename(filepath)
    reingest_document(filepath, filename)
    return {"success": True, "filename": filename, "filepath": filepath}


@app.get("/documents")
def list_documents():
    """
    data/ folder lo unna anni .txt files list chestundi.
    """
    data_folder = os.path.join(os.path.dirname(__file__), "..", "data")
    files = []
    if os.path.exists(data_folder):
        for f in os.listdir(data_folder):
            if f.endswith(".txt"):
                fp = os.path.join(data_folder, f)
                files.append({
                    "filename": f,
                    "filepath": fp,
                    "size":     os.path.getsize(fp),
                })
    return {"documents": files}
