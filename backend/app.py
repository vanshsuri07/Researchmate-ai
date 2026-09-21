"""
app.py
------
ResearchMate AI - Flask backend entry point.

Endpoints:
  POST /api/upload            -> upload + process a PDF, returns document_id
  POST /api/ask                -> RAG question answering
  POST /api/summarize          -> document summary
  POST /api/keywords           -> keyword extraction
  POST /api/citations          -> citation analysis
  POST /api/research-gaps      -> research gap identification
  POST /api/future-work        -> future work suggestions
  POST /api/flashcards         -> flashcard generation
  POST /api/glossary           -> glossary generation
  POST /api/title              -> title extraction
  POST /api/similar-papers     -> find similar papers via Semantic Scholar
"""

import os
from pathlib import Path
import uuid
from dotenv import load_dotenv

# Load .env explicitly from backend folder and parent
backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / ".env")
load_dotenv(backend_dir.parent / ".env")
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from document_processor import process_pdf
from vector_store import DocumentVectorStore
import llm_engine
from scholar_api import search_related_papers

app = Flask(__name__)
CORS(app)

import json

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
STORAGE_FOLDER = os.path.join(os.path.dirname(__file__), "storage")
META_FILE = os.path.join(STORAGE_FOLDER, "documents_meta.json")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(STORAGE_FOLDER, exist_ok=True)

# In-memory store: document_id -> {"store": DocumentVectorStore, "sample": str, "filename": str, "chunks": list}
DOCUMENTS = {}


def _save_meta():
    try:
        data = {}
        for doc_id, info in DOCUMENTS.items():
            data[doc_id] = {
                "filename": info.get("filename"),
                "sample": info.get("sample"),
                "chunks": info.get("chunks", []),
            }
        with open(META_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[Storage] Error saving metadata: {e}")


def _load_stored_documents():
    if not os.path.exists(META_FILE):
        return
    try:
        with open(META_FILE, "r", encoding="utf-8") as f:
            meta = json.load(f)
        for doc_id, info in meta.items():
            index_path = os.path.join(STORAGE_FOLDER, f"{doc_id}.faiss")
            chunks = info.get("chunks", [])
            if os.path.exists(index_path) and chunks:
                try:
                    store = DocumentVectorStore.load(index_path, chunks)
                    DOCUMENTS[doc_id] = {
                        "store": store,
                        "sample": info.get("sample", ""),
                        "filename": info.get("filename", "document.pdf"),
                        "chunks": chunks,
                    }
                except Exception as err:
                    print(f"[Storage] Failed to load index for {doc_id}: {err}")
        print(f"[Storage] Successfully restored {len(DOCUMENTS)} document(s) from disk.")
    except Exception as e:
        print(f"[Storage] Error restoring documents: {e}")


# Load any previously saved documents upon startup
_load_stored_documents()


@app.route("/api/upload", methods=["POST"])
def upload_document():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    filename = secure_filename(file.filename)
    doc_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_FOLDER, f"{doc_id}_{filename}")
    file.save(save_path)

    try:
        chunks = process_pdf(save_path)
        if not chunks:
            return jsonify({"error": "Could not extract any text from this PDF"}), 422

        store = DocumentVectorStore(chunks)
        index_file = os.path.join(STORAGE_FOLDER, f"{doc_id}.faiss")
        store.save(index_file)

        DOCUMENTS[doc_id] = {
            "store": store,
            "sample": " ".join(chunks[:6]),  # first ~5-6 chunks as a representative sample
            "filename": filename,
            "chunks": chunks,
        }
        _save_meta()

        return jsonify({
            "document_id": doc_id,
            "filename": filename,
            "num_chunks": len(chunks),
        })
    finally:
        if os.path.exists(save_path):
            os.remove(save_path)


def _get_document_or_404(doc_id):
    doc = DOCUMENTS.get(doc_id)
    if doc is None:
        return None
    return doc


@app.route("/api/ask", methods=["POST"])
def ask_question():
    data = request.get_json(force=True)
    doc_id = data.get("document_id")
    question = data.get("question", "").strip()

    doc = _get_document_or_404(doc_id)
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    if not question:
        return jsonify({"error": "Question is required"}), 400

    relevant_chunks = doc["store"].search(question, top_k=4)
    answer = llm_engine.answer_question(question, relevant_chunks)
    return jsonify({"answer": answer, "sources_used": len(relevant_chunks)})


@app.route("/api/summarize", methods=["POST"])
def summarize():
    doc = _get_document_or_404(request.get_json(force=True).get("document_id"))
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"summary": llm_engine.summarize_document(doc["sample"])})


@app.route("/api/keywords", methods=["POST"])
def keywords():
    doc = _get_document_or_404(request.get_json(force=True).get("document_id"))
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"keywords": llm_engine.extract_keywords(doc["sample"])})


@app.route("/api/citations", methods=["POST"])
def citations():
    doc = _get_document_or_404(request.get_json(force=True).get("document_id"))
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"citations": llm_engine.analyze_citations(doc["sample"])})


@app.route("/api/research-gaps", methods=["POST"])
def research_gaps():
    doc = _get_document_or_404(request.get_json(force=True).get("document_id"))
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"research_gaps": llm_engine.identify_research_gaps(doc["sample"])})


@app.route("/api/future-work", methods=["POST"])
def future_work():
    doc = _get_document_or_404(request.get_json(force=True).get("document_id"))
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"future_work": llm_engine.suggest_future_work(doc["sample"])})


@app.route("/api/flashcards", methods=["POST"])
def flashcards():
    doc = _get_document_or_404(request.get_json(force=True).get("document_id"))
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"flashcards": llm_engine.generate_flashcards(doc["sample"])})


@app.route("/api/glossary", methods=["POST"])
def glossary():
    doc = _get_document_or_404(request.get_json(force=True).get("document_id"))
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"glossary": llm_engine.generate_glossary(doc["sample"])})


@app.route("/api/title", methods=["POST"])
def title():
    doc = _get_document_or_404(request.get_json(force=True).get("document_id"))
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    return jsonify({"title": llm_engine.extract_title(doc["sample"])})


@app.route("/api/similar-papers", methods=["POST"])
def similar_papers():
    doc = _get_document_or_404(request.get_json(force=True).get("document_id"))
    if doc is None:
        return jsonify({"error": "Document not found. Upload a PDF first."}), 404
    # First extract the title, then search for similar papers
    paper_title = llm_engine.extract_title(doc["sample"])
    results = search_related_papers(paper_title, limit=5)
    return jsonify({"similar_papers": results, "query_title": paper_title})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
