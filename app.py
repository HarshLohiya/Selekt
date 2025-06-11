from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
import sqlite3
import json
from datetime import datetime
from load_schema import get_tables_info, get_table_columns, get_table_constraints, get_table_indexes
from call_llm import LLM
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
import io
import sys
import boto3
from fastapi.openapi.utils import get_openapi

# Load environment variables
load_dotenv()

# AWS Bedrock client setup
bedrock = boto3.client(
    service_name='bedrock-runtime',
    region_name='ap-south-1',  # Hardcode the region since it's not in .env
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    aws_session_token=os.getenv('AWS_SESSION_TOKEN')
)

app = FastAPI(title="DataDynamics API")

# Database setup
def init_db():
    conn = sqlite3.connect('context.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Database connection function
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            user=os.getenv('DB_USER', 'dg_user'),
            password=os.getenv('DB_PASSWORD', 'random_dg_pass'),
            database=os.getenv('DB_NAME', 'dg_local')
        )
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

# LLM instance
llm = None

class Message(BaseModel):
    session_id: str
    message: str
    role: Optional[str] = "dba"
    table_names: Optional[List[str]] = []

class Response(BaseModel):
    response: str
    session_id: str
    timestamp: datetime

class SchemaResponse(BaseModel):
    tables: List[Dict]
    message: str

def capture_llm_output(func):
    """Decorator to capture LLM output"""
    def wrapper(*args, **kwargs):
        # Create a string buffer to capture the output
        output_buffer = io.StringIO()
        # Save the current stdout
        old_stdout = sys.stdout
        # Redirect stdout to our buffer
        sys.stdout = output_buffer
        
        try:
            # Call the original function
            func(*args, **kwargs)
            # Get the captured output
            output = output_buffer.getvalue()
        finally:
            # Restore stdout
            sys.stdout = old_stdout
            # Close the buffer
            output_buffer.close()
        
        return output
    return wrapper

@app.post("/chat", response_model=Response)
async def chat(message: Message):
    global llm
    try:
        # Check if database schema file exists
        schema_file = os.getenv('DB_SCHEMA_FILE', 'data_db')
        if not os.path.exists(f"{schema_file}.sql"):
            raise HTTPException(
                status_code=404,
                detail=f"Database schema file {schema_file}.sql not found"
            )

        if llm is None:
            model_id = os.getenv('LLM_MODEL', 'anthropic.claude-sonnet-4-20250514-v1:0')
            print(f"Using model ID: {model_id}")  # Debug print
            llm = LLM(
                model=model_id,
                role=message.role,
                database_schema=schema_file
            )
        # Always re-initialize context to ensure schema is read from file
        llm.initialise_base_context(role=message.role, table_names=message.table_names)

        # Prepare the chat request for Bedrock (Claude Sonnet 4) with context as top-level system field
        bedrock_request = {
            "modelId": "arn:aws:bedrock:ap-south-1:455314823232:inference-profile/apac.anthropic.claude-sonnet-4-20250514-v1:0",
            "contentType": "application/json",
            "accept": "application/json",
            "body": json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "system": llm.context,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": message.message
                            }
                        ]
                    }
                ]
            })
        }
        
        # Log the request
        print(f"Request: {json.dumps(bedrock_request, indent=2)}")
        
        # Make the request to Bedrock
        response = bedrock.invoke_model(**bedrock_request)
        response_body = json.loads(response['body'].read())
        llm_response = response_body['content'][0]['text']
        
        # Log the response
        print(f"Response: {json.dumps(response_body, indent=2)}")
        
        # Store in database
        conn = sqlite3.connect('context.db')
        c = conn.cursor()
        
        # Store conversation
        c.execute(
            "INSERT INTO conversations (session_id, message, response) VALUES (?, ?, ?)",
            (message.session_id, message.message, llm_response)
        )
        conn.commit()
        conn.close()
        
        return Response(
            response=llm_response,
            session_id=message.session_id,
            timestamp=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/schema", response_model=SchemaResponse)
async def get_schema():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all tables
        tables = get_tables_info(cursor)
        
        # Get detailed information for each table
        schema_info = []
        for table in tables:
            schema_name = table['schemaname']
            table_name = table['tablename']
            
            # Get columns
            columns = get_table_columns(cursor, schema_name, table_name)
            
            # Get constraints
            constraints = get_table_constraints(cursor, schema_name, table_name)
            
            # Get indexes
            indexes = get_table_indexes(cursor, schema_name, table_name)
            
            schema_info.append({
                "schema": schema_name,
                "table": table_name,
                "columns": columns,
                "constraints": constraints,
                "indexes": indexes
            })
        
        cursor.close()
        conn.close()
        
        return SchemaResponse(
            tables=schema_info,
            message="Schema information retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history/{session_id}")
async def get_history(session_id: str):
    try:
        conn = sqlite3.connect('context.db')
        c = conn.cursor()
        c.execute(
            "SELECT message, response, timestamp FROM conversations WHERE session_id = ? ORDER BY timestamp",
            (session_id,)
        )
        history = c.fetchall()
        conn.close()
        
        return [
            {
                "message": msg,
                "response": resp,
                "timestamp": ts
            }
            for msg, resp, ts in history
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/docs", include_in_schema=False)
async def get_openapi_endpoint():
    return get_openapi(title="DataDynamics API", version="1.0.0", routes=app.routes)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008) 