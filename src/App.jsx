import { useState, useEffect, useRef } from 'react'

const SAMPLE_CODE = {
  javascript: `// User authentication handler
async function loginUser(username, password) {
  const query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'";
  const user = await db.query(query);
  
  if (user) {
    const token = Math.random().toString(36);
    localStorage.setItem('token', token);
    console.log("User logged in:", user.password);
    return user;
  }
}

function calculateDiscount(price, discount) {
  let result = price - (price / 100 * discount);
  for(let i = 0; i < 1000000; i++) {
    result = result * 1.0;
  }
  return result;
}

const fetchUserData = (userId) => {
  fetch('/api/users/' + userId)
    .then(res => res.json())
    .then(data => {
      document.getElementById('user').innerHTML = data.bio;
    });
}`,
  python: `import pickle
import os

def load_user_data(filename):
    with open(filename, 'rb') as f:
        data = pickle.load(f)
    return data

def execute_command(user_input):
    os.system("echo " + user_input)
    result = eval(user_input)
    return result

def get_users(db, search_term):
    query = f"SELECT * FROM users WHERE name = '{search_term}'"
    return db.execute(query)

passwords = ["admin123", "password", "letmein"]
SECRET_KEY = "hardcoded_secret_abc123"

def process_items(items):
    results = []
    for i in range(len(items)):
        for j in range(len(items)):
            results.append(items[i] * items[j])
    return results`,
}

const SEVERITY_CONFIG = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', icon: '🔴', label: 'Critical' },
  warning:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  icon: '🟡', label: 'Warning' },
  info:     { color: '#4f9eff', bg: 'rgba(79,158,255,0.1)',  border: 'rgba(79,158,255,0.3)',  icon: '🔵', label: 'Info' },
}

const CATEGORY_ICONS = {
  security: '🔒', bug: '🐛', performance: '⚡', style: '✨', maintainability: '🔧'
}

function ScoreRing({ score }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#1e1e2e" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="700" fontFamily="Inter">{score}</text>
        <text x="70" y="84" textAnchor="middle" fill="#8b8aa8" fontSize="11" fontFamily="Inter">/ 100</text>
      </svg>
      <p style={{ color: '#8b8aa8', fontSize: '13px' }}>Code Health Score</p>
    </div>
  )
}

