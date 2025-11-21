from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, ValidationError
from typing import Optional, List
from dotenv import load_dotenv
from pathlib import Path
import os
import pandas as pd
import io
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
from jose import JWTError, jwt

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
# NOTE: In production, consider specifying exact origins instead of ["*"]
# for better security: allow_origins=["https://your-frontend-domain.com"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
# For production (Render), use MONGO_URI environment variable from MongoDB Atlas
# For local development, defaults to localhost MongoDB if MONGO_URI is not set
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
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


def serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "role": user.get("role", "viewer"),
        "is_active": user.get("is_active", True),
    }

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
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
    """Validate that email is from @redland.cl domain (only in production)"""
    env = os.environ.get('ENV', 'development').lower()
    if env == 'production':
        return email.lower().endswith("@redland.cl")
    # In development, allow any email domain
    return True


class EmailLoginPayload(BaseModel):
    email: str

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.post("/api/auth/login")
async def login(payload: EmailLoginPayload):
    """
    Email-only login - JSON only
    """
    email = payload.email.strip().lower()

    # Validate domain
    if not validate_redland_email(email):
        raise HTTPException(
            status_code=403,
            detail="Only @redland.cl email addresses are allowed"
        )

    # Find user
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Email not authorized. Contact administrator."
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=403,
            detail="User account is disabled"
        )

    # Create access token
    access_token = create_access_token({
        "sub": email,
        "role": user.get("role", "viewer")
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current logged-in user information
    """
    return {"user": serialize_user(current_user)}

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
    CSV format: email,role (additional columns like 'name' are ignored)
    Roles: editor or viewer
    """
    try:
        # Read CSV file with encoding handling
        contents = await file.read()
        
        # Try different encodings
        csv_content = None
        for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
            try:
                csv_content = contents.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if csv_content is None:
            raise HTTPException(
                status_code=400,
                detail="Could not decode CSV file. Please ensure the file is in UTF-8, Latin-1, or Windows-1252 encoding."
            )
        
        # Read CSV using pandas
        df = pd.read_csv(io.StringIO(csv_content))
        
        # Normalize column names (strip whitespace, lowercase)
        df.columns = df.columns.str.strip().str.lower()
        
        # Validate CSV format - must have email and role columns
        if 'email' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"CSV must have an 'email' column. Found columns: {', '.join(df.columns)}"
            )
        if 'role' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"CSV must have a 'role' column. Found columns: {', '.join(df.columns)}"
            )
        
        added_users = []
        errors = []
        
        # Process each row
        for index, row in df.iterrows():
            try:
                # Get email and role, handle NaN values
                email_raw = row.get('email')
                role_raw = row.get('role')
                
                if pd.isna(email_raw) or pd.isna(role_raw):
                    errors.append(f"Row {index + 2}: Missing email or role")
                    continue
                
                email = str(email_raw).strip().lower()
                role = str(role_raw).strip().lower()
                
                # Validate email is not empty
                if not email:
                    errors.append(f"Row {index + 2}: Empty email")
                    continue
                
                # Validate email format (basic check)
                if '@' not in email:
                    errors.append(f"Row {index + 2}: {email} - Invalid email format")
                    continue
                
                # Validate email domain (only in production)
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
                    
            except Exception as row_error:
                errors.append(f"Row {index + 2}: Error processing row - {str(row_error)}")
                continue
        
        # Ensure collection exists (MongoDB creates it automatically, but we verify)
        if not added_users and not errors:
            raise HTTPException(
                status_code=400,
                detail="No valid rows found in CSV file"
            )
        
        return {
            "success": True,
            "message": f"Processed {len(added_users)} user(s) successfully" + (f" with {len(errors)} error(s)" if errors else ""),
            "users_added": added_users,
            "errors": errors if errors else None
        }
        
    except HTTPException:
        raise
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except UnicodeDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Error decoding CSV file: {str(e)}")
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
                    **serialize_user(user),
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


