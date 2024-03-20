import os
import json
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.tag import pos_tag
from nltk import download
from rake_nltk import Rake
import re

# Ensure necessary NLTK assets are downloaded
download('punkt')
download('stopwords')
download('averaged_perceptron_tagger')

def is_valid_keyword(keyword):
    """
    Check if the keyword is valid based on certain criteria.
    """
    # Filter out purely numeric keywords or those with a high ratio of numbers
    if re.search(r'\d', keyword) and len(keyword) < 5:
        return False
    
    # Tokenize the keyword into words and tag with POS tags
    words = word_tokenize(keyword)
    tagged_words = pos_tag(words)
    
    # Check for meaningful POS tags (NN: Noun, JJ: Adjective)
    if not any(tag.startswith(('NN', 'JJ')) for word, tag in tagged_words):
        return False
    
    return True

def extract_keywords(text, max_keywords=20):
    """
    Extract keywords from a given text using RAKE, limiting the number of keywords.
    """
    # Initialize RAKE
    r = Rake(
        stopwords=stopwords.words('english') + ['variable'],  # Example of adding custom stopwords
        min_length=2,  # Minimum length of keyword phrases
        max_length=4  # Maximum length of keyword phrases
    )
    r.extract_keywords_from_text(text)
    ranked_phrases = r.get_ranked_phrases()
    
    # Filter keywords based on custom criteria
    filtered_keywords = [phrase for phrase in ranked_phrases if is_valid_keyword(phrase)]
    
    return filtered_keywords[:max_keywords]

def process_files(source_dir, dest_file, max_keywords=20):
    """
    Process .cache files in the source directory to extract and filter keywords, then merge them into a single JSON file.
    """
    all_keywords = set()

    for filename in os.listdir(source_dir):
        if filename.endswith('.cache'):
            file_path = os.path.join(source_dir, filename)
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()
                keywords = extract_keywords(text, max_keywords=max_keywords)
                all_keywords.update(keywords)

    # Save all keywords to a single JSON file
    with open(dest_file, 'w', encoding='utf-8') as outfile:
        json.dump(list(all_keywords), outfile, indent=4)

    print("Processing complete. All keywords merged and saved in", dest_file)

# Example usage
source_directory = '.cache'
destination_file = 'keywords/keywords.json'
max_keywords_per_file = 3  # Adjust the number of keywords as needed
process_files(source_directory, destination_file, max_keywords=max_keywords_per_file)

