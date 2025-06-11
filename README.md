# DataDynamics Backend

## Setup Instructions

### 1. Clone the repository
```sh
git clone https://github.com/biprakanta/DataDynamics.git
cd DataDynamics
```

### 2. Create and activate a virtual environment
```sh
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```sh
pip install -r requirements.txt
```

### 4. Start the FastAPI server
Navigate to the backend directory and run:
```sh
cd backend
python -m app
```

The server will start on `http://0.0.0.0:8000`.

### 5. API Documentation
Visit [http://localhost:8000/docs](http://localhost:8000/docs) for the Swagger UI and API schema.

## Available Endpoints
- `POST /chat` — Chat with the LLM using database context
- `GET /schema` — Get database schema information
- `GET /history/{session_id}` — Get chat history for a session
- `GET /docs` — OpenAPI schema (Swagger)

---

**Note:** Ensure your `.env` file is set up with the required AWS and database credentials before starting the server. 