@app.post("/api/users/delete-csv")
async def delete_users_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_admin_user)
):
    """
    Delete users from CSV file (Editor only)
    CSV format: email (only email column required)
    """
    try:
        # Read CSV file with encoding handling
        contents = await file.read()
        
        # Try different encodings
        csv_content = None
        for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']:
            try:
                csv_content = contents.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if csv_content is None:
            raise HTTPException(
                status_code=400,
                detail="Could not decode CSV file. Please ensure the file is in UTF-8, Latin-1, or Windows-1252 encoding."
            )
        
        # Read CSV using pandas
        df = pd.read_csv(io.StringIO(csv_content))
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower()
        
        # Validate CSV format - must have email column
        if 'email' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"CSV must have an 'email' column. Found columns: {', '.join(df.columns)}"
            )
        
        deleted_emails = []
        errors = []
        
        # Extract emails from CSV
        emails = []
        for index, row in df.iterrows():
            try:
                email_raw = row.get('email')
                if pd.isna(email_raw):
                    continue
                
                email = str(email_raw).strip().lower()
                if email and '@' in email:
                    emails.append(email)
            except Exception:
                continue
        
        if not emails:
            raise HTTPException(
                status_code=400,
                detail="No valid emails found in CSV file"
            )
        
        # Prevent deleting yourself
        current_email = current_user["email"].lower()
        emails = [e for e in emails if e != current_email]
        
        if not emails:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete your own account"
            )
        
        # Delete users
        result = users_collection.delete_many({"email": {"$in": emails}})
        
        # Get list of deleted emails
        deleted_emails = emails[:result.deleted_count]
        
        return {
            "success": True,
            "count": result.deleted_count,
            "details": [f"Eliminado: {email}" for email in deleted_emails]
        }
        
    except HTTPException:
        raise
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")


@app.patch("/api/users/{email}/role")
async def update_user_role(
    email: str,
    role_data: dict = Body(...),
    current_user: dict = Depends(get_current_admin_user)
):
    """
    Update user role (Editor only)
    """
    try:
        email = email.lower()
        role = role_data.get("role", "").strip().lower()
        
        if role not in ['editor', 'viewer']:
            raise HTTPException(
                status_code=400,
                detail="Invalid role. Must be 'editor' or 'viewer'"
            )
        
        # Check if user exists
        user = users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update role
        users_collection.update_one(
            {"email": email},
            {"$set": {"role": role, "updated_at": datetime.utcnow().isoformat()}}
        )
        
        return {
            "success": True,
            "message": "Rol actualizado correctamente",
            "email": email,
            "role": role
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class BulkDeleteRequest(BaseModel):
    emails: List[str]


@app.post("/api/users/bulk-delete")
async def bulk_delete_users(
    request: BulkDeleteRequest,
    current_user: dict = Depends(get_current_admin_user)
):
    """
    Delete multiple users (Editor only)
    """
    try:
        emails = [e.lower().strip() for e in request.emails if e]
        
        if not emails:
            raise HTTPException(status_code=400, detail="No emails provided")
        
        # Prevent deleting yourself
        current_email = current_user["email"].lower()
        emails = [e for e in emails if e != current_email]
        
        if not emails:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete your own account"
            )
        
        # Delete users
        result = users_collection.delete_many({"email": {"$in": emails}})
        
        return {
            "success": True,
            "count": result.deleted_count,
            "message": f"Se han eliminado {result.deleted_count} usuario(s) seleccionados"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/users/export-csv")
async def export_users_csv(
    current_user: dict = Depends(get_current_admin_user)
):
    """
    Export all users as CSV (Editor only)
    """
    try:
        users = list(users_collection.find({}).limit(1000))
        
        # Create CSV content
        csv_lines = ["email,role"]
        for user in users:
            email = user.get("email", "")
            role = user.get("role", "viewer")
            csv_lines.append(f"{email},{role}")
        
        csv_content = "\n".join(csv_lines)
        
        from fastapi.responses import Response
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=usuarios_export.csv"}
        )
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


