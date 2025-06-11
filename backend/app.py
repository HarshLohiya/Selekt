from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import sqlite3
from datetime import datetime
from .load_schema import get_tables_info, get_table_columns, get_table_constraints, get_table_indexes, get_schema as load_schema_get_schema
from .call_llm import LLM, llm_initialisation_factory
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import io
import sys
from dotenv import load_dotenv
from fastapi.openapi.utils import get_openapi
import logging
import logging.handlers
from pathlib import Path
import boto3

# Load environment variables
load_dotenv()

# AWS Bedrock client setup
bedrock = boto3.client(
    service_name='bedrock-runtime',
    region_name=os.getenv('AWS_REGION', 'ap-south-1'),  # Read region from .env
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    aws_session_token=os.getenv('AWS_SESSION_TOKEN')
)

# Configure logging
def setup_logging():
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.handlers.RotatingFileHandler(
                'logs/app.log',
                maxBytes=10485760,  # 10MB
                backupCount=5
            ),
            logging.StreamHandler()
        ]
    )
    
    # Create logger
    logger = logging.getLogger(__name__)
    return logger

logger = setup_logging()

app = FastAPI(title="DataDynamics API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AWS Bedrock client
def get_bedrock_client():
    try:
        # TODO: Replace with Llama client initialization
        # For Llama integration, we'll need to:
        # 1. Remove AWS credentials
        # 2. Add Llama model configuration
        # 3. Update the chat endpoint to use Llama instead of Bedrock
        bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name=os.getenv('AWS_REGION', 'ap-south-1'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            aws_session_token=os.getenv('AWS_SESSION_TOKEN')
        )
        return bedrock
    except Exception as e:
        logger.error(f"Failed to initialize Bedrock client: {str(e)}", exc_info=True)
        return None

# Pydantic models for request/response validation
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

class ChatRequest(BaseModel):
    session_id: str
    message: str
    role: str = "dba"  # Default role
    model: str = "bedrock"  # Default model
    table_names: Optional[List[str]] = []
    
class SessionInfo(BaseModel):
    session_id: str
    model: str
    last_updated: datetime

@app.on_event("startup")
def startup_event():
    logger.info("Initializing database connection...")
    try:
        # Test database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT version();')
        version = cursor.fetchone()[0]
        logger.info(f"Successfully connected to PostgreSQL. Version: {version}")
        cursor.close()
        conn.close()
    except Exception as e:
        logger.info(f"Warning: Failed to connect to database. Error: {str(e)}")
        raise e
    
    logger.info("Initializing LLMs on startup...")
    
    try:
        # Initialize Bedrock LLM
        app.state.llm_bedrock = llm_initialisation_factory(
            role="dba",
            llm_name="bedrock",
            database_name="dg_local"
        )
        app.state.llm_bedrock.initialise_schema()
        app.state.llm_bedrock.initialise_base_context()
        app.state.llm_bedrock.initialise_first_message()
        logger.info("Bedrock LLM initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Bedrock LLM: {str(e)}", exc_info=True)
        app.state.llm_bedrock = None
    
    try:
        # Initialize Llama3 LLM
        app.state.llm_llama3 = llm_initialisation_factory(
            role="dba",
            llm_name="llama3:latest",
            database_name="dg_local"
        )
        logger.info(f"llm_llama3 instance after init: {app.state.llm_llama3}")
        app.state.llm_llama3.initialise_schema()
        app.state.llm_llama3.initialise_base_context()
        app.state.llm_llama3.initialise_first_message()
        logger.info("Llama3 LLM initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Llama3 LLM: {str(e)}", exc_info=True)
        app.state.llm_llama3 = None

# Database setup
def init_db():
    try:
        # Initialize SQLite database for conversations
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
        
        c.execute('''
            CREATE TABLE IF NOT EXISTS llm_states (
                session_id TEXT,
                model TEXT,
                state TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (session_id, model)
            )
        ''')
        conn.commit()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}", exc_info=True)
        raise
    finally:
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

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        logger.info(f"Received chat request for session {request.session_id}")
        logger.info(f"")
        try:
            # Retrieve or create LLM state
            conn = sqlite3.connect('context.db')
            c = conn.cursor()
            c.execute(
                "SELECT state FROM llm_states WHERE session_id = ? AND model = ?",
                (request.session_id, request.model)
            )
            result = c.fetchone()
            if result:
                # Load existing state
                llm = LLM.from_json(result[0])
                print("Loaded existing conversation state")
            else:
                # Initialize new state with base schema
                print("Initializing new conversation state with base schema")
                # Create a fresh LLM instance for new sessions
                llm = llm_initialisation_factory(
                    role=request.role,
                    llm_name=request.model,
                    database_name="dg_local"
                )
                
                # Ensure schema is loaded first
                logger.info("Loading database schema...")
                llm.initialise_schema(table_names=request.table_names)
                if not llm.database_schema:
                    logger.error("Failed to load database schema!")
                    raise HTTPException(status_code=500, detail="Failed to load database schema")
                
                # Initialize context with schema
                logger.info("Initializing base context with schema...")
                llm.initialise_base_context()
                if not llm.context:
                    logger.error("Failed to initialize base context!")
                    raise HTTPException(status_code=500, detail="Failed to initialize base context")
                
                # Initialize first message
                logger.info("Initializing first message...")
                llm.initialise_first_message()
            
            # Add table context if provided
            # message = request.message
            # if request.table_names:
            #     table_context = f"Tables: {', '.join(request.table_names)}\n\n"
            #     message = table_context + message
        except Exception as e:
            print(f"Error loading conversation state: {e}")
            # Initialize new state if loading fails
            print("Error occurred, initializing new state with base schema")
            # Create a fresh LLM instance for new sessions
            llm = llm_initialisation_factory(
                role=request.role,
                llm_name=request.model,
                database_name="dg_local"
            )
            llm.initialise_schema()
            llm.initialise_base_context()
            llm.initialise_first_message()
        
        # Update the LLM state in the database
        llm.previous_conversations.append({"role": "user", "content": request.message})
        response = llm.stream_chat(llm.previous_conversations)
        llm.previous_conversations.append({"role": "assistant", "content": response})

        # Save the updated state
        try:
            conn = sqlite3.connect('context.db')
            c = conn.cursor()
            # Save or update state
            c.execute('''
                INSERT OR REPLACE INTO llm_states (session_id, model, state)
                VALUES (?, ?, ?)
            ''', (request.session_id, request.model, llm.to_json()))
            conn.commit()
            logger.info("Saved conversation state")
        except Exception as e:
            print(f"Error saving conversation state: {e}")
        
        logger.info(f"Successfully processed chat request for session {request.session_id}")
        return {"response": response}
        
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/schema", response_model=SchemaResponse)
async def get_schema():
    logger.info("Received schema request")
    try:
        # Use get_schema from load_schema module
        schema = load_schema_get_schema(database_name="dg_local")
        if not schema:
            raise HTTPException(status_code=500, detail="Failed to retrieve schema")
        
        # Parse the schema to get table information
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all tables
        tables = get_tables_info(cursor)
        logger.debug(f"Found {len(tables)} tables")
        
        # Get detailed information for each table
        schema_info = []
        for table in tables:
            schema_name = table['schemaname']
            table_name = table['tablename']
            logger.debug(f"Processing table {schema_name}.{table_name}")
            
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
        
        logger.info("Successfully retrieved schema information")
        return SchemaResponse(
            tables=schema_info,
            message="Schema information retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving schema: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/history/{session_id}")
