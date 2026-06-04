from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from .routes import router
from .demo import router as demo_router

security = HTTPBearer()

app = FastAPI(
    title="Users Service",
    swagger_ui_init_oauth={},
    components={"securitySchemes": {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer"
        }
    }}
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(demo_router)

@app.get("/health")
def health():
    return {"service": "users", "status": "ok"}


