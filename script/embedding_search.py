from flask import Flask, request, jsonify
import sys
sys.path.append("/home/ubuntu/.local/lib/python3.8/site-packages/")
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
import os
import random
import PyPDF2
import openai
from dotenv import load_dotenv
import re
import time
from multiprocessing import Pool


engine = None
app = Flask(__name__)
load_dotenv()

CACHE_DIR = '.cache'
num_processes = 8 

openai.api_key = os.getenv('OPENAI_KEY')

# This will download and load a pre-trained model from Hugging Face's model hub
class EmbeddingSearchEngine:
    model = SentenceTransformer('all-MiniLM-L6-v2')
    # chunks of texts
    chunks = None
    # Embeddings for each article chunk
    embeddings = None
    index = None
    isEmpty = True
    chunk_size = 0

    def __init__(self, chunks=[], chunk_size=0):
        if len(chunks) == 0:
            self.isEmpty = False
            return
        self.chunks = chunks
        self.embeddings = np.array(self.model.encode(chunks))
        # Build a FAISS index
        self.index = faiss.IndexFlatL2(self.embeddings.shape[1])
        self.index.add(self.embeddings)
        self.isEmpty = False
        print('index engine init', self.model)
        print("index engine init", self.index)
    
    def answer(self, question, k=10):
        # k: top few chunks
        # Generate an embedding for the question
        question_embedding = self.model.encode([question])[0]
        # Find the most similar article chunk
        D, I = self.index.search(np.array([question_embedding]), k)
        #print("Most similar article chunk to the question is:", self.chunks[I[0][0]])
        return [self.chunks[i] for i in I[0]]

    def _extract_text_from_pdf(self, file_path):
        pdf_file = open(file_path, 'rb')
        reader = PyPDF2.PdfReader(pdf_file)
    
        text = ""
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            text += page.extract_text()
        
        pdf_file.close()
        return text

    def _split_text_into_chunks(self, text, chunk_size, overlap_size):
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            if end > len(text):
                end = len(text)
            chunk = text[start:end]
            chunks.append(chunk)
            start += chunk_size - overlap_size
    
        return chunks

    # parse pdf
    def parse(self, file_path, chunk_size, overlap_size):
        extracted_text = self._extract_text_from_pdf(file_path)
        chunks = self._split_text_into_chunks(extracted_text, chunk_size, overlap_size)
    
        for i in range(len(chunks)):
            #print(chunk)
            #print("---")
            chunks[i] = chunks[i]
        return chunks


class Temperature:
    temperature = 0

    def __init__(self, temperature=0):
        self.temperature = temperature

    def select_random_result(self, candidates, top_k=2):
        ## Example usage
        # candidates = ["result1", "result2", "result3", "result4", "result5", "result6", "result7", "result8"]
        # top_k = 5
        # temperature = 0.8
        # selected_results = select_random_results(candidates, top_k, temperature)
        # print("Selected Results:", selected_results)
        scores = list(range(len(candidates), 0, -1))
        probabilities = self._softmax(scores)
        selected_indices = self._weighted_random_choice(range(len(candidates)), probabilities, top_k)
        selected_results = [candidates[i] for i in selected_indices]
        return selected_results
    
    def _softmax(self, logits):
        exp_logits = [exp / self.temperature for exp in logits]
        sum_exp_logits = sum(exp_logits)
        probabilities = [exp_logit / sum_exp_logits for exp_logit in exp_logits]
        return probabilities
    
    def _weighted_random_choice(self, choices, probabilities, num_samples):
        weighted_choices = list(zip(choices, probabilities))
        cumulative_probabilities = [sum(probabilities[:i+1]) for i in range(len(probabilities))]
        selected_indices = []
        for _ in range(num_samples):
            random_value = random.random()
            for choice, cumulative_prob in zip(weighted_choices, cumulative_probabilities):
                if random_value < cumulative_prob:
                    selected_indices.append(choice[0])
                    break
        return selected_indices   
    

def sanitize_text(text):
    # Strip \n, \t, and non-ASCII characters
    sanitized_text = re.sub(r'[\n\t]', ' ', text)
    sanitized_text = ''.join(character for character in sanitized_text if ord(character) < 128)
    return sanitized_text



def summarize_text(text, max_retry=10, retry_delay=10):
    text = sanitize_text(text)
    
    for _ in range(max_retry):
        try:
            # Using the ChatCompletion endpoint of the OpenAI API to get a summary
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo-1106",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant. You summarize academic article chunks professionally, accurately"},
                    {"role": "user", "content": "Summarize the following text, note down important evidences: "+text}
                ],
                max_tokens=500
            )            
            return response.choices[0].message.content.strip()
            #return response["choices"][0]['message']['content'].strip()        
        except Exception as e:
            print(f"API Error: {e}")
            print("Retrying...")
            time.sleep(retry_delay)
    
    return None  # Return None if max_retry attempts fail


