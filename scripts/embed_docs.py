"""
Bulk embed career documents into ChromaDB.

Usage:
    python scripts/embed_docs.py --files ../data/career_docs_starter.json ../data/career_docs_expanded.json
    python scripts/embed_docs.py --dir ../data/docs/       # all .json files in directory
    python scripts/embed_docs.py --files docs.json --reset  # wipe collection first

Run from the rag-service/ directory.
"""

import sys
import os
import json
import argparse
import time

# Add parent dir to path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.embedder import add_documents, get_collection, get_doc_count, get_chroma_client
from config import get_settings

settings = get_settings()


def load_docs_from_file(filepath: str) -> list[dict]:
    """Load career documents from a JSON file (expects a JSON array)."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        return data
    elif isinstance(data, dict) and "documents" in data:
        return data["documents"]
    else:
        print(f"WARNING: Unexpected format in {filepath}, skipping.")
        return []


def load_docs_from_dir(dirpath: str) -> list[dict]:
    """Load all .json files from a directory."""
    all_docs = []
    for filename in sorted(os.listdir(dirpath)):
        if filename.endswith(".json"):
            filepath = os.path.join(dirpath, filename)
            docs = load_docs_from_file(filepath)
            print(f"  Loaded {len(docs)} docs from {filename}")
            all_docs.extend(docs)
    return all_docs


def validate_doc(doc: dict, index: int) -> bool:
    """Validate a single document has the required fields."""
    required = ["doc_id", "text", "metadata"]
    for field in required:
        if field not in doc:
            print(f"  ERROR: Document at index {index} missing '{field}', skipping.")
            return False

    meta = doc["metadata"]
    meta_required = ["source", "domain", "doc_type"]
    for field in meta_required:
        if field not in meta:
            print(f"  ERROR: Document '{doc['doc_id']}' metadata missing '{field}', skipping.")
            return False

    if len(doc["text"].strip()) < 20:
        print(f"  WARNING: Document '{doc['doc_id']}' has very short text ({len(doc['text'])} chars).")

    return True


def main():
    parser = argparse.ArgumentParser(description="Embed career docs into ChromaDB")
    parser.add_argument("--files", nargs="+", help="JSON file paths to load")
    parser.add_argument("--dir", help="Directory containing JSON files")
    parser.add_argument("--reset", action="store_true", help="Wipe collection before embedding")
    args = parser.parse_args()

    if not args.files and not args.dir:
        parser.error("Provide --files or --dir")

    # Load documents
    all_docs = []
    if args.files:
        for filepath in args.files:
            if not os.path.exists(filepath):
                print(f"File not found: {filepath}")
                continue
            docs = load_docs_from_file(filepath)
            print(f"Loaded {len(docs)} docs from {os.path.basename(filepath)}")
            all_docs.extend(docs)

    if args.dir:
        if not os.path.isdir(args.dir):
            print(f"Directory not found: {args.dir}")
            sys.exit(1)
        all_docs.extend(load_docs_from_dir(args.dir))

    print(f"\nTotal documents loaded: {len(all_docs)}")

    # Validate
    valid_docs = []
    for i, doc in enumerate(all_docs):
        if validate_doc(doc, i):
            valid_docs.append(doc)

    print(f"Valid documents: {len(valid_docs)}")
    if not valid_docs:
        print("No valid documents to embed. Exiting.")
        sys.exit(1)

    # Reset collection if requested
    if args.reset:
        print("\nResetting collection...")
        client = get_chroma_client()
        try:
            client.delete_collection(settings.chroma_collection_name)
            print("Collection deleted.")
        except Exception:
            print("Collection didn't exist, nothing to delete.")
        # Force re-creation
        from rag import embedder
        embedder._collection = None

    # Print domain distribution
    domains = {}
    doc_types = {}
    for doc in valid_docs:
        d = doc["metadata"]["domain"]
        t = doc["metadata"]["doc_type"]
        domains[d] = domains.get(d, 0) + 1
        doc_types[t] = doc_types.get(t, 0) + 1

    print(f"\nDomain distribution:")
    for domain, count in sorted(domains.items(), key=lambda x: -x[1]):
        print(f"  {domain}: {count}")

    print(f"\nDoc type distribution:")
    for dtype, count in sorted(doc_types.items(), key=lambda x: -x[1]):
        print(f"  {dtype}: {count}")

    # Embed
    print(f"\nStarting embedding into collection '{settings.chroma_collection_name}'...")
    start_time = time.time()

    doc_ids = [d["doc_id"] for d in valid_docs]
    texts = [d["text"] for d in valid_docs]
    metadatas = [d["metadata"] for d in valid_docs]

    added = add_documents(doc_ids, texts, metadatas)

    elapsed = time.time() - start_time
    print(f"\nDone! Added {added} new documents in {elapsed:.1f}s")
    print(f"Collection total: {get_doc_count()}")


if __name__ == "__main__":
    main()
