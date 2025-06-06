import logging

# Silenciar el warning específico de passlib sobre la versión de bcrypt
logging.getLogger('passlib').setLevel(logging.ERROR)

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
import json
from typing import Any, Dict, List
from datetime import timedelta
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import crud, models, auth

app = FastAPI(title="SIVG Backend")

# Configuración CORS (permitir peticiones desde el frontend)
origins = [
    "http://localhost:4545", # Puerto del frontend
    "http://localhost:3000", # Puerto de desarrollo de React
    "http://192.168.0.4:4545", # Nueva IP añadida
    "http://192.168.0.4:3000",  # Added for dev consistency
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await crud.init_db_connection()
    await crud.create_indices_if_needed()

@app.on_event("shutdown")
async def shutdown_event():
    await crud.close_db_connection()

@app.options("/token")
async def options_token():
    return JSONResponse(status_code=200, content={"message": "CORS preflight successful"})

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

# Graph endpoints
class GraphLoadPayload(BaseModel):
    jsonData: Dict[str, Any]  # This will contain {"nodes": [], "edges": []} or other raw JSON
    mode: str  # 'overwrite' or 'merge'

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
        import traceback
        print(f"Error processing/loading JSON: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing/loading JSON data: {str(e)}"
        )

@app.get("/graph-data/")
async def get_graph_data(
    current_user: models.User = Depends(auth.get_current_active_user) # Proteger endpoint
):
    # Llama a una función en crud.py para obtener nodos y relaciones
    nodes, relationships = await crud.get_all_graph_data()
    return {"nodes": nodes, "edges": relationships}

@app.get("/node-details/{node_frontend_id}")
async def get_node_details(
    node_frontend_id: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    details = await crud.get_node_properties(node_frontend_id)
    if not details:
        raise HTTPException(status_code=404, detail="Node not found")
    return details

# Inicializar la base de datos de usuarios falsos (para PoC)
auth.init_fake_users_db()
