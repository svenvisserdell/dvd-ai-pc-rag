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

import os
import requests
import shutil
import sys
import threading
import time

from queue import Queue
from tqdm import tqdm
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

from langchain_chroma import Chroma
from langchain_community.document_loaders import MWDumpLoader
from langchain_community.vectorstores.utils import filter_complex_metadata
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

embeddings_model = "nomic-embed-text"
hf_embeddings_model = "nomic-ai/nomic-embed-text-v1.5"

start = time.time()

threads = []

vectorstore = None

class VectorstoreMonitor:
    def __init__(self, vectorstore, update_rate=1):
        super().__init__()
        self.vectorstore = vectorstore
        self.total = len(vectorstore.get()['documents'])
        self.update_rate = update_rate
        self.has_updated = False
    
    def add_document_count(self, documents: int):
        self.total += documents
        self.has_updated = True
    
    def monitor_vectorstore_ingestion_progress(self):
        processed = 0
        with tqdm(total=self.total, file=sys.stdout) as pbar:
            pbar.set_description(f"Ingesting documents")
            # while processed < self.total or self.total == 0 or not self.has_updated:
            while True:
                time.sleep(self.update_rate)
                try:
                    processed = len(vectorstore.get()['documents'])
                    if self.total > 0:
                        if self.total != pbar.total:
                            pbar.total = self.total
                        # print(f"Processed {processed}/{self.total} documents", end='\r', flush=True)
                        pbar.update(processed - pbar.n)
                except Exception as e:
                    print(f"Problem getting document count {e}")

def get_chroma_path(source):
    if source is None:
        return f"./vectorstores/chroma_langchain_db"
    return f"./vectorstores/chroma_langchain_db-{source.encode('ascii', 'ignore').decode('ascii').replace(' ', '_').replace('(', '').replace(')', '')}"

# Following MediaWiki API:Etiquette https://www.mediawiki.org/wiki/API:Etiquette
def get_wiki_request_headers():
    return {
        "User-Agent": "dvd-ai-pc-rag/1.0 (https://github.com/dell/dvd-ai-pc-rag)"
    }

def get_wiki_page_links(title, pllcontinue=None):
    url = "https://en.wikipedia.org/w/api.php"

    params = {
        "action": "query",
        "format": "json",
        "prop": "links",
        "titles": title,
        "pllimit": "max"
    }

    if pllcontinue is not None:
        params["plcontinue"] = pllcontinue

    response = requests.get(url, params=params, headers=get_wiki_request_headers())

    print(f"Fetching {title}...")

    data = response.json()

    return data

def search_wiki_page(title):
    url = "https://en.wikipedia.org/w/api.php"
        
    params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srsearch": title,
    }

    response = requests.get(url, params=params, headers=get_wiki_request_headers())

    print(f"Searching for {title}...")

    data = response.json()

    return data

def add_documents_to_vectorstore(vectorstore, queue):
    # loop = asyncio.new_event_loop()
    # asyncio.set_event_loop(loop)
    futures = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        while True:
            documents = queue.get()
            if documents is not None:
                for document in documents:
                    document.metadata["source"] = document.metadata["source"].encode('ascii', 'ignore').decode('ascii')
                filtered_documents = filter_complex_metadata(documents)
                print(f"Adding {len(filtered_documents)} documents to vectorstore")
                # loop over filtered documents 10 at a time
                document_chunk_size = 20
                for i in range(0, len(filtered_documents), document_chunk_size):
                    chunk = filtered_documents[i:i+document_chunk_size]
                    futures.append(executor.submit(vectorstore.add_documents, chunk))
            else:
                for future in as_completed(futures):
                    try:
                        future.result()
                    except Exception as e:
                        # print(f"Failed to add docs to vectorstore: {e}\n{doc['metadata']['source'] for doc in chunk}")
                        print(f"Failed to add docs to vectorstore: {e}")
                break


