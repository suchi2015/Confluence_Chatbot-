# app.py
import os, re
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"] = "False"

import streamlit as st
from chatbot import (
    process_query, generate_updated_page, generate_new_page,
    save_updated_document, save_new_document, reingest_document
)

st.set_page_config(page_title="Knowledge Base", page_icon="📘", layout="wide", initial_sidebar_state="collapsed")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;font-family:'Inter',sans-serif !important;}
html,body,.stApp{background:#f0f2f6 !important;margin:0;padding:0;}
#MainMenu,footer,header{visibility:hidden !important;}
[data-testid="stSidebar"]{display:none !important;}
.block-container{padding:0 !important;max-width:100% !important;}
[data-testid="stMain"]>div{padding:0 !important;}
[data-testid="stAppViewBlockContainer"]{padding:0 !important;}
[data-testid="stHorizontalBlock"]{gap:0 !important;align-items:center !important;}
[data-testid="column"]{padding:0 !important;}
[data-testid="column"]>div{padding:0 !important;}
[data-testid="stVerticalBlock"]>div{gap:0 !important;}

.kb-topbar{background:#1c2136;height:48px;display:flex;align-items:center;padding:0 20px;gap:10px;}
.kb-logo{width:26px;height:26px;background:#5b6ef5;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.78rem;flex-shrink:0;}
.kb-app-title{color:#fff;font-size:0.88rem;font-weight:600;}
.kb-app-sub{color:#5a6480;font-size:0.7rem;}

/* search input */
div[data-testid="stTextInput"]{margin:0 !important;}
div[data-testid="stTextInput"]>div>div{background:#f7f8fc !important;border:1.5px solid #e3e7f0 !important;border-radius:8px !important;box-shadow:none !important;padding:0 !important;}
div[data-testid="stTextInput"] input{font-size:0.84rem !important;color:#1c2136 !important;padding:10px 14px 10px 36px !important;background:transparent !important;background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23a0a8c0" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>') !important;background-repeat:no-repeat !important;background-position:12px center !important;border:none !important;box-shadow:none !important;}
div[data-testid="stTextInput"] input::placeholder{color:#a0a8c0 !important;}
div[data-testid="stTextInput"] label{display:none !important;}

/* file uploader — completely minimal, just the browse button */
div[data-testid="stFileUploader"]{margin:0 !important;}
div[data-testid="stFileUploader"] label{font-size:0.78rem !important;font-weight:500 !important;color:#4a5568 !important;margin-bottom:0 !important;}
div[data-testid="stFileUploader"]>div{padding:0 !important;}
div[data-testid="stFileUploader"] section{
    background:transparent !important;border:none !important;
    padding:0 !important;min-height:0 !important;
    box-shadow:none !important;height:auto !important;
}
div[data-testid="stFileUploader"] section>div{
    padding:0 !important;gap:0 !important;
    flex-direction:column !important;
    align-items:flex-start !important;
}
/* hide ALL text inside dropzone except the button */
div[data-testid="stFileUploaderDropzoneInstructions"]{display:none !important;}
div[data-testid="stFileUploader"] section span{display:none !important;}
div[data-testid="stFileUploader"] section p{display:none !important;}
div[data-testid="stFileUploader"] section small{display:none !important;}
div[data-testid="stFileUploader"] section svg{display:none !important;}
div[data-testid="stFileUploader"] section button{
    background:#f7f8fc !important;border:1px solid #e3e7f0 !important;
    color:#4a5568 !important;font-size:0.75rem !important;font-weight:500 !important;
    padding:8px 14px !important;border-radius:7px !important;
    box-shadow:none !important;white-space:nowrap !important;
    width:auto !important;margin:0 !important;
}
div[data-testid="stFileUploader"] section button:hover{
    background:#eef1ff !important;color:#5b6ef5 !important;border-color:#b3bdff !important;
}

/* all buttons default = blue */
div[data-testid="stButton"]>button{background:#5b6ef5 !important;color:#fff !important;border:none !important;border-radius:8px !important;font-size:0.83rem !important;font-weight:600 !important;padding:10px 22px !important;width:100% !important;white-space:nowrap !important;box-shadow:none !important;}
div[data-testid="stButton"]>button:hover{background:#4a5de0 !important;}

/* expand buttons inside .exp-wrap */
.exp-wrap div[data-testid="stButton"]>button{background:#f5f7ff !important;border:1px solid #dde3f5 !important;color:#7a82a0 !important;font-size:0.78rem !important;padding:3px 7px !important;width:auto !important;border-radius:5px !important;}
.exp-wrap div[data-testid="stButton"]>button:hover{background:#eef1ff !important;color:#5b6ef5 !important;}

/* secondary action buttons */
.btn-secondary div[data-testid="stButton"]>button{background:#fff !important;color:#4a5568 !important;border:1.5px solid #e3e7f0 !important;}
.btn-secondary div[data-testid="stButton"]>button:hover{border-color:#5b6ef5 !important;color:#5b6ef5 !important;}
.btn-danger div[data-testid="stButton"]>button{background:#fff !important;color:#c0392b !important;border:1.5px solid #fdd !important;}
.btn-danger div[data-testid="stButton"]>button:hover{background:#fdecea !important;}

/* panels */
.kb-panel{background:#fff;border-radius:10px;border:1px solid #e3e7f0;overflow:hidden;}
.kb-panel-hdr{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-bottom:1px solid #eef0f8;}
.kb-panel-title{display:flex;align-items:center;gap:6px;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.9px;color:#7a82a0;}
.kb-badge{background:#eef1ff;color:#5b6ef5;font-size:0.6rem;font-weight:700;border-radius:10px;padding:2px 8px;}
.kb-badge-ai{background:#f4edff;color:#7c3aed;font-size:0.6rem;font-weight:700;border-radius:10px;padding:2px 8px;}
.kb-doc-chip{background:#eef1ff;color:#5b6ef5;font-size:0.64rem;font-weight:600;padding:2px 9px;border-radius:5px;white-space:nowrap;}

/* doc items */
.kb-doc-item{display:flex;align-items:center;padding:8px 10px;border-radius:8px;border:1.5px solid #eef0f8;margin-bottom:6px;background:#fff;transition:border-color .12s,background .12s;}
.kb-doc-item.active{border-color:#b3bdff;background:#f7f9ff;}
.kb-doc-item:hover{border-color:#c5cce8;}
.kb-doc-left{flex:1;min-width:0;}
.kb-doc-name{font-size:0.77rem;font-weight:600;color:#1c2136;display:flex;align-items:center;gap:5px;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.score-g{display:inline-block;background:#e6f9ee;color:#177a3c;font-size:0.63rem;font-weight:700;padding:1px 7px;border-radius:10px;}
.score-o{display:inline-block;background:#fff4e0;color:#9a6400;font-size:0.63rem;font-weight:700;padding:1px 7px;border-radius:10px;}
.kb-doc-path{font-size:0.61rem;color:#a0a8c0;font-family:monospace;margin-top:2px;}

/* doc viewer */
.kb-doc-meta{padding:8px 14px;background:#f7f8fc;border-bottom:1px solid #eef0f8;}
.kb-doc-meta-tag{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#a0a8c0;}
.kb-doc-meta-title{font-size:0.86rem;font-weight:600;color:#1c2136;margin-top:2px;}
.kb-doc-body{padding:14px;font-size:0.75rem;color:#374151;line-height:1.7;white-space:pre-wrap;font-family:'Courier New',monospace;max-height:470px;overflow-y:auto;}

/* ai answer */
.kb-ai-body{padding:14px;font-size:0.78rem;color:#1c2136;line-height:1.74;max-height:490px;overflow-y:auto;}
.kb-step{background:#f5f7ff;border-left:3px solid #5b6ef5;border-radius:0 6px 6px 0;padding:8px 12px;margin:7px 0;}
.kb-step-t{font-weight:600;font-size:0.78rem;color:#1c2136;margin-bottom:3px;}
.kb-step-b{font-size:0.74rem;color:#374151;}
.kb-plain{font-size:0.77rem;color:#374151;margin-bottom:5px;}
.kb-bullet{font-size:0.75rem;color:#374151;padding:2px 0 2px 12px;}

/* enhancement banners */
.kb-banner{background:#fff;border:1px solid #e3e7f0;border-radius:10px;padding:14px 20px;margin-top:10px;}
.kb-banner-warn{background:#fffbf0;border-color:#fde8b0;}

.kb-empty{text-align:center;padding:60px 16px;color:#c5cce8;font-size:0.73rem;line-height:1.6;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-thumb{background:#dde3f0;border-radius:6px;}
::-webkit-scrollbar-track{background:transparent;}
</style>
""", unsafe_allow_html=True)

# ── TOPBAR ────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="kb-topbar">
    <div class="kb-logo">★</div>
    <span class="kb-app-title">Knowledge Base</span>
    <span class="kb-app-sub">&nbsp;&nbsp;AI-powered document search</span>
</div>
""", unsafe_allow_html=True)

# ── SEARCH BAR ────────────────────────────────────────────────────────────────
# Row: [search input] [Search →]
# Upload is a compact row below the search line, tightly controlled
st.markdown("<div style='background:#fff;border-bottom:1px solid #e3e7f0;padding:10px 20px 0 20px;'>", unsafe_allow_html=True)

c_q, c_btn = st.columns([8.2, 0.9])
with c_q:
    query_input = st.text_input("q", placeholder="Describe your problem or paste text here...", label_visibility="hidden")
with c_btn:
    search_clicked = st.button("Search →")

# Upload row — sits inline below search, tight height
st.markdown("<div style='display:flex;align-items:center;gap:8px;padding:0 0 10px 2px;margin-top:-8px;'>", unsafe_allow_html=True)
st.markdown("<span style='font-size:0.75rem;color:#7a82a0;'>⬆</span>", unsafe_allow_html=True)
uploaded_file = st.file_uploader("Upload problem doc", type=["txt"], label_visibility="collapsed")
st.markdown("</div>", unsafe_allow_html=True)

st.markdown("</div>", unsafe_allow_html=True)
final_query = query_input.strip()
if uploaded_file:
    final_query = uploaded_file.read().decode("utf-8")
    st.markdown(
        f"<div style='padding:3px 20px 4px;'><span style='font-size:0.68rem;color:#5b6ef5;"
        f"background:#eef1ff;padding:2px 9px;border-radius:4px;'>📎 {uploaded_file.name} loaded</span></div>",
        unsafe_allow_html=True
    )

if search_clicked and final_query:
    with st.spinner("Searching..."):
        st.session_state["result"]   = process_query(final_query)
        st.session_state["doc_open"] = None
        # clear previous enhancement states on new search
        for k in ["update_stage","update_action","update_preview","create_stage","create_preview","create_filename"]:
            st.session_state.pop(k, None)

result   = st.session_state.get("result",   None)
doc_open = st.session_state.get("doc_open", None)

# ── BODY ──────────────────────────────────────────────────────────────────────
st.markdown("<div style='padding:14px 20px;'>", unsafe_allow_html=True)

if doc_open is not None and result:
    col_docs, col_viewer, col_ai = st.columns([1.25, 1.7, 2.05])
else:
    col_docs, col_ai = st.columns([1.25, 3.75])
    col_viewer = None

# ── PANEL 1 : MATCHED DOCUMENTS ──────────────────────────────────────────────
with col_docs:
    all_docs     = result["matched_docs"] if result else []
    visible_docs = [(i, d) for i, d in enumerate(all_docs) if d["score"] >= 65]
    n            = len(visible_docs)
    badge        = f'<span class="kb-badge">{n}</span>' if n else ""

    st.markdown(f"""
    <div class="kb-panel" style="min-height:510px;">
      <div class="kb-panel-hdr">
        <span class="kb-panel-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a82a0" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Matched Documents
        </span>
        {badge}
      </div>
      <div style="padding:10px;">
    """, unsafe_allow_html=True)

    if visible_docs:
        for i, doc in visible_docs:
            score      = doc["score"]
            active_cls = "active" if doc_open == i else ""
            pill       = f'<span class="score-g">● {score}% match</span>' if score >= 80 else f'<span class="score-o">● {score}% match</span>'
            dc, ec = st.columns([5, 1])
            with dc:
                st.markdown(f"""
                <div class="kb-doc-item {active_cls}">
                  <div class="kb-doc-left">
                    <div class="kb-doc-name">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5b6ef5" stroke-width="2.3" stroke-linecap="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      {doc['filename']}
                    </div>
                    {pill}
                    <div class="kb-doc-path">./data/{doc['filename']}</div>
                  </div>
                </div>
                """, unsafe_allow_html=True)
            with ec:
                st.markdown("<div class='exp-wrap'>", unsafe_allow_html=True)
                icon = "⊠" if doc_open == i else "⊞"
                tip  = "Collapse" if doc_open == i else "Expand"
                if st.button(icon, key=f"exp_{i}", help=tip):
                    st.session_state["doc_open"] = None if doc_open == i else i
                    st.rerun()
                st.markdown("</div>", unsafe_allow_html=True)
    elif result:
        st.markdown('<div class="kb-empty">No documents matched<br>above 65% relevance</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="kb-empty">Matched documents<br>will appear here</div>', unsafe_allow_html=True)

    st.markdown("</div></div>", unsafe_allow_html=True)

# ── PANEL 2 : DOCUMENT VIEWER ────────────────────────────────────────────────
if col_viewer is not None:
    with col_viewer:
        doc   = result["matched_docs"][doc_open]
        lines = doc["content"].strip().split("\n")
        title = lines[0].replace("Title:", "").strip() if lines else doc["filename"]
        st.markdown(f"""
        <div class="kb-panel" style="min-height:510px;">
          <div class="kb-panel-hdr">
            <span class="kb-panel-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a82a0" stroke-width="2.5" stroke-linecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              Document
            </span>
            <span class="kb-doc-chip">{doc['filename']}</span>
          </div>
          <div class="kb-doc-meta">
            <div class="kb-doc-meta-tag">FILE</div>
            <div class="kb-doc-meta-title">{title}</div>
          </div>
          <div class="kb-doc-body">{doc['content']}</div>
        </div>
        """, unsafe_allow_html=True)

# ── PANEL 3 : AI ANSWER ──────────────────────────────────────────────────────
with col_ai:
    st.markdown("""
    <div class="kb-panel" style="min-height:510px;">
      <div class="kb-panel-hdr">
        <span class="kb-panel-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          AI Generated Answer
        </span>
        <span class="kb-badge-ai">AI</span>
      </div>
    """, unsafe_allow_html=True)

    if result:
        def render(text: str) -> str:
            out, lines, i = "", text.strip().split("\n"), 0
            while i < len(lines):
                ln = lines[i].strip()
                if not ln: i += 1; continue
                m = re.match(r'^(\d+)\.\s+\*\*(.+?)\*\*(.*)$', ln)
                if m:
                    num, ttl, rest = m.group(1), m.group(2), m.group(3).strip()
                    parts = [rest] if rest else []
                    i += 1
                    while i < len(lines):
                        nxt = lines[i].strip()
                        if not nxt or re.match(r'^\d+\.', nxt): break
                        parts.append(nxt); i += 1
                    body = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', " ".join(parts))
                    out += f'<div class="kb-step"><div class="kb-step-t">Step {num}: {ttl}</div><div class="kb-step-b">{body}</div></div>'
                    continue
                elif re.match(r'^\*\*(.+)\*\*$', ln):
                    t = re.sub(r'\*\*(.+)\*\*', r'\1', ln)
                    out += f'<div style="font-weight:600;font-size:0.79rem;color:#1c2136;margin:10px 0 4px;">{t}</div>'
                elif ln.startswith("- ") or ln.startswith("* "):
                    c = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', ln[2:])
                    out += f'<div class="kb-bullet">• {c}</div>'
                else:
                    c = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', ln)
                    out += f'<div class="kb-plain">{c}</div>'
                i += 1
            return out
        st.markdown(f'<div class="kb-ai-body">{render(result["answer"])}</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="kb-empty">Submit a problem above<br>to get an AI-powered solution</div>', unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)

st.markdown("</div>", unsafe_allow_html=True)

# ════════════════════════════════════════════════════════════════════════════
# ENHANCEMENT 1 — UPDATE EXISTING PAGE
# Appears when matched docs >= 65% found
# ════════════════════════════════════════════════════════════════════════════
if result and result.get("has_good_match") and visible_docs:
    best_idx, best_doc = visible_docs[0]

    if st.session_state.get("update_stage") != "preview":
        st.markdown(f"""
        <div class="kb-banner">
          <div style="font-size:0.78rem;font-weight:600;color:#1c2136;margin-bottom:4px;">
            💡 Want to update the existing confluence page with this AI answer?
          </div>
          <div style="font-size:0.71rem;color:#7a82a0;">
            The AI answer will be merged into <strong style="color:#5b6ef5;">{best_doc['filename']}</strong>
            and saved back to the knowledge base with better formatting.
          </div>
        </div>
        """, unsafe_allow_html=True)

        u1, u2, _ = st.columns([1.2, 1, 6])
        with u1:
            if st.button("✅ Yes, Update Page", key="update_yes"):
                st.session_state["update_action"] = {
                    "doc": best_doc, "answer": result["answer"],
                    "query": result.get("query", query_input)
                }
                st.session_state["update_stage"] = "preview"
                st.rerun()
        with u2:
            st.markdown("<div class='btn-secondary'>", unsafe_allow_html=True)
            if st.button("✖ No Thanks", key="update_no"):
                pass
            st.markdown("</div>", unsafe_allow_html=True)

    if st.session_state.get("update_stage") == "preview":
        ua = st.session_state["update_action"]
        if "update_preview" not in st.session_state:
            with st.spinner("Generating improved document..."):
                st.session_state["update_preview"] = generate_updated_page(
                    ua["query"], ua["doc"]["content"], ua["answer"]
                )

        st.markdown("**📄 Preview — Updated Confluence Document:**")
        edited_update = st.text_area("Review and edit if needed:", value=st.session_state["update_preview"], height=280, key="edit_update")

        p1, p2, _ = st.columns([1.4, 1, 5])
        with p1:
            if st.button("💾 Confirm & Save Update", key="confirm_update"):
                save_updated_document(ua["doc"]["filepath"], edited_update)
                reingest_document(ua["doc"]["filepath"], ua["doc"]["filename"])
                st.success(f"✅ **{ua['doc']['filename']}** updated and re-indexed!")
                for k in ["update_stage","update_action","update_preview"]:
                    st.session_state.pop(k, None)
                st.rerun()
        with p2:
            st.markdown("<div class='btn-secondary'>", unsafe_allow_html=True)
            if st.button("✖ Cancel", key="cancel_update"):
                for k in ["update_stage","update_action","update_preview"]:
                    st.session_state.pop(k, None)
                st.rerun()
            st.markdown("</div>", unsafe_allow_html=True)

# ════════════════════════════════════════════════════════════════════════════
# ENHANCEMENT 2 — CREATE NEW PAGE
# Appears when no match >= 65% found
# ════════════════════════════════════════════════════════════════════════════
if result and not result.get("has_good_match"):
    st.markdown("""
    <div class="kb-banner kb-banner-warn">
      <div style="font-size:0.78rem;font-weight:600;color:#1c2136;margin-bottom:4px;">
        📭 No existing confluence page found for this problem.
      </div>
      <div style="font-size:0.71rem;color:#7a82a0;">
        Would you like AI to create a new structured knowledge base document for this topic?
        You can review and edit before saving.
      </div>
    </div>
    """, unsafe_allow_html=True)

    if st.session_state.get("create_stage") is None:
        n1, n2, _ = st.columns([1.4, 1, 5])
        with n1:
            if st.button("✨ Create New Page", key="create_new"):
                st.session_state["create_stage"] = "naming"
                st.rerun()
        with n2:
            st.markdown("<div class='btn-secondary'>", unsafe_allow_html=True)
            if st.button("✖ Skip", key="skip_create"):
                pass
            st.markdown("</div>", unsafe_allow_html=True)

    if st.session_state.get("create_stage") == "naming":
        suggested = (result.get("query", "new_topic") or "new_topic")[:40].replace(" ", "_").lower()
        fname = st.text_input("📝 Filename for new page (without .txt):", value=suggested, key="new_fname")
        g1, _ = st.columns([1.2, 6])
        with g1:
            if st.button("🔍 Generate Document Preview", key="gen_preview"):
                with st.spinner("AI is generating structured confluence document..."):
                    st.session_state["create_preview"]  = generate_new_page(result.get("query", ""), result["answer"])
                    st.session_state["create_filename"] = fname
                    st.session_state["create_stage"]    = "preview"
                st.rerun()

    if st.session_state.get("create_stage") == "preview":
        st.markdown("**📄 Preview — New Confluence Document:**")
        edited_new = st.text_area(
            "Review and edit if needed:",
            value=st.session_state.get("create_preview", ""),
            height=300, key="edit_new_doc"
        )
        s1, s2, _ = st.columns([1.8, 1, 4])
        with s1:
            if st.button("💾 Approve & Save to Knowledge Base", key="save_new"):
                fname    = st.session_state.get("create_filename", "new_page")
                filepath = save_new_document(fname, edited_new)
                filename = os.path.basename(filepath)
                reingest_document(filepath, filename)
                st.success(f"✅ **{filename}** created and added to knowledge base!")
                for k in ["create_stage","create_preview","create_filename"]:
                    st.session_state.pop(k, None)
                st.rerun()
        with s2:
            st.markdown("<div class='btn-secondary'>", unsafe_allow_html=True)
            if st.button("✖ Discard", key="discard_new"):
                for k in ["create_stage","create_preview","create_filename"]:
                    st.session_state.pop(k, None)
                st.rerun()
            st.markdown("</div>", unsafe_allow_html=True)
