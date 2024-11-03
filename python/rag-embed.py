#  Copyright © 2024 Dell Inc. or its subsidiaries. All Rights Reserved.

#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#       http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

import asyncio
import json
import os
import sys
import urllib.parse

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

embeddings_model = "nomic-embed-text"
hf_embeddings_model = "nomic-ai/nomic-embed-text-v1.5"

chain = None
vectorstore = None
llm = None
vectorstore_source = None

MAX_DOCUMENT_LENGTH = 1000 * 5 # ~Up to 1,000 words per document limit

def send_message(message):
    state = { 'status': 'ready'}
    # merge message dict to state dict
    state.update(message)
    print(urllib.parse.quote(json.dumps(state)))

def get_chroma_path(source):
    if source is None:
        return f"./vectorstores/chroma_langchain_db"
    return f"./vectorstores/chroma_langchain_db-{source.encode('ascii', 'ignore').decode('ascii').replace(' ', '_').replace('(', '').replace(')', '')}"

def load_vectorstore(source=None):
    # Load example document
    global chain, vectorstore, llm, vectorstore_source

    vectorstore_source = source if source is not None else "Default"

    if source is None:
        send_message({'status': 'error', 'message': f"No source provided"})
    chroma_path = get_chroma_path(source)

    if os.path.exists(chroma_path):
        send_message({'status': f"Loading vectorstore for {source}"})
        vectorstore = Chroma(
            embedding_function=HuggingFaceEmbeddings(
                model_name=hf_embeddings_model,
                model_kwargs={ 'trust_remote_code': True }
            ),
            persist_directory=chroma_path,
            collection_metadata={"hnsw:space": "cosine"},
        )
        send_message({'status': f"Loaded vectorstore for {source}"})
    else:
        send_message({'status': 'error', 'message': f"Could not find vectorstore for {source}"})
    
    return vectorstore


async def retrieve(prompt):
    global chain, vectorstore, llm

    if vectorstore is None:        
        return "Not yet loaded vectorstore"
    
    docs = vectorstore.similarity_search_with_relevance_scores(prompt, k=3)

    docset = [(doc, score) for doc, score in docs if score > 0.05]
    sources = [doc[0].metadata["source"] for doc in docset]
    
    if len(docset) == 0:
        rag_prompt = f"""Answer the following question:
        {prompt}"""
    else:
        rag_prompt = f"""Given the following information from documents retrieved from similarity to the prompt (ordered with the most relevant information first):
        {[doc[0].page_content[:MAX_DOCUMENT_LENGTH] for doc in docset]}
        Answer the following question:
        {prompt}"""

    return rag_prompt, sources

async def retrieve_embeddings():
    global vectorstore_source, vectorstore
    while True:
        query = input()
        q = urllib.parse.unquote(query)
        try:
            # parse q as json
            cmd = json.loads(q)
            if 'dataset' in cmd:
                load_vectorstore(cmd['dataset'])
                continue
        except:
            pass
        if q == "exit":
            break
        retrieval_result, sources = await retrieve(q)
        send_message({"retrieval": retrieval_result, "role": "assistant", "sources": sources, "vectorstore": vectorstore_source, "directory": vectorstore._persist_directory})

if __name__ == "__main__":
    try:
        loop = asyncio.new_event_loop()
        dataset = "2024 NBA Cup" if len(sys.argv) < 3 else sys.argv[2]
        if len(sys.argv) > 1 and sys.argv[1] == "embed":
            # load_vectorstore("2024 United States Grand Prix")
            load_vectorstore(dataset)
            loop.run_until_complete(retrieve_embeddings())
        
    except Exception as e:
        send_message({"status": "error", "message": str(e)})
        import traceback
        traceback.print_exc()
        raise e