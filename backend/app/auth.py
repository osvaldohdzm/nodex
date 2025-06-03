import os
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from . import models

# Configuración (mejor en variables de entorno)
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey") # CAMBIA ESTO EN PRODUCCIÓN
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Base de datos de usuarios en memoria (SOLO PARA PoC)
fake_users_db: Dict[str, models.UserInDB] = {}

def init_fake_users_db():
    # Crear un usuario de ejemplo
    hashed_password = get_password_hash("testpassword")
    fake_users_db["testuser"] = models.UserInDB(
        username="testuser",
        email="testuser@example.com",
        full_name="Test User",
        hashed_password=hashed_password,
        disabled=False
    )

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: dict, username: str, password: str) -> Optional[models.User]:
    user_in_db = db.get(username)
    if not user_in_db:
        return None
    if not verify_password(password, user_in_db.hashed_password):
        return None
    return models.User(**user_in_db.dict())

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = models.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user_dict = fake_users_db.get(token_data.username)
    if user_dict is None:
        raise credentials_exception
    user = models.User(**user_dict.dict()) # Convert UserInDB to User
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
