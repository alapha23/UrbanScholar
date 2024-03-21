import sys
import json
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')

def get_top_matches(user_sentence, keywords, top_n=5):
    user_embedding = model.encode(user_sentence, convert_to_tensor=True)
    keyword_embeddings = model.encode(keywords, convert_to_tensor=True)
    cos_scores = util.pytorch_cos_sim(user_embedding, keyword_embeddings)[0]
    top_results = cos_scores.topk(k=top_n)

    matched_keywords = [keywords[index] for index in top_results.indices]
    return matched_keywords

if __name__ == "__main__":
    user_sentence = sys.argv[1]
    filePath = sys.argv[2]
    keywords = json.load(open(filePath))
    matches = get_top_matches(user_sentence, keywords)
    print(json.dumps(matches))

