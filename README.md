# DataDynamics

A powerful database interaction tool that uses LLMs to help users interact with their databases using natural language.

## Features

- Natural language to SQL query conversion
- Database schema understanding and context awareness
- Support for multiple LLM providers (Bedrock, Llama3)
- Role-based interactions (DBA, Data Analyst, Developer)
- Conversation history tracking
- Schema-aware query generation
- Support for PostgreSQL databases

## Prerequisites

- Python 3.11 or higher
- PostgreSQL database
- AWS credentials (for Bedrock model)
- Node.js and npm (for frontend)

## Setup Instructions

### 1. Clone the repository

```sh
git clone https://github.com/biprakanta/DataDynamics.git
cd DataDynamics
```

### 2. Create and activate a virtual environment

```sh
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies

```sh
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the root directory with the following variables:

```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
BEDROCK_ID=your_bedrock_model_id

DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

### 5. Configure database credentials

Create a `db_creds.json` file in the root directory:

```json
{
  "db_name": "your_db_name",
  "db_user": "your_db_user",
  "db_password": "your_db_password",
  "db_host": "localhost",
  "db_port": "5432"
}
```

### 6. Start the backend server

```sh
cd backend
python -m app
```

The server will start on `http://0.0.0.0:8008`.

### 7. Start the frontend (optional)

```sh
cd frontend
npm install
npm start
```

The frontend will be available at `http://localhost:3000`.

## API Endpoints

### Chat Endpoint

- `POST /chat`
  - Send natural language queries about your database
  - Parameters:
    - `session_id`: Unique identifier for the conversation
    - `message`: Your natural language query
    - `role`: Role for the LLM (dba, data_analyst, developer)
    - `model`: LLM model to use (bedrock, llama3)
    - `table_names`: Optional list of specific tables to focus on

### Schema Endpoint

- `GET /schema`
  - Get detailed information about your database schema
  - Returns table structures, relationships, and constraints

### History Endpoint

- `GET /history/{session_id}`
  - Retrieve conversation history for a specific session

### Documentation

- `GET /docs`
  - Interactive API documentation (Swagger UI)

## Project Structure

```
datadynamics/
├── backend/
│   ├── app.py              # FastAPI application
│   ├── call_llm.py         # LLM interaction logic
│   ├── load_schema.py      # Database schema loading
│   └── prompts.py          # LLM prompts
├── frontend/               # React frontend
├── dg_local/              # Database schema files
├── logs/                  # Application logs
├── context.db            # SQLite database for conversation history
├── db_creds.json         # Database credentials
└── requirements.txt      # Python dependencies
```

## Usage Examples

1. Basic Query:

```json
POST /chat
{
    "session_id": "unique-session-id",
    "message": "Show me the total number of users who signed documents in the last month",
    "role": "dba",
    "model": "bedrock"
}
```

2. Schema-Specific Query:

```json
POST /chat
{
    "session_id": "unique-session-id",
    "message": "What's the average time between document upload and signing?",
    "role": "data_analyst",
    "model": "bedrock",
    "table_names": ["esign_documents", "esign_signers"]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
