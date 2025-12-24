# MCP Tools Integration - AI Resume Tailor

## 🚀 Available Tools

### 1. **ATS Simulator** 🔍
**Endpoint:** `/api/tools/ats-simulator`

Simulates how major ATS systems (Workday, Taleo, Greenhouse, Lever) parse resumes.

**Features:**
- Contact information extraction
- Skills parsing
- Work experience parsing
- Education parsing
- Keywords detection
- Formatting issue detection
- ATS compatibility score (0-100)

**Input:** Resume text
**Output:** Parsed data, issues, recommendations, ATS score

---

### 2. **Keyword Analyzer** 🔑
**Endpoint:** `/api/tools/keyword-analyzer`

Extracts industry-specific keywords from job descriptions.

**Features:**
- Technical skills extraction
- Soft skills identification
- Industry-specific terms
- Certifications & qualifications
- Action verbs
- Power words
- Missing keywords analysis
- Keyword recommendations

**Input:** Job description, optional industry
**Output:** Categorized keywords, missing keywords, recommendations

---

### 3. **Skills Gap Analyzer** 📊
**Endpoint:** `/api/tools/skills-gap`

Compares candidate skills vs job requirements.

**Features:**
- Match score calculation
- Matched skills identification
- Missing skills analysis
- Extra skills value assessment
- Experience gap analysis
- Education gap analysis
- Certification gap analysis
- Personalized action plan
- Strengths & weaknesses identification

**Input:** Resume + Job description
**Output:** Gap analysis, action plan, match score

---

### 4. **Interview Prep Generator** 💼
**Endpoint:** `/api/tools/interview-prep`

Generates comprehensive interview preparation materials.

**Features:**
- Behavioral interview questions (STAR method)
- Technical interview questions
- Situational questions
- Questions to ask interviewer
- Key talking points from resume
- Red flags to address
- Interview tips

**Input:** Job description, optional resume
**Output:** Question sets, talking points, tips

---

### 5. **Format Validator** ✅
**Endpoint:** `/api/tools/format-validator`

Validates resume formatting for ATS compatibility.

**Features:**
- ATS compatibility check
- Formatting issue detection
- Structure validation
- File format recommendations
- Parsing accuracy estimation
- Issue severity classification
- Fix recommendations

**Input:** Resume text
**Output:** Compatibility score, issues, recommendations

---

## 🤖 AI Models Used

All tools use **Google Gemini 2.0 Flash** models:

- **Main Operations:** `gemini-2.0-flash` (full-featured)
- **Light Operations:** `gemini-2.0-flash-lite` (faster, cost-effective)

### Model Selection Strategy:
- **Heavy Analysis:** ATS Simulator, Skills Gap, Interview Prep → `gemini-2.0-flash`
- **Quick Analysis:** Keyword Analyzer, Format Validator → `gemini-2.0-flash-lite`

---

## 🎨 Integration

### Tools Panel Component
Located in: `src/app/components/ToolsPanel.tsx`

**Features:**
- Visual tool cards with status indicators
- One-click tool execution
- Real-time loading states
- Results display
- "Run All Available" functionality
- Automatic chat integration

### Chat Integration
Tools automatically send results to chat interface when executed.

---

## 📊 Usage Examples

### Example 1: ATS Simulation
```typescript
POST /api/tools/ats-simulator
{
  "resume": "John Doe\nSoftware Engineer..."
}

Response:
{
  "atsScore": 85,
  "parsedData": { ... },
  "issues": [ ... ],
  "recommendations": [ ... ]
}
```

### Example 2: Skills Gap Analysis
```typescript
POST /api/tools/skills-gap
{
  "resume": "...",
  "jobDescription": "..."
}

Response:
{
  "matchScore": 72,
  "skills": {
    "matched": [ ... ],
    "missing": [ ... ],
    "extra": [ ... ]
  },
  "actionPlan": [ ... ]
}
```

---

## 🔮 Future Tools (Planned)

1. **Company Research Tool** - Get company insights, culture, benefits
2. **Salary Range Estimator** - Based on role, location, experience
3. **Career Path Mapper** - Suggest next steps in career
4. **Resume Version Control** - Track changes across versions
5. **Cover Letter Generator** - AI-powered cover letter creation
6. **Network Analyzer** - LinkedIn connection analysis
7. **Job Board Aggregator** - Search multiple job boards
8. **Application Tracker** - Track application status

---

## 🛠️ Technical Details

- **Runtime:** Edge (Vercel Edge Functions)
- **Region:** Auto (optimal performance)
- **Max Duration:** 60 seconds
- **Error Handling:** Comprehensive fallbacks
- **Type Safety:** Full TypeScript support

---

## 📈 Performance

- **Average Response Time:** 2-5 seconds
- **Concurrent Requests:** Supported
- **Rate Limiting:** Per-tool basis
- **Caching:** Results cached in component state

---

## 🔐 Security

- API keys stored in environment variables
- Input validation on all endpoints
- Error messages sanitized
- No sensitive data logging

---

## 🎯 Best Practices

1. **Run ATS Simulator first** - Understand parsing issues
2. **Use Keyword Analyzer** - Before tailoring resume
3. **Skills Gap Analysis** - Identify improvement areas
4. **Format Validator** - Before final submission
5. **Interview Prep** - After getting interview

---

## 📝 Notes

- All tools are production-ready
- Models are using latest Gemini 2.0 versions
- Tools integrate seamlessly with chat interface
- Results are automatically formatted for readability

