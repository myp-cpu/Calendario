from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
import os
import pandas as pd
import io
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from pymongo import MongoClient
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URL)
db = client[os.environ.get('DB_NAME', 'registro_escolar_db')]

# Collections
users_collection = db['users']
registro_activities_collection = db['registro_activities']
registro_evaluations_collection = db['registro_evaluations']

# Authentication configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 365 * 24 * 60  # 1 year (permanent)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Helper functions for authentication
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = users_collection.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "editor":
        raise HTTPException(status_code=403, detail="Not enough permissions. Editor role required.")
    return current_user

def validate_redland_email(email: str) -> bool:
    """Validate that email is from @redland.cl domain"""
    return email.lower().endswith("@redland.cl")

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.post("/api/auth/login")
async def login(email: str = Form(...)):
    """
    Simple email-only login - returns JWT token
    """
    try:
        # Validate email domain
        if not validate_redland_email(email):
            raise HTTPException(
                status_code=403,
                detail="Only @redland.cl email addresses are allowed"
            )
        
        # Find user
        user = users_collection.find_one({"email": email.lower()})
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Email not authorized. Contact administrator."
            )
        
        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="User account is disabled")
        
        # Create access token (permanent)
        access_token = create_access_token(data={"sub": user["email"]})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "email": user["email"],
            "role": user.get("role", "viewer")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current logged-in user information
    """
    return {
        "email": current_user["email"],
        "role": current_user.get("role", "viewer"),
        "is_active": current_user.get("is_active", True)
    }

# ============================================
# USER MANAGEMENT ENDPOINTS
# ============================================

@app.post("/api/users/upload-csv")
async def upload_users_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_admin_user)
):
    """
    Upload CSV file with user emails and roles (Editor only)
    CSV format: email,role
    Roles: editor or viewer
    """
    try:
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Validate CSV format
        if 'email' not in df.columns or 'role' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="CSV must have 'email' and 'role' columns"
            )
        
        added_users = []
        errors = []
        
        for index, row in df.iterrows():
            email = str(row['email']).strip().lower()
            role = str(row['role']).strip().lower()
            
            # Validate email domain
            if not validate_redland_email(email):
                errors.append(f"Row {index + 2}: {email} - Not a @redland.cl email")
                continue
            
            # Validate role
            if role not in ['editor', 'viewer']:
                errors.append(f"Row {index + 2}: {email} - Invalid role '{role}'. Must be 'editor' or 'viewer'")
                continue
            
            # Check if user already exists
            existing_user = users_collection.find_one({"email": email})
            
            if existing_user:
                # Update existing user's role
                users_collection.update_one(
                    {"email": email},
                    {"$set": {"role": role, "updated_at": datetime.utcnow().isoformat()}}
                )
                added_users.append(f"Updated: {email} → {role}")
            else:
                # Create new user
                new_user = {
                    "email": email,
                    "role": role,
                    "created_at": datetime.utcnow().isoformat(),
                    "is_active": True
                }
                users_collection.insert_one(new_user)
                added_users.append(f"Added: {email} → {role}")
        
        return {
            "success": True,
            "message": f"Processed {len(added_users)} users",
            "users_added": added_users,
            "errors": errors if errors else None
        }
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")


@app.get("/api/users")
async def list_users(current_user: dict = Depends(get_current_admin_user)):
    """
    List all users (Editor only)
    """
    try:
        users = list(users_collection.find({}).limit(100))
        
        return {
            "users": [
                {
                    "email": user["email"],
                    "role": user.get("role", "viewer"),
                    "is_active": user.get("is_active", True),
                    "created_at": user.get("created_at", "")
                }
                for user in users
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/users/{email}")
async def delete_user(
    email: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """
    Delete a user (Editor only)
    """
    try:
        # Prevent deleting yourself
        if email == current_user["email"]:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        # Delete user
        result = users_collection.delete_one({"email": email})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "message": f"User {email} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/users/add-admin")
async def add_first_admin(email: str = Form(...)):
    """
    Add the first admin user (only works if no users exist)
    This is for initial setup - anyone can call it ONCE
    """
    try:
        # Check if any users exist
        user_count = users_collection.count_documents({})
        if user_count > 0:
            raise HTTPException(
                status_code=403,
                detail="Admin already exists. Use CSV upload to add more users."
            )
        
        # Validate email domain
        if not validate_redland_email(email):
            raise HTTPException(
                status_code=403,
                detail="Only @redland.cl email addresses are allowed"
            )
        
        # Create first admin user
        first_admin = {
            "email": email.lower(),
            "role": "editor",
            "created_at": datetime.utcnow().isoformat(),
            "is_active": True
        }
        users_collection.insert_one(first_admin)
        
        return {
            "success": True,
            "message": f"First admin user created: {email}",
            "email": email
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# HEALTH CHECK
# ============================================

@app.get("/api/")
async def root():
    return {"message": "Registro Escolar API - Sistema funcionando correctamente"}

# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()