# if called as main
if __name__ == "__main__":

    source_title = "2024 World Series" if len(sys.argv) < 2 else sys.argv[1]

    if len(sys.argv) < 4 or sys.argv[3] != sys.argv[2]:

        data = get_wiki_page_links(source_title)

        print(f"Response: {data}")

        if 'missing' in list(data["query"]["pages"].values())[0]:
            print(f"Wasn't able to find page for {source_title}, initiating search")
            data = search_wiki_page(source_title)
            source_title = data['query']['search'][0]['title']
            print(f"Updated source title to {source_title}")
            data = get_wiki_page_links(source_title)
        
        if list(data["query"]["pages"].values())[0]['links'][0]['title'].lower() == source_title.lower() or any([link['title'] == 'Wikipedia:Redirect' for link in list(data["query"]["pages"].values())[0]['links']]):
            # Following redirect to actual page
            source_title = list(data["query"]["pages"].values())[0]['links'][0]['title']
            print(f"Updated source title to {source_title}")
            data = get_wiki_page_links(source_title)

        links = [x["title"] for x in list(data["query"]["pages"].values())[0]["links"]]

        # continue fetching while there are links to fetch
        while "batchcomplete" not in data:
            data = get_wiki_page_links(source_title, data["continue"]["plcontinue"])

            links.extend([x["title"] for x in list(data["query"]["pages"].values())[0]["links"]])

        docs = []

        links.insert(0, source_title)

        print("Found " + str(len(links)) + " links")

        filtered_docs = filter_complex_metadata(docs)

        sources_directory = f"./sources/{source_title.encode('ascii', 'ignore').decode('ascii').replace(' ', '_')}"
        if not os.path.exists(sources_directory):
            os.makedirs(sources_directory)

        chroma_path = get_chroma_path(source_title)

        if os.path.exists(chroma_path):
            shutil.rmtree(chroma_path)
        
        os.makedirs(chroma_path)

        vectorstore = Chroma(
            embedding_function=HuggingFaceEmbeddings(
                model_name=hf_embeddings_model,
                model_kwargs={ 'trust_remote_code': True }
            ),
            persist_directory=chroma_path,
            collection_metadata={"hnsw:space": "cosine"},
        )
        
        doc_count = len(vectorstore.get()['documents'])

        limit = 100
        offset = 1 if len(sys.argv) < 3 else int(sys.argv[2])
        last = len(links) if len(sys.argv) < 4 else int(sys.argv[3])

        queue = Queue()

        thread = threading.Thread(target=add_documents_to_vectorstore, args=(vectorstore, queue), daemon=True)
        thread.start()
        threads.append(thread)

        monitor = VectorstoreMonitor(vectorstore, update_rate=0.5)
        thread = threading.Thread(target=monitor.monitor_vectorstore_ingestion_progress, daemon=True)
        thread.start()

        while offset < len(links):

            print(f"Fetching batch {str(offset)} of {str(len(links))} [{limit}]")

            url = "https://en.wikipedia.org/w/index.php?title=Special:Export"

            data = {
                "pages": '\n'.join(links[offset-1:offset+limit-1]),
                "offset": "1",
                "action": "submit",
                "curonly": "1"
            }

            headers = {
                "Accept-Encoding": "gzip,deflate"
            }

            response = requests.post(url, data=data, headers=headers, stream=True)

            with open(f"{sources_directory}/batch_results_{offset}.xml", "wb") as file:
                for chunk in response.iter_content(chunk_size=1024):
                    file.write(chunk)

            loader = MWDumpLoader(
                file_path=f"{sources_directory}/batch_results_{offset}.xml",
                encoding="utf8",
                skip_redirects=True,  # will skip over pages that just redirect to other pages (or not if False)
                stop_on_error=False,  # will skip over pages that cause parsing errors (or not if False)
            )
            documents = loader.load()

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000, chunk_overlap=100
            )
            texts = text_splitter.split_documents(documents)

            docs += texts

            doc_count += len(texts)

            monitor.add_document_count(len(texts))

            queue.put(texts)

            print(f"Queued {len(texts)} document(s) for vector database ingestion")

            offset += limit

        queue.put(None)

    # load vectorstore if it exists
    if vectorstore is None and os.path.exists(get_chroma_path(source_title)):
        vectorstore = Chroma(
            embedding_function=HuggingFaceEmbeddings(
                model_name=hf_embeddings_model,
                model_kwargs={ 'trust_remote_code': True }
            ),
            persist_directory=get_chroma_path(source_title),
            collection_metadata={"hnsw:space": "cosine"},
        )
    elif vectorstore is None:
        print("No vectorstore found, check argumments and try ingestion again")
        exit(1)

    print("Waiting for threads to finish...")
    for thread in threads:
        thread.join()

    print(f"Prepared vectorstore in {time.time() - start:.2f} seconds with {len(vectorstore.get()['documents'])} documents")