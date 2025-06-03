from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

class Node(BaseModel):
    label: str
    properties: dict

# Puedes añadir más modelos para representar la estructura de tus nodos si es necesario
# class PersonNode(BaseModel):
#     curp: str
#     nombre_completo: str
#     # ... otros campos
