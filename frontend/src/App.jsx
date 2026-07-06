import { useState, useEffect } from 'react'

const CATEGORIES = ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Other']

const today = () => new Date().toISOString().slice(0, 10)

export default function App() {
  // State: data that, when it changes, makes React re-draw the screen
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState({ total: 0, by_category: {} })
  const [form, setForm] = useState({ description: '', amount: '', category: 'Food', spent_on: today() })
  const [error, setError] = useState('')

  // Fetch data from the FastAPI backend
  async function loadData() {
    const [expRes, sumRes] = await Promise.all([
      fetch('/api/expenses'),
      fetch('/api/summary'),
    ])
    setExpenses(await expRes.json())
    setSummary(await sumRes.json())
  }

  // Run once when the page first loads
  useEffect(() => {
    loadData().catch(() => setError('Could not reach the backend. Is it running?'))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault() // stop the browser from reloading the page
    setError('')
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.detail || 'Something went wrong')
      return
    }
    setForm({ description: '', amount: '', category: form.category, spent_on: today() })
    loadData()
  }

  async function handleDelete(id) {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    loadData()
  }

  return (
    <div className="container">
      <h1>Expense Tracker</h1>

      <div className="summary">
        <div className="total-card">
          <span className="label">Total spent</span>
          <span className="total">${summary.total.toFixed(2)}</span>
        </div>
        <div className="category-cards">
          {Object.entries(summary.by_category).map(([cat, amt]) => (
            <div key={cat} className="cat-card">
              <span className="label">{cat}</span>
              <span>${amt.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="expense-form">
        <input
          required
          placeholder="What did you buy?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          required
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          required
          type="date"
          value={form.spent_on}
          onChange={(e) => setForm({ ...form, spent_on: e.target.value })}
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="expense-list">
        {expenses.length === 0 && <li className="empty">No expenses yet — add your first one above.</li>}
        {expenses.map((exp) => (
          <li key={exp.id}>
            <span className="desc">{exp.description}</span>
            <span className="pill">{exp.category}</span>
            <span className="date">{exp.spent_on}</span>
            <span className="amount">${exp.amount.toFixed(2)}</span>
            <button className="delete" onClick={() => handleDelete(exp.id)} aria-label="Delete">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
