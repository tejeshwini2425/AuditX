import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// Select local Ollama by default.
// If you still want Gemini, set USE_GEMINI=true and GEMINI_API_KEY.
dotenv.config()

const USE_GEMINI = (process.env.USE_GEMINI || '').toLowerCase() === 'true'

const genAI = USE_GEMINI ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null
const model = USE_GEMINI ? genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }) : null

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:latest'



// ─── /api/review ───────────────────────────────────────────────
app.post('/api/review', async (req, res) => {
  const { code, language } = req.body

  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'No code provided' })
  }

  try {
    const prompt = `You are a senior software engineer doing a brutally honest code review.


Read every single line of this ${language} code carefully. Find REAL issues that are SPECIFIC to THIS exact code.

You MUST reference exact variable names, function names, and line numbers from the code.
Never give generic advice. Every issue must be traceable to a specific line.

Check for:
1. SECURITY: SQL injection, XSS via innerHTML, hardcoded secrets/passwords, eval/exec misuse, pickle.load on untrusted data, command injection via os.system
2. BUGS: Null/undefined access, unhandled promise rejections, missing error handling, wrong logic
3. PERFORMANCE: Unnecessary loops, nested O(n²) iterations, blocking calls, recomputing inside loops
4. STYLE: Magic numbers, misleading names, dead code, console.log left in
5. MAINTAINABILITY: Functions doing too much, no input validation, missing type hints

STRICT OUTPUT RULES:
- Return ONLY a raw JSON array — no markdown, no backticks, no explanation
- Minimum 4 issues, maximum 10
- severity must be exactly: "critical", "warning", or "info"  
- category must be exactly: "security", "bug", "performance", "style", or "maintainability"
- title must name the specific variable/function involved
- description must explain WHY it is dangerous with a real attack scenario or consequence
- suggestion must give the actual fix code or approach

BAD example (too generic — never do this):
{ "title": "SQL Injection risk", "description": "Avoid string concatenation in SQL" }

GOOD example (specific — always do this):
{ "line": 3, "title": "SQL injection via 'username' parameter", "description": "Line 3 directly concatenates the 'username' variable into the SQL string. An attacker can input ' OR 1=1-- to log in as any user without a password.", "suggestion": "Use parameterized queries: db.query('SELECT * FROM users WHERE username = ?', [username])" }

Here is the exact code to review — analyze it line by line:

${code}

Return ONLY the JSON array starting with [ and ending with ].`

    let text

    if (USE_GEMINI) {
      if (!model) throw new Error('Gemini selected but model not initialized. Set USE_GEMINI=true and GEMINI_API_KEY.')
      const result = await model.generateContent(prompt)
      const response = await result.response
      text = response.text().trim()
      console.log('Gemini raw output:', text)
    } else {
      // Ollama: /api/generate returns: { response: "..." }
      const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          options: {
            temperature: 0.2,
          },
        }),
      })

      if (!ollamaRes.ok) {
        const errText = await ollamaRes.text().catch(() => '')
        throw new Error(`Ollama request failed (${ollamaRes.status}): ${errText}`)
      }

      const data = await ollamaRes.json()
      text = (data.response || '').trim()
      console.log('Ollama raw output:', text)
    }

    // Aggressively strip markdown fences
    text = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()


    // If Gemini wraps in extra text, extract just the JSON array
    const arrayStart = text.indexOf('[')
    const arrayEnd = text.lastIndexOf(']')
    if (arrayStart !== -1 && arrayEnd !== -1) {
      text = text.slice(arrayStart, arrayEnd + 1)
    }

    let issues
    try {
      issues = JSON.parse(text)
    } catch (err) {
      console.error('JSON parse failed:', err.message)
      console.error('Raw text was:', text)
      return res.status(500).json({ error: 'Gemini returned invalid JSON', raw: text })
    }

    if (!Array.isArray(issues)) issues = [issues]

    // Normalize severity/category in case Gemini capitalizes or misspells
    issues = issues.map(issue => ({
      ...issue,
      severity: (issue.severity || 'info').toLowerCase().trim(),
      category: (issue.category || 'style').toLowerCase().trim(),
    }))

    console.log(`✅ Found ${issues.length} issues`)
    res.json({ issues })

  } catch (err) {
    console.error('Server error:', err)
    res.status(500).json({ error: 'Review failed: ' + err.message })
  }
})

// ─── /api/fetch-pr ─────────────────────────────────────────────
app.post('/api/fetch-pr', async (req, res) => {
  const { prUrl } = req.body
  if (!prUrl) return res.status(400).json({ error: 'No URL provided' })

  try {
    // Case 1: GitHub PR — github.com/owner/repo/pull/123
    const prMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
    if (prMatch) {
      const [, owner, repo, prNumber] = prMatch
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
        { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'CodeReviewAI' } }
      )
      const files = await response.json()
      if (!Array.isArray(files)) return res.status(400).json({ error: 'Could not fetch PR. Make sure it is a public repo.' })
      const combined = files
        .slice(0, 5)
        .map(f => `// File: ${f.filename}\n${f.patch || '// (binary or no diff)'}`)
        .join('\n\n')
      return res.json({ code: combined, fileCount: files.length, type: 'pr' })
    }

    // Case 2: GitHub file blob — github.com/owner/repo/blob/branch/path/file.py
    const blobMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/)
    if (blobMatch) {
      const [, owner, repo, branch, filePath] = blobMatch
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`
      const response = await fetch(rawUrl)
      if (!response.ok) return res.status(400).json({ error: 'Could not fetch file. Make sure the repo is public.' })
      const code = await response.text()
      const filename = filePath.split('/').pop()
      return res.json({ code: code.slice(0, 8000), fileCount: 1, type: 'file', filename })
    }

    // Case 3: GitHub repo — github.com/owner/repo
    const repoMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/?$/)
    if (repoMatch) {
      const [, owner, repo] = repoMatch
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
        { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'CodeReviewAI' } }
      )
      const treeData = await treeRes.json()
      if (!treeData.tree) return res.status(400).json({ error: 'Could not fetch repo.' })

      const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c']
      const codeFiles = treeData.tree
        .filter(f => f.type === 'blob' && codeExtensions.some(ext => f.path.endsWith(ext)))
        .slice(0, 3)

      if (codeFiles.length === 0) return res.status(400).json({ error: 'No code files found in this repo.' })

      const fileContents = await Promise.all(
        codeFiles.map(async f => {
          const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${f.path}`)
          const text = await r.text()
          return `// File: ${f.path}\n${text.slice(0, 2000)}`
        })
      )
      return res.json({ code: fileContents.join('\n\n'), fileCount: codeFiles.length, type: 'repo' })
    }

    return res.status(400).json({ error: 'Could not parse URL. Paste a GitHub PR, file, or repo URL.' })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error: ' + err.message })
  }
})

app.listen(3001, () => console.log('✅ Server running on http://localhost:3001'))