function IssueCard({ issue, index }) {
  const [expanded, setExpanded] = useState(false)
  const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info

  return (
    <div
      className="issue-card rounded-xl p-4 cursor-pointer"
      style={{ background: 'var(--bg-card)', animationDelay: `${index * 0.08}s` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
          {sev.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-500" style={{ color: 'var(--text-primary)' }}>{issue.title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>
              {sev.label}
            </span>
            {issue.category && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(124,106,247,0.1)', color: '#7c6af7', border: '1px solid rgba(124,106,247,0.2)' }}>
                {CATEGORY_ICONS[issue.category]} {issue.category}
              </span>
            )}
            {issue.line && (
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                line {issue.line}
              </span>
            )}
          </div>
          {expanded && (
            <div className="mt-3 space-y-2 animate-slide-up">
              <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{issue.description}</p>
              {issue.suggestion && (
                <div className="rounded-lg p-3 mt-2"
                  style={{ background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.2)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#2dd4bf' }}>💡 Suggestion</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{issue.suggestion}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>
    </div>
  )
}

function ScanningOverlay() {
  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none" style={{ zIndex: 10 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(1px)' }} />
      <div className="absolute left-0 right-0 h-0.5 scanning-line"
        style={{ background: 'linear-gradient(90deg, transparent, #7c6af7, #4f9eff, transparent)' }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center spinner"
          style={{ border: '2px solid transparent', borderTopColor: '#7c6af7', borderRightColor: '#4f9eff' }}>
        </div>
        <div className="text-center">
          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Analyzing code...</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Detecting bugs, security issues & smells</p>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [code, setCode] = useState(SAMPLE_CODE.javascript)
  const [language, setLanguage] = useState('javascript')
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [score, setScore] = useState(0)
  const resultsRef = useRef(null)
  const heroRef = useRef(null)

  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const reviewCode = async () => {
  if (!code.trim()) return
  setLoading(true)
  setReviewed(false)
  setIssues([])

  try {
    const res = await fetch('http://localhost:3001/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    })

    const data = await res.json()
    console.log('Response from server:', data)

    if (data.error) {
      alert('AI Error: ' + data.error)
      setLoading(false)
      return
    }

    const found = data.issues || []
    setIssues(found)

    const critical = found.filter(i => i.severity === 'critical').length
    const warning = found.filter(i => i.severity === 'warning').length
    const total = found.length
    const calculated = total === 0 ? 100 : Math.max(10, 100 - critical * 18 - warning * 7 - (total - critical - warning) * 3)
    setScore(calculated)
    setReviewed(true)

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 200)
  } catch (err) {
    console.error('Fetch error:', err)
    alert('Cannot reach server at http://localhost:3001 — make sure npm run dev is running')
  } finally {
    setLoading(false)
  }
}

  const filtered = activeFilter === 'all' ? issues : issues.filter(i => i.severity === activeFilter)
  const counts = {
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  }

  const heroOpacity = Math.max(0, 1 - scrollY / 400)
  const heroTranslate = scrollY * 0.3

  return (
    <div className="min-h-screen grid-bg" style={{ background: 'var(--bg-primary)' }}>

      {/* Ambient orbs */}
      <div className="orb animate-pulse-slow" style={{
        width: 500, height: 500, top: -100, left: -150,
        background: 'radial-gradient(circle, rgba(124,106,247,0.12), transparent 70%)'
      }} />
      <div className="orb animate-pulse-slow" style={{
        width: 400, height: 400, top: 200, right: -100,
        background: 'radial-gradient(circle, rgba(79,158,255,0.10), transparent 70%)',
        animationDelay: '2s'
      }} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c6af7, #4f9eff)' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
          </div>
          <span className="font-semibold text-sm gradient-text">CodeReview AI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full"
            style={{ background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.2)' }}>
            ● Live
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Powered by Tejeshwini Rajendran</span>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative flex flex-col items-center text-center px-6 pt-20 pb-16"
        style={{ opacity: heroOpacity, transform: `translateY(${heroTranslate}px)` }}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-slide-up"
          style={{ background: 'rgba(124,106,247,0.1)', border: '1px solid rgba(124,106,247,0.25)' }}>
          <span className="text-xs font-medium" style={{ color: '#7c6af7' }}>🏆 Hackathon Project</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-Powered Code Review</span>
        </div>

        <h1 className="text-5xl font-bold mb-4 animate-slide-up-delay" style={{ lineHeight: 1.15 }}>
          <span className="gradient-text">Review code</span>
          <br />
          <span style={{ color: 'var(--text-primary)' }}>like a senior engineer</span>
        </h1>

        <p className="text-lg max-w-xl animate-slide-up-delay-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Paste any code and get instant AI-powered analysis — bugs, security vulnerabilities,
          performance issues, and actionable fixes in seconds.
        </p>

        <div className="flex items-center gap-6 mt-8 animate-slide-up-delay-2">
          {[['🔒','Security'], ['🐛','Bug Detection'], ['⚡','Performance'], ['🔧','Code Smells']].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2">
              <span style={{ fontSize: '16px' }}>{icon}</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Main Editor */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="rounded-2xl p-6 glow-purple"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

          {/* Editor Header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#f87171' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#fbbf24' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#4ade80' }} />
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>code_review.{language}</span>
            </div>
            <div className="flex items-center gap-2">
              {['javascript','python'].map(lang => (
                <button key={lang}
                  onClick={() => { setLanguage(lang); setCode(SAMPLE_CODE[lang]); setReviewed(false); setIssues([]) }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${language === lang ? 'tab-active' : ''}`}
                  style={{ borderColor: 'var(--border)', color: language === lang ? '#7c6af7' : 'var(--text-secondary)', background: 'transparent', cursor: 'pointer' }}>
                  {lang === 'javascript' ? '🟨 JavaScript' : '🐍 Python'}
                </button>
              ))}
            </div>
          </div>

          {/* GitHub PR Input */}
<div className="flex items-center gap-3 mb-4 p-3 rounded-xl"
  style={{ background: 'rgba(79,158,255,0.06)', border: '1px solid rgba(79,158,255,0.15)' }}>
  <span style={{ fontSize: '20px' }}>🐙</span>
  <input
    type="text"
    placeholder="GitHub PR, file, or repo URL — e.g. github.com/owner/repo/pull/42"
    className="flex-1 bg-transparent text-sm outline-none"
    style={{ color: 'var(--text-primary)', fontFamily: 'Inter' }}
    id="pr-url-input"
  />
  <button
    onClick={async () => {
  const url = document.getElementById('pr-url-input').value.trim()
  if (!url) return
  setLoading(true)
  try {
    const res = await fetch('http://localhost:3001/api/fetch-pr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prUrl: url })
    })
    const data = await res.json()
    if (data.code) {
      setCode(data.code)
      // Auto-detect language from filename if available
      if (data.filename) {
        if (data.filename.endsWith('.py')) setLanguage('python')
        else setLanguage('javascript')
      }
      setReviewed(false)
      // Show a toast-style message
      const type = data.type === 'pr' ? `PR loaded (${data.fileCount} files)`
        : data.type === 'file' ? `File loaded: ${data.filename}`
        : `Repo loaded (${data.fileCount} files)`
      alert(type + ' — click Review Code to analyze!')
    } else {
      alert(data.error || 'Could not fetch from GitHub')
    }
  } catch (e) {
    alert('Server error — make sure backend is running on port 3001')
  } finally {
    setLoading(false)
  }
}}
    className="text-xs px-4 py-2 rounded-lg font-medium flex-shrink-0"
    style={{ background: 'rgba(79,158,255,0.15)', color: '#4f9eff', border: '1px solid rgba(79,158,255,0.3)', cursor: 'pointer' }}>
    Load PR
  </button>
</div>

          {/* Code Textarea */}
          <div className="relative">
            {loading && <ScanningOverlay />}
            <textarea
              className="code-editor w-full p-4"
              rows={16}
              value={code}
              onChange={e => { setCode(e.target.value); setReviewed(false) }}
              placeholder="Paste your code here..."
              spellCheck={false}
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {code.split('\n').length} lines · {code.length} chars
              </span>
              {reviewed && (
                <span className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                  ✓ Review complete
                </span>
              )}
            </div>
            <button onClick={reviewCode} disabled={loading}
              className="btn-primary px-6 py-2.5 rounded-xl font-medium text-sm text-white flex items-center gap-2"
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              <span>{loading ? '⏳ Analyzing...' : '🔍 Review Code'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Results */}
      {reviewed && (
        <section ref={resultsRef} className="max-w-5xl mx-auto px-6 pb-20">

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Issues', value: issues.length, color: '#7c6af7', bg: 'rgba(124,106,247,0.1)' },
              { label: 'Critical', value: counts.critical, color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
              { label: 'Warnings', value: counts.warning, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
              { label: 'Info', value: counts.info, color: '#4f9eff', bg: 'rgba(79,158,255,0.1)' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="rounded-xl p-4 text-center animate-slide-up"
                style={{ background: bg, border: `1px solid ${color}30` }}>
                <p className="text-3xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Score + Issues */}
          <div className="grid md:grid-cols-3 gap-6">

            {/* Score Panel */}
            <div className="rounded-2xl p-6 flex flex-col items-center justify-center gap-4 animate-slide-up"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <ScoreRing score={score} />
              <div className="w-full space-y-2 mt-2">
                {[
                  { label: 'Security', val: Math.max(0, 100 - counts.critical * 25) },
                  { label: 'Performance', val: Math.max(0, 100 - issues.filter(i=>i.category==='performance').length * 20) },
                  { label: 'Maintainability', val: Math.max(0, 100 - issues.filter(i=>i.category==='maintainability').length * 15) },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{val}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-1.5 rounded-full transition-all duration-1000"
                        style={{ width: `${val}%`, background: val >= 70 ? '#4ade80' : val >= 40 ? '#fbbf24' : '#f87171' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Issues List */}
            <div className="md:col-span-2 rounded-2xl p-6 animate-slide-up-delay"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Issues Found</h2>
                <div className="flex gap-2">
                  {['all','critical','warning','info'].map(f => (
                    <button key={f} onClick={() => setActiveFilter(f)}
                      className={`text-xs px-3 py-1 rounded-lg border transition-all capitalize ${activeFilter === f ? 'tab-active' : ''}`}
                      style={{ borderColor: 'var(--border)', color: activeFilter === f ? '#7c6af7' : 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <span style={{ fontSize: '40px' }}>✅</span>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No issues found</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your code looks clean!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {filtered.map((issue, i) => <IssueCard key={i} issue={issue} index={i} />)}
                </div>
              )}
            </div>
          </div>

          {/* Export Bar */}
          <div className="mt-6 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3"
            style={{ background: 'rgba(124,106,247,0.06)', border: '1px solid rgba(124,106,247,0.15)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Review complete</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Found {issues.length} issue{issues.length !== 1 ? 's' : ''} · Score {score}/100
              </p>
            </div>
            <button
              onClick={() => {
                const report = issues.map(i => `[${i.severity.toUpperCase()}] Line ${i.line || '?'} — ${i.title}\n${i.description}\n💡 ${i.suggestion}\n`).join('\n---\n\n')
                const blob = new Blob([`CODE REVIEW REPORT\n==================\nScore: ${score}/100\nIssues: ${issues.length}\n\n${report}`], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = 'code-review.txt'; a.click()
              }}
              className="text-sm px-4 py-2 rounded-lg font-medium"
              style={{ background: 'rgba(124,106,247,0.2)', color: '#7c6af7', border: '1px solid rgba(124,106,247,0.3)', cursor: 'pointer' }}>
              ⬇ Export Report
            </button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="text-center py-8" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Built with ❤️ using React  · Hackathon 2025
        </p>
      </footer>
    </div>
  )
}