import os
from typing import List

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

DOCS_DIR = "data/docs"
CHROMA_DIR = "data/chroma"

_splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=150)

def _load_docs() -> List[Document]:
    docs: List[Document] = []
    if not os.path.isdir(DOCS_DIR):
        return docs
    for name in os.listdir(DOCS_DIR):
        path = os.path.join(DOCS_DIR, name)
        lower = name.lower()
        if lower.endswith(".txt"):
            docs.extend(TextLoader(path, encoding="utf-8").load())
        elif lower.endswith(".pdf"):
            docs.extend(PyPDFLoader(path).load())
    return docs
def build_or_load_vectorstore() -> Chroma:
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    if os.path.isdir(CHROMA_DIR) and os.listdir(CHROMA_DIR):
        return Chroma(persist_directory=CHROMA_DIR, embedding_function=embeddings)

    raw_docs = _load_docs()
    chunks = _splitter.split_documents(raw_docs) if raw_docs else []
    vs = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_DIR,
    )
    return vs