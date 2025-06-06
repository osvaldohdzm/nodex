import logging

# Silenciar el warning específico de passlib sobre la versión de bcrypt
logging.getLogger('passlib').setLevel(logging.ERROR)

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import json
from typing import Any, Dict, List
from datetime import timedelta
from pydantic import BaseModel
import os
import traceback

from . import crud, models, auth

app = FastAPI(title="SIVG Backend")

# CORS Middleware - Allow all origins in development
origins = ["*"]  # Allow all origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Keep this True to allow cookies/auth headers
    allow_methods=["*"],     # Allow all methods
    allow_headers=["*"],     # Allow all headers
    expose_headers=["*"]     # Expose all headers
)

# 2. Event Handlers
@app.on_event("startup")
async def startup_event():
    await crud.init_db_connection()
    auth.init_fake_users_db()  # Initialize fake users after DB connection
    await crud.create_indices_if_needed()  # Create indices after DB and users are set

@app.on_event("shutdown")
async def shutdown_event():
    await crud.close_db_connection()

# 3. API Routes (Define ALL of these BEFORE static files/catch-all)
@app.post("/token", response_model=models.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = auth.authenticate_user(auth.fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me/", response_model=models.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@app.post("/upload-json/")
async def upload_json_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_active_user) # Proteger endpoint
):
    try:
        contents = await file.read()
        data = json.loads(contents)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception:
        raise HTTPException(status_code=500, detail="Error reading file")
    finally:
        await file.close()

    # Aquí llamas a la función que procesa el JSON y lo guarda en Neo4j
    try:
        await crud.process_and_store_json(data)
        return {"message": "JSON processed and data stored successfully."}
    except Exception as e:
        # Log the error e
        print(f"Error processing JSON: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing JSON data: {str(e)}")

class GraphLoadPayload(BaseModel):
    jsonData: Dict[str, Any]
    mode: str

@app.post("/graph/load-json")
async def load_json_to_graph(
    payload: GraphLoadPayload,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    try:
        await crud.process_and_store_json(payload.jsonData, payload.mode)
        return {"message": f"JSON data processed ({payload.mode}) and stored successfully."}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error processing/loading JSON: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing/loading JSON data: {str(e)}"
        )

@app.get("/graph-data/")
async def get_graph_data(
    current_user: models.User = Depends(auth.get_current_active_user)
):
    nodes, relationships = await crud.get_all_graph_data()
    return {"nodes": nodes, "edges": relationships}

@app.get("/node-details/{node_id}")
async def get_node_details(
    node_id: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    try:
        node_id_int = int(node_id)  # Convert to int since we're using internal IDs
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid node ID format")
        
    details = await crud.get_node_properties(node_id)
    if not details:
        raise HTTPException(status_code=404, detail="Node not found")
    return details

# 4. Static Files and SPA Catch-all (Define these LAST)
# In the final production Docker image (docker/Dockerfile),
# backend code is in /app/backend/ and built frontend is in /app/frontend/static/
# So, an absolute path is most reliable here for the production image context.
BUILT_FRONTEND_DIR = "/app/frontend/static"

# Check if the directory for the built frontend exists.
# This check ensures these routes are only active if the frontend has been built and placed here.
if os.path.exists(BUILT_FRONTEND_DIR) and os.path.isdir(BUILT_FRONTEND_DIR):
    print(f"INFO:     Serving static frontend files from {BUILT_FRONTEND_DIR}")
    
    # Serve assets from the 'static' subfolder of the build (e.g., /static/css, /static/js)
    # Create React App typically puts its assets here.
    # Adjust if your build structure is different.
    if os.path.exists(os.path.join(BUILT_FRONTEND_DIR, "static")):
        app.mount(
            "/static",
            StaticFiles(directory=os.path.join(BUILT_FRONTEND_DIR, "static")),
            name="frontend_static_assets"
        )
    else:
        print(f"WARNING:  No 'static' subfolder found in {BUILT_FRONTEND_DIR}. Check your frontend build output.")

    # Serve root files like index.html, favicon.ico, manifest.json, etc.
    # This catch-all MUST be the last route defined.
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Check if the request seems to be for an API endpoint that wasn't matched
        if full_path.startswith(("token", "users/me", "graph/", "node-details/", "upload-json/")):
            raise HTTPException(status_code=404, detail="API endpoint not found")
            
        index_path = os.path.join(BUILT_FRONTEND_DIR, "index.html")
        file_path = os.path.join(BUILT_FRONTEND_DIR, full_path)

        # If the requested path is a file that exists in the build directory, serve it.
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise, serve index.html for SPA routing.
        elif os.path.exists(index_path):
            return FileResponse(index_path)
        else:
            # This should ideally not be reached if BUILT_FRONTEND_DIR and index.html exist.
            print(f"ERROR:    index.html not found at {index_path} for SPA path: {full_path}")
            raise HTTPException(status_code=404, detail="Frontend application not found.")
else:
    print(f"INFO:     Static file serving for frontend is SKIPPED (directory {BUILT_FRONTEND_DIR} not found). Assumed dev environment where frontend is served separately.")
