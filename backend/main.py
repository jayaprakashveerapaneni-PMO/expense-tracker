from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from database import init_db, get_session
from models import Expense, ExpenseCreate


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once when the server starts: make sure tables exist.
    init_db()
    yield


app = FastAPI(title="Expense Tracker API", lifespan=lifespan)

# CORS lets the React dev server (port 5173) call this API (port 8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/expenses", response_model=list[Expense])
def list_expenses(session: Session = Depends(get_session)):
    """Return all expenses, newest first."""
    statement = select(Expense).order_by(Expense.spent_on.desc(), Expense.id.desc())
    return session.exec(statement).all()


@app.post("/api/expenses", response_model=Expense, status_code=201)
def create_expense(data: ExpenseCreate, session: Session = Depends(get_session)):
    """Save a new expense. FastAPI validates the JSON body against ExpenseCreate,
    then we convert it into a database row."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    expense = Expense.model_validate(data)
    session.add(expense)
    session.commit()
    session.refresh(expense)  # re-read so the response includes the new id
    return expense


@app.delete("/api/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, session: Session = Depends(get_session)):
    """Delete one expense by id."""
    expense = session.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    session.delete(expense)
    session.commit()


@app.get("/api/summary")
def summary(session: Session = Depends(get_session)):
    """Total spend overall and per category."""
    expenses = session.exec(select(Expense)).all()
    by_category: dict[str, float] = {}
    for e in expenses:
        by_category[e.category] = round(by_category.get(e.category, 0) + e.amount, 2)
    return {"total": round(sum(e.amount for e in expenses), 2), "by_category": by_category}


# In production (Render), FastAPI also serves the built React app.
# In development this folder doesn't exist, so this block is skipped.
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
