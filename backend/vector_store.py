"""
vector_store.py
----------------
Handles embedding generation (semantic vectors) and storage/retrieval
using FAISS, an in-memory vector database.
"""

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

_model = None


def get_embedding_model():
    """Lazy-load the sentence embedding model (loaded once, reused after)."""
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


class DocumentVectorStore:
    """
    One instance per uploaded document. Stores its chunks, their embeddings,
    and a FAISS index for fast similarity search.
    """

    def __init__(self, chunks: list[str], index=None):
        self.chunks = chunks
        if index is not None:
            self.index = index
            self.dimension = index.d
        else:
            model = get_embedding_model()
            embeddings = model.encode(chunks, convert_to_numpy=True, normalize_embeddings=True)
            self.dimension = embeddings.shape[1]

            # Inner product on normalized vectors == cosine similarity
            self.index = faiss.IndexFlatIP(self.dimension)
            self.index.add(embeddings.astype(np.float32))

    def save(self, file_path: str):
        """Save FAISS index to disk."""
        faiss.write_index(self.index, file_path)

    @classmethod
    def load(cls, file_path: str, chunks: list[str]):
        """Load FAISS index from disk."""
        index = faiss.read_index(file_path)
        return cls(chunks, index=index)

    def search(self, query: str, top_k: int = 4) -> list[str]:
        """Return the top_k most relevant chunks for a given query."""
        model = get_embedding_model()
        query_vec = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
        scores, indices = self.index.search(query_vec.astype(np.float32), top_k)

        results = []
        for idx in indices[0]:
            if 0 <= idx < len(self.chunks):
                results.append(self.chunks[idx])
        return results