async def get_history(session_id: str):
    logger.info(f"Fetching chat history for session: {session_id}")
    try:
        conn = sqlite3.connect('context.db')
        cur = conn.cursor()
        
        # Get chat history
        cur.execute("""
            SELECT message, response, timestamp 
            FROM conversations 
            WHERE session_id = ? 
            ORDER BY timestamp ASC
        """, (session_id,))
        
        history = cur.fetchall()
        logger.info(f"Retrieved {len(history)} messages for session {session_id}")
        
        # Format the response
        formatted_history = [
            {
                "message": msg[0],
                "response": msg[1],
                "timestamp": msg[2]
            }
            for msg in history
        ]
        
        return formatted_history
    except Exception as e:
        logger.error(f"Error fetching history for session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching chat history: {str(e)}")
    

@app.get("/sessions", response_model=List[SessionInfo])
async def get_sessions():
    logger.info("Fetching list of all sessions")
    try:
        conn = sqlite3.connect('context.db')
        cur = conn.cursor()
        
        # Get all sessions with their details
        cur.execute("""
            SELECT session_id, model, last_updated 
            FROM llm_states 
            ORDER BY last_updated DESC
        """)
        
        sessions = cur.fetchall()
        logger.info(f"Retrieved {len(sessions)} sessions")
        
        # Log each session's details
        for session in sessions:
            logger.info(f"Session: {session[0]}, Model: {session[1]}, Last Updated: {session[2]}")
        
        # Format the response
        formatted_sessions = [
            {
                "session_id": session[0],
                "model": session[1],
                "last_updated": session[2]
            }
            for session in sessions
        ]
        
        return formatted_sessions
    except Exception as e:
        logger.error(f"Error fetching sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching sessions: {str(e)}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.get("/docs", include_in_schema=False)
async def get_openapi_endpoint():
    logger.info("Retrieving OpenAPI documentation")
    return get_openapi(title="DataDynamics API", version="1.0.0", routes=app.routes)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008) 