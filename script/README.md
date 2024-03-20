
## Steps

1. pip install -r requirements.txt
2. `python3 embedding_search.py`
3. Use postman or curl, send request such as
```
curl --location --request GET '127.0.0.1:8002/init_summary' \
--header 'Content-Type: application/json' \
--data '{
    "file_path": "toptop-clone/storage/articles",
    "chunk_size": 7000
}'
```
4. Change `.env` file under project root, e.g., 
```
EMBEDDING_SERVER_URL=http://localhost:8000
REPORT_SERVER_URL=http://localhost:8001
```
5. Edit `keyword_extraction.py` to change the source dir and `max_keywords_per_file`
Generate keywords for the knowledge by
```
python3 keyword_extraction.py
```


#### Note: If chunk size is different, the program treats the chunks as different chunks and caching from previous runs will not be initiated
#### Use step 2, 3 for report server as well under ./report
