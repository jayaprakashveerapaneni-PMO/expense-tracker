from typing import Optional
from datetime import date

from sqlmodel import SQLModel, Field


class ExpenseBase(SQLModel):
    """Fields shared by the API schema and the database table."""

    description: str
    amount: float
    category: str
    spent_on: date


class Expense(ExpenseBase, table=True):
    """The database table. Adds the auto-generated primary key."""

    id: Optional[int] = Field(default=None, primary_key=True)


class ExpenseCreate(ExpenseBase):
    """What the client sends when creating an expense (no id).
    Being a non-table model, it gets full validation — e.g. the
    date string '2026-07-06' is parsed into a real Python date."""
