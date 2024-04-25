import mysql.connector
from dotenv import load_dotenv
import os
from openai import OpenAI

# Load environment variables from .env file
dotenv_path = os.path.join(os.getcwd(), '../../.env')
load_dotenv(dotenv_path)

# Retrieve credentials and connection details
database_url = os.getenv("DATABASE_URL")
openai_key = os.getenv("OPENAI_KEY")

# Parse the database URL for connection parameters
username = database_url.split('//')[1].split(':')[0]
password = database_url.split(':')[2].split('@')[0]
host = database_url.split('@')[1].split('/')[0]
database_name = database_url.split('/')[-1]

# Connect to the MySQL database
cnx = mysql.connector.connect(
    user=username,
    password=password,
    host=host,
    database=database_name
)
cursor = cnx.cursor()

# Define the SQL query
query = "SELECT content FROM Chat WHERE updatedAt >= NOW() - INTERVAL 1 MONTH;"

# Execute the query
cursor.execute(query)
result = cursor.fetchall()

# Concatenate and reformat the information into a string
data_string = "\n".join([", ".join(map(str, row)) for row in result])

# Truncate the data_string to fit within the API's limit if it's too long
max_length = 120000 * 4  # 
if len(data_string) > max_length:
    data_string = data_string[:max_length]

# Close the database connection
cursor.close()
cnx.close()

# Use the OpenAI API to summarize the concatenated string
client = OpenAI(api_key=openai_key)

completion = client.chat.completions.create(
  model="gpt-4-turbo-preview",
  messages=[
    {"role": "system", "content": "You provide answer in concise, accurate, professional language and quote given information."},
    {"role": "user", "content": f"You are given the conversations in a QA platform in the past one month. You are supposed to provide key points that has been mentioned in the past month, including hot topics, frequently mentioned concepts, and commonly asked questions. Summarize this information: {data_string}"},
  ],
  max_tokens=500
)

print(completion.choices[0].message.content)
