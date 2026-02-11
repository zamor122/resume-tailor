# Test Coverage for Centralized Prompts

This document outlines the test coverage for all prompt functions and API routes that use them.

## Prompt Unit Tests

All prompt functions have unit tests in `tests/unit/prompts/`:

### ✅ Tailoring Prompts (`tailoring.test.ts`)
- `getTailoringPrompt()` - Tests with all parameters, empty missing keywords, and prompt structure

### ✅ Evaluation Prompts (`evaluation.test.ts`)
- `getRelevancyScorePrompt()` - Tests relevancy scoring prompt
- `getResumeValidationPrompt()` - Tests validation prompt
- `getAIDetectionPrompt()` - Tests AI detection prompt with text truncation

### ✅ Utility Prompts (`utils.test.ts`)
- `getJobTitleExtractionPrompt()` - Tests job title extraction
- `getCompanyExtractionPrompt()` - Tests company extraction
- `getCompanyResearchPrompt()` - Tests company research
- `getJobDescriptionEnhancementPrompt()` - Tests job description enhancement
- `getDiffExplanationPrompt()` - Tests diff explanation with changes array

### ✅ Tool Prompts (`tools.test.ts`)
- `getKeywordAnalyzerPrompt()` - Tests with/without industry
- `getSkillsGapPrompt()` - Tests skills gap analysis
- `getMultiJobComparisonPrompt()` - Tests multi-job comparison
- `getATSOptimizerPrompt()` - Tests with/without current score
- `getATSSimulatorPrompt()` - Tests ATS simulation
- `getInterviewPrepPrompt()` - Tests with/without resume
- `getResumeStorytellerPrompt()` - Tests with/without job description
- `getResumeVersionAnalysisPrompt()` - Tests version analysis
- `getResumeVersionComparisonPrompt()` - Tests version comparison
- `getSkillsMarketValuePrompt()` - Tests with/without location/industry
- `getFormatValidatorPrompt()` - Tests format validation

## API Route Tests

### ✅ Routes with Tests
1. **`/api/tailor`** - `tests/api/tailor.test.ts`
   - Tests resume tailoring (forwards to `/api/humanize/stream` using `getTailoringPrompt`)

2. **`/api/tailor/job/title`** - `tests/api/tailor/job/title.test.ts`
   - Tests job title extraction using `getJobTitleExtractionPrompt()`

3. **`/api/validate-resume`** - `tests/api/validate-resume.test.ts`
   - Tests resume validation using `getResumeValidationPrompt()`

4. **`/api/ai-detection`** - `tests/api/ai-detection.test.ts`
   - Tests AI detection using `getAIDetectionPrompt()`

5. **`/api/tools/ats-simulator`** - `tests/api/tools/ats-simulator.test.ts`
   - Tests ATS simulation using `getATSSimulatorPrompt()`

6. **`/api/tools/keyword-analyzer`** - `tests/api/tools/keyword-analyzer.test.ts`
   - Tests keyword analysis using `getKeywordAnalyzerPrompt()`

7. **`/api/resume/retrieve`** - `tests/api/resume/retrieve.test.ts`
   - Tests free-resume and paid access logic

8. **`/api/resume/list`** - `tests/api/resume/list.test.ts`
   - Tests isUnlocked in response for free resumes

### ⚠️ Routes Using Prompts (No Tests Yet)
These routes use centralized prompts but don't have dedicated tests yet:
- `/api/humanize` - Uses `getTailoringPrompt()`
- `/api/humanize/stream` - Uses `getTailoringPrompt()`
- `/api/research-company` - Uses `getCompanyExtractionPrompt()`, `getCompanyResearchPrompt()`, `getJobDescriptionEnhancementPrompt()`
- `/api/tools/skills-gap` - Uses `getSkillsGapPrompt()`
- `/api/tools/multi-job-comparison` - Uses `getMultiJobComparisonPrompt()`
- `/api/tools/ats-optimizer` - Uses `getATSOptimizerPrompt()`
- `/api/tools/interview-prep` - Uses `getInterviewPrepPrompt()`
- `/api/tools/resume-storyteller` - Uses `getResumeStorytellerPrompt()`
- `/api/tools/resume-versions` - Uses `getResumeVersionAnalysisPrompt()`, `getResumeVersionComparisonPrompt()`
- `/api/tools/skills-market-value` - Uses `getSkillsMarketValuePrompt()`
- `/api/tools/format-validator` - Uses `getFormatValidatorPrompt()`

## Running Tests

```bash
# Run all prompt unit tests
npm run test -- tests/unit/prompts

# Run all API tests
npm run test -- tests/api

# Run specific test file
npm run test -- tests/api/tailor.test.ts

# Run all tests
npm run test
```

## Test Status

✅ **All prompt unit tests passing**
✅ **All existing API tests updated and passing** (222 tests total)
⚠️ **Some API routes need tests** (see list above)