def parallel_summarize(args):
    unique_id, chunk = args
    summary = summarize_text(chunk)
    return (unique_id, summary)

def get_all_cached_summaries():
    """Retrieve all summaries from the cache directory."""
    summaries = []
    for cache_file in os.listdir(CACHE_DIR):
        if cache_file.endswith('.txt'):
            with open(os.path.join(CACHE_DIR, cache_file), 'r') as f:
                summaries.append(f.read().strip())
    return summaries

def load_cache():
    """Load summaries from the cache directory."""
    summaries = {}
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
    else:
        for cache_file in os.listdir(CACHE_DIR):
            if cache_file.endswith('.cache'):
                with open(os.path.join(CACHE_DIR, cache_file), 'r') as f:
                    filename, chunk_idx = cache_file.rsplit('.', 1)[0].rsplit('_', 1)
                    summary = f.read().strip()
                    if filename not in summaries:
                        summaries[filename] = {}
                    summaries[filename][int(chunk_idx)] = summary
    return summaries

def save_summary_to_cache(chunk_idx, summary):
    """Save a summary to a cache file."""
    with open(os.path.join(CACHE_DIR, f"{chunk_idx}.cache"), 'w') as f:
        f.write(chunk_idx+"\n"+summary)

def is_cached(filename, num_chunks):
    """Check if all chunks of a file are present in the cache."""
    print("check", filename, num_chunks)
    for idx in range(num_chunks):
        chunk_id = f"{filename}_{idx}"
        print("check", os.path.join(CACHE_DIR, f"{chunk_id}.txt"))
        if not os.path.exists(os.path.join(CACHE_DIR, f"{chunk_id}.txt")):
            print(filename, "is not cached")
            return False
    print(filename, "is cached")
    return True

@app.route('/init_summary', methods=['GET'])
def init_summary():
    print('embedding engine init, load file summaries as chunks')
    data = request.get_json()
    all_files = data.get('file_path') #"../storage/data1.pdf" 
    chunk_size = data.get('chunk_size') #8000
    overlap_size = 200

    global engine
    engine = EmbeddingSearchEngine()
    chunks = []

    # Iterate over all files in the specified directory
    for filename in os.listdir(all_files):
        file_path = os.path.join(all_files, filename)
        if os.path.isfile(file_path): # Only process if it's a file
            new_chunks = engine.parse(file_path, chunk_size, overlap_size)
            is_cached_bool = is_cached(filename, len(new_chunks))
            if not is_cached_bool:
                idx = 0
                for chunk in new_chunks:
                    unique_id = f"{filename}_{idx}"
                    chunks.append((unique_id, chunk))
                    idx += 1


    with Pool(processes=num_processes) as pool:
        # Use imap_unordered to get results as soon as they are ready
        # This will not guarantee order, but we get results faster
        for (unique_id, summary) in pool.imap_unordered(parallel_summarize, chunks):
            # Store the summary in some data structure using unique_id
            # For simplicity, here we just print it
            save_summary_to_cache(unique_id, summary)
            print(unique_id, "Done")


    # Get all summaries from cache (both old and new)
    all_summaries = get_all_cached_summaries()
    engine = EmbeddingSearchEngine(chunks=all_summaries, chunk_size=chunk_size)
    return jsonify({'message': 'Initialization successful'})


@app.route('/init', methods=['POST'])
def init():
    print('embedding engine init')
    data = request.get_json()
    all_files = data.get('file_path') #"../storage/data1.pdf" 
    chunk_size = data.get('chunk_size') #500
    overlap_size = 50
    #chunks_str = data.get('chunks_str')
    #chunks = chunks_str.split('\n')
    #e.g., chunks = ['abc', 'def']
    global engine
    engine = EmbeddingSearchEngine()
    chunks = []
    # Iterate over all files in the specified directory
    for filename in os.listdir(all_files):
        file_path = os.path.join(all_files, filename)
        if os.path.isfile(file_path): # Only process if it's a file
            print(file_path)
            chunks += engine.parse(file_path, chunk_size, overlap_size)
    engine = EmbeddingSearchEngine(chunks=chunks, chunk_size=chunk_size)
    return jsonify({'message': 'Initialization successful'})


@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()
    question = data.get('question')
    temperature = float(data.get('temperature'))
    global engine
    answers = engine.answer(question)
    # use top 5 with temperature
    spice_temp = Temperature(temperature)
    answer = spice_temp.select_random_result(candidates=answers, top_k=10)

    return jsonify({'context': answer})

@app.route('/compare', methods= ['POST'])
def compare():
    data = request.get_json()
    question = data.get('question')
    answer1 = data.get('answer1')
    answer2 = data.get('answer2')
    engine = EmbeddingSearchEngine([answer1, answer2])
    close = engine.answer(question)
    return jsonify({'context': close})
  
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