@app.post("/api/users/load-initial-users")
async def load_initial_users():
    """
    Load initial users from CSV file (only works if no users exist)
    This is for initial setup - anyone can call it ONCE
    """
    try:
        # Check if any users exist
        user_count = users_collection.count_documents({})
        if user_count > 0:
            return {
                "success": False,
                "message": f"Users already exist ({user_count} users). Use CSV upload to add more users.",
                "user_count": user_count
            }
        
        # Path to CSV file
        csv_path = Path(__file__).parent.parent / "usuarios_20_redland.csv"
        
        if not csv_path.exists():
            # Try alternative path
            csv_path = Path(__file__).parent.parent / "usuarios_ejemplo.csv"
            if not csv_path.exists():
                raise HTTPException(
                    status_code=404,
                    detail="CSV file not found. Please ensure usuarios_20_redland.csv exists in the project root."
                )
        
        # Read CSV file
        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error reading CSV file: {str(e)}"
            )
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower()
        
        # Validate CSV format
        if 'email' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"CSV must have an 'email' column. Found columns: {', '.join(df.columns)}"
            )
        if 'role' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"CSV must have a 'role' column. Found columns: {', '.join(df.columns)}"
            )
        
        added_users = []
        errors = []
        
        # Process each row
        for index, row in df.iterrows():
            try:
                email_raw = row.get('email')
                role_raw = row.get('role')
                
                if pd.isna(email_raw) or pd.isna(role_raw):
                    errors.append(f"Row {index + 2}: Missing email or role")
                    continue
                
                email = str(email_raw).strip().lower()
                role = str(role_raw).strip().lower()
                
                # Validate email is not empty
                if not email:
                    errors.append(f"Row {index + 2}: Empty email")
                    continue
                
                # Validate email format (basic check)
                if '@' not in email:
                    errors.append(f"Row {index + 2}: {email} - Invalid email format")
                    continue
                
                # Validate role
                if role not in ['editor', 'viewer']:
                    errors.append(f"Row {index + 2}: {email} - Invalid role '{role}'. Must be 'editor' or 'viewer'")
                    continue
                
                # Check if user already exists (shouldn't happen, but just in case)
                existing_user = users_collection.find_one({"email": email})
                
                if existing_user:
                    errors.append(f"Row {index + 2}: {email} - User already exists")
                    continue
                
                # Create new user
                new_user = {
                    "email": email,
                    "role": role,
                    "created_at": datetime.utcnow().isoformat(),
                    "is_active": True
                }
                users_collection.insert_one(new_user)
                added_users.append(f"Added: {email} → {role}")
                
            except Exception as row_error:
                errors.append(f"Row {index + 2}: Error processing row - {str(row_error)}")
                continue
        
        return {
            "success": True,
            "message": f"Loaded {len(added_users)} users from CSV",
            "users_added": added_users,
            "errors": errors if errors else None,
            "total_users": len(added_users)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading users: {str(e)}")

# ============================================
# ACTIVITIES AND EVALUATIONS ENDPOINTS
# ============================================

class ActivityCreate(BaseModel):
    seccion: str  # Junior, Middle, Senior, or "ALL" (Todos)
    actividad: str
    fecha: str  # YYYY-MM-DD
    fechaFin: str | None = None
    hora: str
    lugar: str | None = None
    responsable: str | None = None
    importante: bool = False
    cursos: Optional[List[str]] = None  # Array of courses (optional)

class ActivityUpdate(BaseModel):
    seccion: str
    actividad: str
    fecha: str
    fechaFin: str | None = None
    hora: str
    lugar: str | None = None
    responsable: str | None = None
    importante: bool = False
    cursos: Optional[List[str]] = None  # Array of courses (optional)

class EvaluationCreate(BaseModel):
    seccion: str  # Junior, Middle, Senior
    asignatura: str
    tema: str | None = None
    cursos: List[str]  # Array de cursos (requerido)
    fecha: str  # YYYY-MM-DD
    hora: Optional[str] = None  # HH:MM format
    
    class Config:
        # Permitir campos extra para compatibilidad (ignorar "curso" si viene)
        extra = "ignore"

class EvaluationUpdate(BaseModel):
    seccion: str
    asignatura: str
    tema: str | None = None
    cursos: List[str]  # Array de cursos (requerido)
    fecha: str
    hora: Optional[str] = None  # HH:MM format
    
    class Config:
        # Permitir campos extra para compatibilidad (ignorar "curso" si viene)
        extra = "ignore"

def serialize_activity(activity: dict) -> dict:
    """Convert MongoDB activity to frontend format"""
    result = {
        "id": str(activity["_id"]),
        "seccion": activity["seccion"],
        "actividad": activity["actividad"],
        "fecha": activity["fecha"],
        "fechaFin": activity.get("fechaFin"),
        "hora": activity["hora"],
        "lugar": activity.get("lugar"),
        "responsable": activity.get("responsable"),
        "importante": activity.get("importante", False),
        "timestamp": activity.get("created_at", activity.get("timestamp", "")),
        "created_by": activity.get("created_by", ""),
    }
    # Include cursos if present (new format)
    if "cursos" in activity:
        result["cursos"] = activity["cursos"]
    # Include curso if present (legacy format) for backward compatibility
    if "curso" in activity and "cursos" not in activity:
        result["curso"] = activity["curso"]
    return result

def serialize_evaluation(evaluation: dict) -> dict:
    """Convert MongoDB evaluation to frontend format
    Siempre devuelve cursos como array, nunca curso como string
    """
    result = {
        "id": str(evaluation["_id"]),
        "seccion": evaluation["seccion"],
        "asignatura": evaluation["asignatura"],
        "tema": evaluation.get("tema"),
        "fecha": evaluation["fecha"],
        "timestamp": evaluation.get("created_at", evaluation.get("timestamp", "")),
        "created_by": evaluation.get("created_by", ""),
    }
    # Siempre devolver cursos como array (convertir legacy curso a array si es necesario)
    if "cursos" in evaluation and isinstance(evaluation["cursos"], list):
        # Ya es un array, usar directamente
        result["cursos"] = evaluation["cursos"]
    elif "curso" in evaluation:
        # Convertir legacy curso (string) a cursos (array) para compatibilidad
        curso_value = evaluation["curso"]
        if isinstance(curso_value, str):
            result["cursos"] = [curso_value]
        elif isinstance(curso_value, list):
            result["cursos"] = curso_value
        else:
            result["cursos"] = []
    else:
        # Si no existe ninguno, devolver lista vacía
        result["cursos"] = []
    
    # Nunca incluir "curso" en la respuesta, solo "cursos" como array
    
    # Include hora if present (support both 'hora' and legacy 'hour' for backward compatibility)
    if "hora" in evaluation:
        result["hora"] = evaluation["hora"]
    elif "hour" in evaluation:
        result["hora"] = evaluation["hour"]
    return result

@app.post("/api/activities")
async def create_activity(
    activity: ActivityCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new activity (Editor only)
    If seccion == "ALL", creates 3 activities (one for each section: Junior, Middle, Senior)
    """
    try:
        if current_user.get("role") != "editor":
            raise HTTPException(status_code=403, detail="Editor role required")
        
        # Validate seccion
        if activity.seccion not in ["Junior", "Middle", "Senior", "ALL"]:
            raise HTTPException(status_code=400, detail="Invalid seccion. Must be Junior, Middle, Senior, or ALL")
        
        # Base activity data (common to all activities)
        base_activity_data = {
            "actividad": activity.actividad,
            "fecha": activity.fecha,
            "fechaFin": activity.fechaFin,
            "hora": activity.hora,
            "lugar": activity.lugar,
            "responsable": activity.responsable,
            "importante": activity.importante,
            "created_by": current_user["email"],
            "created_at": datetime.utcnow().isoformat(),
        }
        # Add cursos if provided
        if activity.cursos is not None:
            base_activity_data["cursos"] = activity.cursos
        
        # If seccion is "ALL", create 3 activities (one for each section)
        if activity.seccion == "ALL":
            secciones_destino = ["Junior", "Middle", "Senior"]
            inserted_ids = []
            
            for seccion_destino in secciones_destino:
                activity_doc = {
                    **base_activity_data,
                    "seccion": seccion_destino,
                }
                result = registro_activities_collection.insert_one(activity_doc)
                inserted_ids.append(str(result.inserted_id))
            
            return {
                "success": True,
                "created": 3,
                "message": f"Created 3 activities for all sections (Junior, Middle, Senior)"
            }
        else:
            # Normal case: create single activity
            activity_doc = {
                **base_activity_data,
                "seccion": activity.seccion,
            }
            
            result = registro_activities_collection.insert_one(activity_doc)
            activity_doc["_id"] = result.inserted_id
            
            return {
                "success": True,
                "activity": serialize_activity(activity_doc)
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/activities")
async def get_activities(
    date_from: str | None = None,
    date_to: str | None = None,
    seccion: str | None = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get activities filtered by date range and/or seccion
    Returns activities grouped by date and seccion (frontend format)
    """
    try:
        query = {}
        
        # Date range filter
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = date_from
            if date_to:
                date_query["$lte"] = date_to
            query["fecha"] = date_query
        
        # Seccion filter
        if seccion:
            if seccion not in ["Junior", "Middle", "Senior"]:
                raise HTTPException(status_code=400, detail="Invalid seccion")
            query["seccion"] = seccion
        
        # Fetch activities
        activities = list(registro_activities_collection.find(query).sort("fecha", 1))
        
        # Group by date and seccion (frontend format)
        grouped = {}
        for activity in activities:
            fecha = activity["fecha"]
            seccion_key = activity["seccion"]
            
            if fecha not in grouped:
                grouped[fecha] = {}
            if seccion_key not in grouped[fecha]:
                grouped[fecha][seccion_key] = []
            
            grouped[fecha][seccion_key].append(serialize_activity(activity))
        
        return {
            "success": True,
            "activities": grouped
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/activities/{activity_id}")
async def update_activity(
    activity_id: str,
    activity: ActivityUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an activity (Editor only)
    """
    try:
        if current_user.get("role") != "editor":
            raise HTTPException(status_code=403, detail="Editor role required")
        
        try:
            obj_id = ObjectId(activity_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid activity ID")
        
        # Check if activity exists
        existing = registro_activities_collection.find_one({"_id": obj_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Update activity
        update_data = {
            "seccion": activity.seccion,
            "actividad": activity.actividad,
            "fecha": activity.fecha,
            "fechaFin": activity.fechaFin,
            "hora": activity.hora,
            "lugar": activity.lugar,
            "responsable": activity.responsable,
            "importante": activity.importante,
            "updated_at": datetime.utcnow().isoformat(),
            "updated_by": current_user["email"],
        }
        # Add cursos if provided, or remove it if explicitly set to None
        if activity.cursos is not None:
            update_data["cursos"] = activity.cursos
        # Note: If cursos is None and we want to remove it, we'd need to use $unset
        # For now, we'll only update if cursos is provided
        
        registro_activities_collection.update_one(
            {"_id": obj_id},
            {"$set": update_data}
        )
        
        updated = registro_activities_collection.find_one({"_id": obj_id})
        
        return {
            "success": True,
            "activity": serialize_activity(updated)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/activities/{activity_id}")
async def delete_activity(
    activity_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an activity (Editor only)
    """
    try:
        if current_user.get("role") != "editor":
            raise HTTPException(status_code=403, detail="Editor role required")
        
        try:
            obj_id = ObjectId(activity_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid activity ID")
        
        result = registro_activities_collection.delete_one({"_id": obj_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        return {
            "success": True,
            "message": "Activity deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluations")
async def create_evaluation(
    evaluation: EvaluationCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new evaluation (Editor only)
    """
    try:
        if current_user.get("role") != "editor":
            raise HTTPException(status_code=403, detail="Editor role required")
        
        # Validate seccion
        if evaluation.seccion not in ["Junior", "Middle", "Senior"]:
            raise HTTPException(status_code=400, detail="Invalid seccion. Must be Junior, Middle, or Senior")
        
        # Validate cursos array - debe ser una lista no vacía
        if not isinstance(evaluation.cursos, list):
            raise HTTPException(status_code=400, detail="cursos must be an array")
        if len(evaluation.cursos) == 0:
            raise HTTPException(status_code=400, detail="At least one course must be specified in cursos array")
        if len(evaluation.cursos) > 3:
            raise HTTPException(status_code=400, detail="Maximum 3 courses allowed per evaluation")
        
        # Validar que todos los elementos sean strings
        if not all(isinstance(c, str) for c in evaluation.cursos):
            raise HTTPException(status_code=400, detail="All items in cursos array must be strings")
        
        # Create evaluation document - guardar cursos como array
        evaluation_doc = {
            "seccion": evaluation.seccion,
            "asignatura": evaluation.asignatura,
            "tema": evaluation.tema,
            "cursos": evaluation.cursos,  # Array de cursos - guardar tal cual
            "fecha": evaluation.fecha,
            "created_by": current_user["email"],
            "created_at": datetime.utcnow().isoformat(),
        }
        # Add hora if provided
        if evaluation.hora is not None:
            evaluation_doc["hora"] = evaluation.hora
        
        result = registro_evaluations_collection.insert_one(evaluation_doc)
        evaluation_doc["_id"] = result.inserted_id
        
        return {
            "success": True,
            "evaluation": serialize_evaluation(evaluation_doc)
        }
    except HTTPException:
        raise
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=f"Validation error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating evaluation: {str(e)}")

@app.get("/api/evaluations")
async def get_evaluations(
    date_from: str | None = None,
    date_to: str | None = None,
    seccion: str | None = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get evaluations filtered by date range and/or seccion
    Returns evaluations grouped by date and seccion (frontend format)
    """
    try:
        query = {}
        
        # Date range filter
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = date_from
            if date_to:
                date_query["$lte"] = date_to
            query["fecha"] = date_query
        
        # Seccion filter
        if seccion:
            if seccion not in ["Junior", "Middle", "Senior"]:
                raise HTTPException(status_code=400, detail="Invalid seccion")
            query["seccion"] = seccion
        
        # Fetch evaluations
        evaluations = list(registro_evaluations_collection.find(query).sort("fecha", 1))
        
        # Group by date and seccion (frontend format)
        grouped = {}
        for evaluation in evaluations:
            fecha = evaluation["fecha"]
            seccion_key = evaluation["seccion"]
            
            if fecha not in grouped:
                grouped[fecha] = {}
            if seccion_key not in grouped[fecha]:
                grouped[fecha][seccion_key] = []
            
            grouped[fecha][seccion_key].append(serialize_evaluation(evaluation))
        
        return {
            "success": True,
            "evaluations": grouped
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/evaluations/{evaluation_id}")
async def update_evaluation(
    evaluation_id: str,
    evaluation: EvaluationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an evaluation (Editor only)
    """
    try:
        if current_user.get("role") != "editor":
            raise HTTPException(status_code=403, detail="Editor role required")
        
        try:
            obj_id = ObjectId(evaluation_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid evaluation ID")
        
        # Check if evaluation exists
        existing = registro_evaluations_collection.find_one({"_id": obj_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # Validate cursos array - debe ser una lista no vacía
        if not isinstance(evaluation.cursos, list):
            raise HTTPException(status_code=400, detail="cursos must be an array")
        if len(evaluation.cursos) == 0:
            raise HTTPException(status_code=400, detail="At least one course must be specified in cursos array")
        if len(evaluation.cursos) > 3:
            raise HTTPException(status_code=400, detail="Maximum 3 courses allowed per evaluation")
        
        # Validar que todos los elementos sean strings
        if not all(isinstance(c, str) for c in evaluation.cursos):
            raise HTTPException(status_code=400, detail="All items in cursos array must be strings")
        
        # Update evaluation - sobrescribir cursos como array
        update_data = {
            "seccion": evaluation.seccion,
            "asignatura": evaluation.asignatura,
            "tema": evaluation.tema,
            "cursos": evaluation.cursos,  # Array de cursos - sobrescribir tal cual
            "fecha": evaluation.fecha,
            "updated_at": datetime.utcnow().isoformat(),
            "updated_by": current_user["email"],
        }
        # Add hora if provided
        if evaluation.hora is not None:
            update_data["hora"] = evaluation.hora
        
        # Eliminar campo "curso" si existe (migración)
        registro_evaluations_collection.update_one(
            {"_id": obj_id},
            {"$set": update_data, "$unset": {"curso": ""}}
        )
        
        updated = registro_evaluations_collection.find_one({"_id": obj_id})
        
        return {
            "success": True,
            "evaluation": serialize_evaluation(updated)
        }
    except HTTPException:
        raise
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=f"Validation error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating evaluation: {str(e)}")

@app.delete("/api/evaluations/{evaluation_id}")
async def delete_evaluation(
    evaluation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an evaluation (Editor only)
    """
    try:
        if current_user.get("role") != "editor":
            raise HTTPException(status_code=403, detail="Editor role required")
        
        try:
            obj_id = ObjectId(evaluation_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid evaluation ID")
        
        result = registro_evaluations_collection.delete_one({"_id": obj_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        return {
            "success": True,
            "message": "Evaluation deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# EMAIL REPORTING
# ============================================

@app.post("/api/send-report-email")
async def send_report_email(
    pdf: UploadFile = File(...),
    to: str = Form(...),
    subject: str = Form(...),
    reportType: str = Form(...),
    section: str = Form(...),
    nivel: str = Form(...),
    dateFrom: str = Form(...),
    dateTo: str = Form(...)
):
    """
    Send report email with PDF attachment
    Receives PDF file generated by frontend (Chrome's rendering engine)
    This ensures the PDF is EXACTLY the same as the browser-generated PDF
    """
    try:
        # Get SMTP settings from environment
        SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
        SMTP_USER = os.environ.get("SMTP_USER", "")
        SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
        SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)

        if not SMTP_USER or not SMTP_PASSWORD:
            # For demo purposes, just return success without sending
            # In production, you'd configure real SMTP credentials
            return {
                "success": True,
                "message": "Email functionality not configured. Please add SMTP credentials to .env file.",
                "demo_mode": True
            }

        # Read PDF file bytes - this is the EXACT PDF generated by Chrome
        pdf_bytes = await pdf.read()
        
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="PDF file is empty")

        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = SMTP_FROM
        message["To"] = to

        # Load and attach logo image for inline display
        # Try to find logo_header.png first, fallback to existing logo
        logo_header_path = ROOT_DIR.parent / "frontend" / "public" / "img" / "logo" / "logo_header.png"
        logo_path = ROOT_DIR.parent / "frontend" / "public" / "img" / "logo" / "imalogotipo-blanco_sinfondo_2.png"
        
        # Prefer logo_header.png if it exists, otherwise use the existing logo
        if logo_header_path.exists():
            logo_path = logo_header_path
        
        logo_img = None
        if logo_path.exists():
            try:
                with open(logo_path, "rb") as f:
                    logo_img = f.read()
                
                # Attach logo as inline image with Content-ID
                logo_part = MIMEImage(logo_img)
                logo_part.add_header("Content-ID", "<logo_header>")
                logo_part.add_header("Content-Disposition", "inline", filename="logo_header.png")
                message.attach(logo_part)
                print(f"[EMAIL] Logo attached successfully: {logo_path.name}")
            except Exception as e:
                print(f"[EMAIL] Warning: Could not load logo image: {str(e)}")
                logo_img = None

        # Load and attach pie_correo1.png image for inline display at the end
        # Try new location first (frontend/public/img/pie_correo1.png), fallback to formas folder
        pie_correo1_path = ROOT_DIR.parent / "frontend" / "public" / "img" / "pie_correo1.png"
        pie_correo1_fallback_path = ROOT_DIR.parent / "frontend" / "public" / "img" / "formas" / "pie_correo1.png"
        
        # Use new location if exists, otherwise use fallback
        if not pie_correo1_path.exists() and pie_correo1_fallback_path.exists():
            pie_correo1_path = pie_correo1_fallback_path
        
        pie_correo1_img = None
        if pie_correo1_path.exists():
            try:
                # Log the path being used for debugging
                print(f"[EMAIL] Loading pie_correo1 image from: {pie_correo1_path}")
                
                with open(pie_correo1_path, "rb") as f:
                    pie_correo1_img = f.read()
                
                # Verify the image was read successfully
                if not pie_correo1_img:
                    print(f"[EMAIL] ERROR: pie_correo1 image file is empty: {pie_correo1_path}")
                else:
                    # Attach pie_correo1 as inline image with Content-ID
                    pie_correo1_part = MIMEImage(pie_correo1_img)
                    pie_correo1_part.add_header("Content-ID", "<pie_correo1>")
                    pie_correo1_part.add_header("Content-Disposition", "inline", filename="pie_correo1.png")
                    message.attach(pie_correo1_part)
                    print(f"[EMAIL] ✓ Pie correo1 image attached successfully: {pie_correo1_path.name} ({len(pie_correo1_img)} bytes)")
            except FileNotFoundError as e:
                print(f"[EMAIL] ERROR: pie_correo1 image file not found: {pie_correo1_path}")
                print(f"[EMAIL] Full path attempted: {pie_correo1_path.absolute()}")
            except PermissionError as e:
                print(f"[EMAIL] ERROR: Permission denied reading pie_correo1 image: {pie_correo1_path}")
            except Exception as e:
                print(f"[EMAIL] ERROR: Could not load pie_correo1 image: {str(e)}")
                print(f"[EMAIL] Exception type: {type(e).__name__}")
                pie_correo1_img = None
        else:
            print(f"[EMAIL] WARNING: pie_correo1 image not found at either location:")
            print(f"[EMAIL]   - Primary: {ROOT_DIR.parent / 'frontend' / 'public' / 'img' / 'pie_correo1.png'}")
            print(f"[EMAIL]   - Fallback: {pie_correo1_fallback_path}")
            print(f"[EMAIL] Email will be sent without pie_correo1 image.")

        # Add professional corporate HTML content for email body
        # Header padding reduced by ~40% (from 25px to 15px) for more compact design
        BODY_HTML = """<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #222; padding: 20px;">
  <div style="background:#1A2346; padding: 15px; color: white; border-radius: 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 160px; vertical-align: middle; padding-right: 20px;">
          <img src="cid:logo_header" alt="Redland School Logo" style="width: 160px; height: auto; display: block;" />
        </td>
        <td style="vertical-align: middle; text-align: center;">
          <h1 style="margin:0; font-size: 24px; letter-spacing: 1px;">
            REDLAND SCHOOL
          </h1>
          <p style="margin:3px 0 0 0; font-size: 14px;">
            Registro de Actividades y Evaluaciones
          </p>
        </td>
        <td style="width: 160px;"></td>
      </tr>
    </table>
  </div>

  <h2 style="margin-top: 30px; color:#1A2346; font-size:22px;">
    Reporte Institucional
  </h2>

  <p style="font-size: 15px; line-height:1.6;">
    Estimado/a,<br><br>
    Se adjunta el reporte institucional correspondiente al período seleccionado.<br>
    El documento adjunto contiene todas las actividades y evaluaciones dentro del rango de fechas indicado.
  </p>

  <p style="font-size: 14px; margin-top: 30px;">
    Saludos cordiales,<br>
    <strong>Registro Escolar Web – Redland School</strong>
  </p>

  <p style="font-size: 12px; color:#555; margin-top:40px;">
    Este es un mensaje generado automáticamente por la plataforma.
  </p>

  <div style="margin-top: 40px; width: 100%;">
    <img src="cid:pie_correo1" alt="Pie de correo" style="width: 100%; max-height: 200px; object-fit: cover; display: block;" />
  </div>
</body>
</html>"""
        html_part = MIMEText(BODY_HTML, "html", "utf-8")
        message.attach(html_part)

        # Attach PDF file directly - NO generation, just attach what we received
        # This PDF is EXACTLY the same as the one generated by the browser
        pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
        pdf_part.add_header(
            "Content-Disposition",
            "attachment",
            filename=pdf.filename or "Reporte.pdf"
        )
        message.attach(pdf_part)
        print(f"[EMAIL] PDF attachment added successfully: {pdf.filename}")

        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)

        return {
            "success": True,
            "message": f"Email sent successfully to {to}"
        }

    except Exception as e:
        # Log error for debugging (in production, use proper logging)
        raise HTTPException(
            status_code=500,
            detail=f"Error sending email: {str(e)}"
        )


@app.get("/api/test-email")
async def test_email():
    """
    Test endpoint to verify SMTP configuration
    """
    try:
        # Get SMTP settings from environment
        SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
        SMTP_USER = os.environ.get("SMTP_USER", "")
        SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
        SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)
        
        # Check if credentials are configured
        if not SMTP_USER or not SMTP_PASSWORD:
            return {
                "success": False,
                "error": "SMTP credentials not configured",
                "details": {
                    "SMTP_SERVER": SMTP_SERVER,
                    "SMTP_PORT": SMTP_PORT,
                    "SMTP_USER": "Not set" if not SMTP_USER else "Set",
                    "SMTP_PASSWORD": "Not set" if not SMTP_PASSWORD else "Set",
                    "SMTP_FROM": SMTP_FROM
                },
                "message": "Please configure SMTP_USER and SMTP_PASSWORD in .env file"
            }
        
        # Test connection and authentication
        test_result = {
            "success": False,
            "connection": "Not tested",
            "authentication": "Not tested",
            "email_sent": False,
            "details": {}
        }
        
        try:
            # Test SMTP connection
            print(f"[TEST-EMAIL] Connecting to {SMTP_SERVER}:{SMTP_PORT}...")
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            test_result["connection"] = "Success"
            test_result["details"]["connection"] = f"Connected to {SMTP_SERVER}:{SMTP_PORT}"
            
            # Test STARTTLS
            print(f"[TEST-EMAIL] Starting TLS...")
            server.starttls()
            test_result["details"]["starttls"] = "Success"
            
            # Test authentication
            print(f"[TEST-EMAIL] Authenticating with user: {SMTP_USER}...")
            server.login(SMTP_USER, SMTP_PASSWORD)
            test_result["authentication"] = "Success"
            test_result["details"]["authentication"] = f"Authenticated as {SMTP_USER}"
            
            # Send test email
            print(f"[TEST-EMAIL] Sending test email to {SMTP_USER}...")
            test_message = MIMEMultipart("alternative")
            test_message["Subject"] = "Test desde Registro Escolar"
            test_message["From"] = SMTP_FROM
            test_message["To"] = SMTP_USER
            
            html_content = """
            <html>
              <body>
                <h2>Prueba SMTP funcionando</h2>
                <p>Este es un email de prueba desde el sistema Registro Escolar.</p>
                <p>Si recibes este mensaje, significa que la configuración SMTP está funcionando correctamente.</p>
                <hr>
                <p><small>Enviado desde: {}</small></p>
              </body>
            </html>
            """.format(SMTP_SERVER)
            
            text_content = "Prueba SMTP funcionando\n\nEste es un email de prueba desde el sistema Registro Escolar.\nSi recibes este mensaje, significa que la configuración SMTP está funcionando correctamente."
            
            text_part = MIMEText(text_content, "plain", "utf-8")
            html_part = MIMEText(html_content, "html", "utf-8")
            
            test_message.attach(text_part)
            test_message.attach(html_part)
            
            server.send_message(test_message)
            test_result["email_sent"] = True
            test_result["details"]["email_sent"] = f"Test email sent successfully to {SMTP_USER}"
            
            server.quit()
            test_result["success"] = True
            test_result["message"] = f"Test email sent successfully to {SMTP_USER}"
            
            print(f"[TEST-EMAIL] Test email sent successfully!")
            
        except smtplib.SMTPAuthenticationError as e:
            test_result["error"] = "SMTP Authentication failed"
            test_result["details"]["error"] = str(e)
            test_result["details"]["suggestion"] = "Verify SMTP_USER and SMTP_PASSWORD in .env file. For Gmail, make sure you're using an App Password, not your regular password."
            print(f"[TEST-EMAIL] Authentication error: {e}")
            if 'server' in locals():
                server.quit()
            raise
            
        except smtplib.SMTPException as e:
            test_result["error"] = "SMTP error"
            test_result["details"]["error"] = str(e)
            test_result["details"]["suggestion"] = "Check SMTP_SERVER and SMTP_PORT settings"
            print(f"[TEST-EMAIL] SMTP error: {e}")
            if 'server' in locals():
                server.quit()
            raise
            
        except Exception as e:
            test_result["error"] = f"Unexpected error: {type(e).__name__}"
            test_result["details"]["error"] = str(e)
            test_result["details"]["line"] = f"Error occurred in test_email endpoint"
            print(f"[TEST-EMAIL] Error: {e}")
            if 'server' in locals():
                server.quit()
            raise
        
        return test_result
        
    except Exception as e:
        print(f"[TEST-EMAIL] Fatal error: {e}")
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "message": "Failed to send test email. Check backend logs for details."
        }

# ============================================
# HEALTH CHECK
# ============================================

@app.get("/api/")
async def root():
    return {"message": "Registro Escolar API - Sistema funcionando correctamente"}


@app.get("/api/users/check-status")
async def check_users_status():
    """
    Check status of users collection (no authentication required)
    Useful for debugging login issues
    """
    try:
        user_count = users_collection.count_documents({})
        sample_users = list(users_collection.find({}).limit(5))
        
        return {
            "user_count": user_count,
            "collection_name": "users",
            "database_name": db.name,
            "sample_users": [
                {
                    "email": u.get("email"),
                    "role": u.get("role"),
                    "is_active": u.get("is_active", True)
                }
                for u in sample_users
            ],
            "is_empty": user_count == 0,
            "message": "Collection is empty. Use /api/users/load-initial-users to load users from CSV." if user_count == 0 else f"Found {user_count} users in collection."
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": "Error checking users collection"
        }

# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()