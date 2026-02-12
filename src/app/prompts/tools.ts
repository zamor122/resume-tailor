/**
 * CENTRALIZED PROMPTS - TOOLS & ANALYSIS
 * 
 * This file contains all prompts for various analysis tools.
 * Used by: /api/tools/* routes
 */

/**
 * Keyword analyzer prompt
 * Used by: /api/tools/keyword-analyzer/route.ts
 */
export function getKeywordAnalyzerPrompt(jobDescription: string, industry?: string): string {
  return `
      Analyze the following job description and extract industry-specific keywords that are critical for recruiters and job match.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact numbers, frequencies, and specific resume sections.
      - Require keyword frequency counts (exact number of occurrences)
      - Provide synonyms and alternative terms (exact terms)
      - Specify exact resume sections where keywords should appear
      - Include keyword importance scores (0-100)
      - Provide natural incorporation examples
      
      ${industry ? `Industry: ${industry}` : ''}
      
      Extract and categorize:
      1. Technical Skills (programming languages, tools, technologies)
      2. Soft Skills (communication, leadership, etc.)
      3. Industry-Specific Terms (domain knowledge, methodologies)
      4. Certifications & Qualifications
      5. Experience Level Indicators (junior, senior, lead, etc.)
      6. Action Verbs (managed, developed, implemented, etc.)
      7. Power Words (high-impact terms that stand out)
      
      For each keyword, provide:
      - The keyword/phrase (exact term)
      - Importance level (critical, high, medium, low)
      - Importance score (0-100)
      - Frequency in job description (exact count)
      - Alternative terms/synonyms (exact terms)
      - Recommended resume sections (specific sections)
      - Incorporation example (exact phrase or sentence)
      
      Return ONLY a JSON object with this exact format:
      {
        "keywords": {
          "technical": [
            {
              "term": "<exact keyword>",
              "importance": "<critical|high|medium|low>",
              "importanceScore": <number 0-100>,
              "frequency": <exact number of occurrences>,
              "synonyms": ["<exact synonym1>", "<exact synonym2>"],
              "recommendedSections": ["<section1>", "<section2>"],
              "incorporationExample": "<exact phrase showing how to use>"
            }
          ],
          "soft": [...],
          "industry": [...],
          "certifications": [...],
          "actionVerbs": [...],
          "powerWords": [...]
        },
        "keywordDensity": {
          "totalKeywords": <number>,
          "criticalKeywords": <number>,
          "averageFrequency": <number>,
          "mostFrequent": [{"keyword": "<term>", "count": <number>}, ...]
        },
        "missingFromResume": [
          {
            "keyword": "<keyword>",
            "importance": "<critical|high|medium|low>",
            "importanceScore": <number 0-100>,
            "recommendedSections": ["<section1>", ...],
            "incorporationExample": "<exact phrase>"
          }
        ],
        "recommendations": [
          {
            "keyword": "<keyword>",
            "reason": "<specific reason why it's important>",
            "suggestion": "<specific action: exact section and example phrase>",
            "expectedImpact": "<how this improves job match>",
            "priority": "<critical|high|medium|low>"
          }
        ],
        "industryBenchmark": {
          "industryAverage": <number of keywords typically found>,
          "thisJob": <number of keywords found>,
          "comparison": "<above|at|below average>"
        },
        "industry": "<detected or provided industry>",
        "experienceLevel": "<entry|mid|senior|executive>"
      }
      
      Job Description:
      ${jobDescription.substring(0, 8000)}
    `;
}

/**
 * Skills gap analysis prompt
 * Used by: /api/tools/skills-gap/route.ts
 */
export function getSkillsGapPrompt(resume: string, jobDescription: string): string {
  return `
      Analyze the skills gap between a candidate's resume and a job description.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact percentages, timeframes, and concrete learning resources.
      - Require specific skill gap percentages (e.g., "67% match", not "good match")
      - Provide exact learning resources (course names, certification names, book titles, URLs)
      - Include time estimates to acquire each skill (e.g., "3-6 months", "2 weeks")
      - Calculate match score breakdown by category with percentages
      - Provide specific evidence from resume for matched skills
      
      Compare:
      1. Required skills in job description vs skills in resume
      2. Experience level requirements vs actual experience
      3. Education requirements vs actual education
      4. Certifications required vs certifications held
      5. Industry knowledge gaps
      
      Return ONLY a JSON object with this exact format:
      {
        "matchScore": <number 0-100, overall match percentage>,
        "matchBreakdown": {
          "skills": <number 0-100, skills match %>,
          "experience": <number 0-100, experience match %>,
          "education": <number 0-100, education match %>,
          "certifications": <number 0-100, certifications match %>
        },
        "skills": {
          "matched": [
            {
              "skill": "<exact skill name>",
              "level": "<beginner|intermediate|advanced|expert>",
              "matchConfidence": <number 0-100>,
              "evidence": "<exact text from resume showing this skill>",
              "section": "<section where found>"
            }
          ],
          "missing": [
            {
              "skill": "<exact required skill>",
              "importance": "<critical|high|medium|low>",
              "importanceScore": <number 0-100>,
              "alternatives": [
                {
                  "skill": "<similar skill in resume>",
                  "relevance": <number 0-100, how relevant as alternative>
                }
              ],
              "learningPath": {
                "timeEstimate": "<exact time, e.g., '3-6 months', '2 weeks'>",
                "resources": [
                  {
                    "type": "<course|certification|book|tutorial>",
                    "name": "<exact name>",
                    "provider": "<provider name>",
                    "url": "<URL if available>",
                    "cost": "<cost estimate>",
                    "duration": "<duration>"
                  }
                ],
                "steps": ["<step1>", "<step2>", ...]
              }
            }
          ],
          "extra": [
            {
              "skill": "<skill in resume but not required>",
              "value": "<specific value: how this adds value to application>",
              "highlight": <boolean, should highlight this>
            }
          ]
        },
        "experience": {
          "required": "<exact years or level (e.g., '5+ years', 'Senior level')>",
          "actual": "<exact years or level from resume>",
          "gap": "<exact difference, e.g., '-2 years', '+1 year'>",
          "matchPercentage": <number 0-100>,
          "compensatingFactors": [
            {
              "factor": "<specific factor>",
              "impact": "<how this compensates>",
              "evidence": "<evidence from resume>"
            }
          ]
        },
        "education": {
          "required": "<exact degree/qualification>",
          "actual": "<exact degree/qualification from resume>",
          "meetsRequirement": <boolean>,
          "matchPercentage": <number 0-100>,
          "alternatives": [
            {
              "qualification": "<alternative>",
              "relevance": <number 0-100>
            }
          ]
        },
        "certifications": {
          "required": [
            {
              "cert": "<exact certification name>",
              "importance": "<critical|high|medium|low>"
            }
          ],
          "held": ["<exact cert1>", ...],
          "missing": [
            {
              "cert": "<exact certification name>",
              "importance": "<critical|high|medium|low>",
              "timeToObtain": "<time estimate>",
              "cost": "<cost estimate>",
              "provider": "<certification provider>"
            }
          ],
          "recommendations": [
            {
              "cert": "<certification name>",
              "priority": "<high|medium|low>",
              "reason": "<why recommended>",
              "timeToObtain": "<time estimate>",
              "cost": "<cost estimate>"
            }
          ]
        },
        "actionPlan": [
          {
            "priority": "<critical|high|medium|low>",
            "action": "<specific action to take>",
            "skill": "<skill or area>",
            "timeline": "<exact timeline, e.g., '2 weeks', '3-6 months'>",
            "resources": [
              {
                "type": "<course|certification|book|tutorial>",
                "name": "<exact resource name>",
                "provider": "<provider>",
                "url": "<URL>",
                "cost": "<cost>",
                "duration": "<duration>"
              }
            ],
            "expectedImpact": "<how this improves match score>"
          }
        ],
        "strengths": [
          {
            "strength": "<specific strength>",
            "evidence": "<evidence from resume>",
            "impact": "<how this helps application>"
          }
        ],
        "weaknesses": [
          {
            "weakness": "<specific weakness>",
            "impact": "<how this hurts application>",
            "mitigation": "<how to address>"
          }
        ],
        "estimatedTimeToCloseGaps": "<total time estimate to close all critical gaps>"
      }
      
      Resume:
      ${resume.substring(0, 5000)}
      
      Job Description:
      ${jobDescription.substring(0, 5000)}
    `;
}

/**
 * Multi-job comparison prompt
 * Used by: /api/tools/multi-job-comparison/route.ts
 */
export function getMultiJobComparisonPrompt(resume: string, jobDescs: any[]): string {
  return `
      Compare this resume against multiple job descriptions simultaneously and provide comprehensive insights.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact match scores, percentages, and specific recommendations.
      - Require specific match scores for each job (0-100 with breakdown)
      - Provide common skill/requirement analysis with exact percentages
      - Include versatility score calculation with methodology
      - Suggest resume versions for different job clusters with specific changes
      - Provide specific optimization strategies with expected improvements
      
      Resume:
      ${resume.substring(0, 5000)}
      
      Job Descriptions:
      ${jobDescs.map((job: any, index: number) => {
        const jobText = typeof job === 'string' ? job : (job.description || job.title || JSON.stringify(job));
        return `Job ${index + 1}:\n${jobText.substring(0, 2000)}`;
      }).join('\n\n---\n\n')}
      
      Return ONLY a JSON object:
      {
        "overallAnalysis": {
          "bestMatch": <job index (0-based)>,
          "worstMatch": <job index>,
          "averageMatch": <number 0-100>,
          "matchRange": "<low-high>",
          "versatility": <number 0-100, how well resume fits multiple roles>
        },
        "jobComparisons": [
          {
            "jobIndex": <number>,
            "jobTitle": "<exact job title>",
            "matchScore": <number 0-100, exact score>,
            "matchBreakdown": {
              "skills": <number 0-100>,
              "experience": <number 0-100>,
              "education": <number 0-100>,
              "keywords": <number 0-100>
            },
            "strengths": [
              {
                "strength": "<specific strength>",
                "evidence": "<evidence from resume>",
                "impact": "<how this helps>"
              }
            ],
            "gaps": [
              {
                "gap": "<specific gap>",
                "importance": "<critical|high|medium|low>",
                "impact": "<how this hurts match>"
              }
            ],
            "uniqueRequirements": [
              {
                "requirement": "<exact requirement>",
                "inResume": <boolean>,
                "importance": "<critical|high|medium|low>"
              }
            ],
            "commonRequirements": [
              {
                "requirement": "<exact requirement>",
                "frequency": <number, how many jobs require this>,
                "inResume": <boolean>
              }
            ],
            "recommendations": [
              {
                "recommendation": "<specific recommendation>",
                "priority": "<high|medium|low>",
                "expectedImprovement": <points added to score>
              }
            ]
          }
        ],
        "commonThemes": {
          "requiredSkills": ["skill1", ...],
          "commonKeywords": ["keyword1", ...],
          "sharedRequirements": ["req1", ...],
          "industryTrends": ["trend1", ...]
        },
        "optimizationStrategy": {
          "universalImprovements": [
            {
              "action": "<specific action>",
              "impact": "<specific impact on all jobs, e.g., '+5 points average'>",
              "priority": "<critical|high|medium|low>",
              "implementation": "<how to implement>",
              "timeEstimate": "<time to implement>"
            }
          ],
          "jobSpecificOptimizations": [
            {
              "jobIndex": <number>,
              "optimizations": [
                {
                  "optimization": "<specific optimization>",
                  "action": "<exact action to take>",
                  "expectedImprovement": <exact points added>,
                  "example": "<before> → <after>"
                }
              ],
              "expectedImprovement": <exact score increase>
            }
          ],
          "resumeVersions": [
            {
              "version": "<exact version name>",
              "targetJobs": [<exact job indices>],
              "keyChanges": [
                {
                  "change": "<specific change>",
                  "section": "<section name>",
                  "before": "<current text>",
                  "after": "<new text>",
                  "reason": "<why this helps these jobs>"
                }
              ],
              "expectedMatch": <exact average score>,
              "versatilityScore": <number 0-100>
            }
          ]
        },
        "insights": {
          "careerFit": "<analysis>",
          "marketPositioning": "<analysis>",
          "skillGaps": ["gap1", ...],
          "opportunities": ["opp1", ...]
        },
        "recommendations": [
          {
            "type": "<universal|specific>",
            "priority": "<high|medium|low>",
            "recommendation": "<recommendation>",
            "appliesTo": [<job indices or "all">]
          }
        ]
      }
    `;
}

/**
 * Job match optimizer prompt
 * Used by: /api/tools/ats-optimizer/route.ts
 */
export function getATSOptimizerPrompt(resume: string, jobDescription: string, currentScore?: number): string {
  return `
      You are a resume optimization expert. Analyze this resume and provide REAL-TIME, ACTIONABLE suggestions to improve its job match score.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact numbers, percentages, timeframes, and concrete examples.
      - Require specific score improvements per action (e.g., "+5 points", not "improves score")
      - Provide exact before/after examples with full text
      - Include time estimates for each fix (e.g., "2 minutes", "15 minutes")
      - Calculate ROI (score gain / time invested)
      
      Current Job Match Score: ${currentScore || "Not provided"}
      
      ${jobDescription ? `Target Job Description:\n${jobDescription.substring(0, 3000)}\n\n` : ''}
      
      Resume:
      ${resume.substring(0, 8000)}
      
      Return ONLY a JSON object:
      {
        "currentScore": ${currentScore || 0},
        "projectedScore": <number 0-100 after implementing all suggestions>,
        "quickWins": [
          {
            "priority": "<critical|high|medium|low>",
            "action": "<specific action to take>",
            "location": "<exact location: section name, line number, or character position>",
            "impact": <number, exact points added to score (e.g., 5, 10, 15)>,
            "effort": "<low|medium|high>",
            "timeEstimate": "<specific time estimate, e.g., '2 minutes', '15 minutes', '1 hour'>",
            "roi": <number, impact points per minute>,
            "before": "<exact current text>",
            "after": "<exact improved text>",
            "reason": "<why this improves job match>"
          }
        ],
        "keywordOptimization": {
          "missing": [
            {
              "keyword": "<keyword>",
              "importance": "<critical|high|medium|low>",
              "expectedImpact": <points added>,
              "suggestedLocations": ["<section1>", "<section2>"]
            }
          ],
          "underused": [
            {
              "keyword": "<keyword>",
              "currentCount": <exact number>,
              "recommendedCount": <exact number>,
              "whereToAdd": "<specific section or location>",
              "context": "<exact phrase or sentence showing how to naturally incorporate>",
              "expectedImpact": <points added>
            }
          ],
          "overused": [
            {
              "keyword": "<keyword>",
              "currentCount": <exact number>,
              "recommendedCount": <exact number>,
              "whereToRemove": "<specific location>",
              "reason": "<why reducing helps>"
            }
          ]
        },
        "formatting": {
          "issues": [
            {
              "type": "<issue type>",
              "severity": "<critical|high|medium|low>",
              "description": "<specific issue description>",
              "location": "<exact location: line number, section, or character position>",
              "fix": "<exact fix with full text example>",
              "before": "<current problematic text>",
              "after": "<fixed text>",
              "impact": <points added>,
              "timeEstimate": "<time to fix>"
            }
          ]
        },
        "structure": {
          "sections": ["<section1>", ...],
          "missingSections": [
            {
              "section": "<section name>",
              "importance": "<critical|high|medium|low>",
              "expectedImpact": <points added>,
              "suggestedContent": "<example content>"
            }
          ],
          "order": "<optimal|suboptimal>",
          "recommendedOrder": ["<section1>", "<section2>", ...],
          "expectedImpact": <points added if reordered>
        },
        "content": {
          "strengths": ["<specific strength>", ...],
          "weaknesses": ["<specific weakness>", ...],
          "suggestions": [
            {
              "section": "<section name>",
              "current": "<exact current content snippet>",
              "improved": "<exact improved version>",
              "reason": "<specific reason why this is better for ATS>",
              "impact": <points added>
            }
          ]
        },
        "implementationPlan": [
          {
            "step": <number>,
            "action": "<specific action>",
            "estimatedTime": "<exact time estimate, e.g., '2 minutes'>",
            "expectedImpact": <exact points added>,
            "priority": "<critical|high|medium|low>",
            "dependencies": ["<step numbers this depends on>"]
          }
        ],
        "priorityMatrix": {
          "highImpactLowEffort": [<quick win indices>],
          "highImpactHighEffort": [<indices>],
          "lowImpactLowEffort": [<indices>],
          "lowImpactHighEffort": [<indices>]
        }
      }
    `;
}

/**
 * ATS simulator prompt
 * Used by: /api/tools/ats-simulator/route.ts
 */
export function getATSSimulatorPrompt(resume: string): string {
  return `
      You are an ATS (Applicant Tracking System) simulator. Analyze the following resume as if you were parsing it through real ATS systems.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact numbers, line references, and ATS system names.
      Use numeric digits only for all numeric fields (e.g. count: 9 not count: nine). All values must be valid JSON.
      OUTPUT LIMITS (to ensure complete response): List up to 25 most relevant skills; limit each experience description to 200 characters; provide up to 8 issues; provide up to 5 recommendations.
      
      Simulate how major ATS systems (Workday, Taleo, Greenhouse, Lever, iCIMS, Bullhorn) would parse this resume.
      
      Analyze:
      1. Contact Information Extraction (name, email, phone, location) - Provide parsing confidence % for each field
      2. Skills Extraction (technical skills, soft skills) - List exact skills found and confidence %
      3. Work Experience Parsing (job titles, companies, dates, descriptions) - Specify which sections parse correctly/incorrectly
      4. Education Parsing (degrees, institutions, dates) - Provide parsing accuracy %
      5. Keywords Detection (industry keywords, technologies) - Count occurrences
      6. Formatting Issues (headers, sections, bullet points) - Provide specific line numbers or section names
      7. ATS Compatibility Score (0-100) - Calculate based on specific criteria
      
      Return ONLY a JSON object with this exact format:
      {
        "atsScore": <number 0-100>,
        "parsingAccuracy": <number 0-100, overall parsing confidence>,
        "atsSystemCompatibility": {
          "workday": {"compatible": <boolean>, "score": <number 0-100>, "issues": ["issue1", ...]},
          "taleo": {"compatible": <boolean>, "score": <number 0-100>, "issues": ["issue1", ...]},
          "greenhouse": {"compatible": <boolean>, "score": <number 0-100>, "issues": ["issue1", ...]},
          "lever": {"compatible": <boolean>, "score": <number 0-100>, "issues": ["issue1", ...]}
        },
        "parsedData": {
          "contactInfo": {
            "name": "<extracted name or null>",
            "email": "<extracted email or null>",
            "phone": "<extracted phone or null>",
            "location": "<extracted location or null>",
            "parsingConfidence": {"name": <number 0-100>, "email": <number 0-100>, "phone": <number 0-100>, "location": <number 0-100>}
          },
          "skills": [
            {"skill": "<skill name>", "confidence": <number 0-100>, "source": "<where found>"}
          ],
          "experience": [
            {
              "title": "<job title>",
              "company": "<company name>",
              "dates": "<date range>",
              "description": "<parsed description, max 200 chars>",
              "parsingAccuracy": <number 0-100>,
              "sectionParsed": <boolean>
            }
          ],
          "education": [
            {
              "degree": "<degree>",
              "institution": "<institution>",
              "dates": "<date range>",
              "parsingAccuracy": <number 0-100>
            }
          ]
        },
        "sectionAnalysis": {
          "header": {"parsed": <boolean>, "accuracy": <number 0-100>, "issues": ["issue1", ...]},
          "experience": {"parsed": <boolean>, "accuracy": <number 0-100>, "issues": ["issue1", ...]},
          "education": {"parsed": <boolean>, "accuracy": <number 0-100>, "issues": ["issue1", ...]},
          "skills": {"parsed": <boolean>, "accuracy": <number 0-100>, "issues": ["issue1", ...]}
        },
        "issues": [
          {"type": "<formatting|missing|unparseable>", "severity": "<critical|high|medium|low>", "description": "<specific issue>", "location": "<line/section>", "atsSystemsAffected": ["<ATS names>"], "recommendation": "<fix>", "impact": "<score impact>"}
        ],
        "keywords": [
          {"keyword": "<keyword>", "count": <integer 0-99>, "importance": "<critical|high|medium|low>"}
        ],
        "recommendations": [
          {"priority": "<critical|high|medium|low>", "action": "<action>", "expectedImprovement": <number>, "example": "<before> → <after>"}
        ]
      }
      
      Resume to analyze:
      ${resume.substring(0, 10000)}
    `;
}

/**
 * Interview prep prompt
 * Used by: /api/tools/interview-prep/route.ts
 */
export function getInterviewPrepPrompt(resume: string, jobDescription: string): string {
  return `
      Generate comprehensive interview preparation materials based on a job description and candidate resume.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include complete examples from the candidate's resume.
      - Require specific examples from candidate's resume (exact achievements, projects, experiences)
      - Provide complete STAR responses, not just frameworks (full Situation, Task, Action, Result)
      - Include difficulty ratings and specific answer approaches
      - Reference specific resume achievements with exact details
      - Provide concrete talking points with evidence from resume
      
      ${resume ? `Candidate Resume:\n${resume.substring(0, 3000)}\n\n` : ''}
      
      Create:
      1. Behavioral interview questions (STAR method) - with complete example responses
      2. Technical interview questions (if applicable) - with answer approaches
      3. Situational questions - with specific scenarios
      4. Questions to ask the interviewer - tailored to this role
      5. Key talking points from resume - with exact evidence
      6. Potential red flags to address - with specific mitigation strategies
      
      Return ONLY a JSON object with this exact format:
      {
        "behavioral": [
          {
            "question": "<exact question>",
            "why": "<specific reason why they might ask this based on job description>",
            "starFramework": {
              "situation": "<complete situation from candidate's resume with specific details>",
              "task": "<specific task or challenge from candidate's experience>",
              "action": "<exact actions candidate took from their resume>",
              "result": "<specific, quantifiable results from candidate's resume>"
            },
            "completeExample": "<full STAR response using candidate's actual experience>",
            "tips": ["<specific tip1>", ...],
            "keywords": ["<keywords to include>", ...]
          }
        ],
        "technical": [
          {
            "question": "<exact technical question>",
            "category": "<exact category, e.g., 'System Design', 'Algorithms', 'Database'>",
            "difficulty": "<easy|medium|hard>",
            "answer": "<specific answer approach with steps>",
            "answerFramework": "<structured approach to answer>",
            "resources": [
              {
                "type": "<article|video|course|book>",
                "name": "<exact resource name>",
                "url": "<URL if available>"
              }
            ],
            "relatedToResume": <boolean, if relates to candidate's experience>,
            "resumeConnection": "<how to connect to candidate's experience>"
          }
        ],
        "situational": [
          {
            "question": "<exact situational question>",
            "scenario": "<specific scenario description>",
            "approach": "<specific approach with steps>",
            "exampleFromResume": "<similar situation from candidate's resume if applicable>",
            "keyPoints": ["<point1>", ...]
          }
        ],
        "questionsToAsk": [
          {
            "question": "<exact question to ask>",
            "category": "<culture|role|growth|team|compensation>",
            "why": "<specific reason why this is a good question for this role>",
            "followUp": "<potential follow-up question>"
          }
        ],
        "talkingPoints": [
          {
            "point": "<specific talking point>",
            "evidence": "<exact evidence from resume with details>",
            "impact": "<specific way to present this with numbers/metrics>",
            "whenToUse": "<when in interview to bring this up>"
          }
        ],
        "redFlags": [
          {
            "issue": "<specific potential concern>",
            "evidence": "<what in resume might raise this concern>",
            "howToAddress": "<specific strategy to address it>",
            "positiveSpin": "<exact positive way to frame>",
            "preparation": "<how to prepare for this question>"
          }
        ],
        "interviewTips": [
          "<tip1>",
          "<tip2>",
          ...
        ]
      }
      
      Job Description:
      ${jobDescription.substring(0, 5000)}
    `;
}

/**
 * Resume storyteller prompt
 * Used by: /api/tools/resume-storyteller/route.ts
 */
export function getResumeStorytellerPrompt(resume: string, jobDescription?: string): string {
  return `
      Transform this resume into a compelling narrative that tells a story while maintaining professionalism and ATS compatibility.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact before/after examples for each section.
      - Require specific before/after examples for each section (full text, not summaries)
      - Provide narrative arc with concrete examples from the resume
      - Include storytelling technique explanations with exact examples
      - Show quantifiable achievement enhancements with specific numbers
      - Maintain ATS compatibility (keep keywords, structure)
      
      ${jobDescription ? `Target Job:\n${jobDescription.substring(0, 2000)}\n\n` : ''}
      
      Current Resume:
      ${resume.substring(0, 6000)}
      
      Analyze and enhance:
      1. Narrative flow and coherence (specific improvements)
      2. Impact storytelling (quantifiable achievements with exact numbers)
      3. Career progression narrative (specific progression story)
      4. Value proposition clarity (exact value statement)
      5. Emotional connection (while staying professional)
      6. Unique differentiators (specific differentiators)
      
      Return ONLY a JSON object:
      {
        "narrativeScore": <number 0-100, how compelling the story is>,
        "currentNarrative": {
          "theme": "<current career theme>",
          "strengths": ["strength1", ...],
          "weaknesses": ["weakness1", ...],
          "flow": "<smooth|choppy|inconsistent>"
        },
        "enhancedSections": [
          {
            "section": "<exact section name>",
            "original": "<complete original text from resume>",
            "enhanced": "<complete enhanced version with better storytelling>",
            "improvements": ["<specific improvement1>", ...],
            "impact": "<specific reason why this is better for narrative and ATS>",
            "storytellingTechniques": ["<technique1 used>", ...],
            "keywordsPreserved": <boolean, if keywords maintained>,
            "atsCompatible": <boolean>
          }
        ],
        "narrativeArc": {
          "beginning": "<how career started>",
          "middle": "<key growth moments>",
          "climax": "<peak achievements>",
          "resolution": "<current value proposition>"
        },
        "storytellingTechniques": [
          {
            "technique": "<technique name>",
            "description": "<what it does>",
            "example": "<example from enhanced resume>",
            "impact": "<why it works>"
          }
        ],
        "quantifiableAchievements": [
          {
            "achievement": "<specific achievement from resume>",
            "current": "<exact current statement>",
            "enhanced": "<exact enhanced version with numbers/metrics>",
            "impact": "<specific reason why better (more compelling, shows value)>",
            "metricsAdded": ["<metric1>", ...],
            "beforeNumbers": "<numbers in current version>",
            "afterNumbers": "<numbers in enhanced version>"
          }
        ],
        "valueProposition": {
          "current": "<current value prop>",
          "enhanced": "<enhanced value prop>",
          "differentiators": ["differentiator1", ...]
        },
        "recommendations": [
          {
            "priority": "<high|medium|low>",
            "suggestion": "<suggestion>",
            "expectedImpact": "<impact on narrative>"
          }
        ]
      }
    `;
}

/**
 * Resume version analysis prompt
 * Used by: /api/tools/resume-versions/route.ts (for saving versions)
 */
export function getResumeVersionAnalysisPrompt(resume: string): string {
  return `
        Analyze this resume version and extract key metrics.
        
        CRITICAL: Provide SPECIFIC, ACTIONABLE data. Include exact numbers and specific details.
        
        Resume:
        ${resume.substring(0, 5000)}
        
        Return JSON:
        {
          "jobTitle": "<exact detected or suggested job title>",
          "keyStrengths": [
            {
              "strength": "<specific strength>",
              "evidence": "<evidence from resume>",
              "impact": "<how this helps>"
            }
          ],
          "sections": ["<exact section1>", ...],
          "wordCount": <exact number>,
          "estimatedRelevancy": <number 0-100>,
          "atsScore": <estimated ATS score 0-100>,
          "keywordCount": <exact number of keywords>,
          "quantifiableAchievements": <exact count>,
          "improvementAreas": [
            {
              "area": "<specific area>",
              "suggestion": "<specific suggestion>"
            }
          ]
        }
      `;
}

/**
 * Resume version comparison prompt
 * Used by: /api/tools/resume-versions/route.ts (for comparing versions)
 */
export function getResumeVersionComparisonPrompt(
  v1: { content: string; timestamp: string },
  v2: { content: string; timestamp: string }
): string {
  return `
        Compare these two resume versions and provide insights.
        
        CRITICAL: Provide SPECIFIC, ACTIONABLE data. Include exact change descriptions, improvement metrics, and specific recommendations.
        - Provide specific change descriptions with exact text examples
        - Calculate improvement metrics between versions (ATS score, keyword count, etc.)
        - Include version-specific job targeting recommendations
        - Provide specific evidence for improvements/regressions
        
        Version 1 (${v1.timestamp}):
        ${v1.content.substring(0, 3000)}
        
        Version 2 (${v2.timestamp}):
        ${v2.content.substring(0, 3000)}
        
        Return JSON:
        {
          "improvements": [
            {
              "improvement": "<specific improvement>",
              "evidence": "<exact text showing improvement>",
              "impact": "<specific impact, e.g., '+5 ATS points', 'Better keyword density'>",
              "section": "<section where improvement occurred>"
            }
          ],
          "regressions": [
            {
              "regression": "<specific regression>",
              "evidence": "<exact text showing regression>",
              "impact": "<specific impact>",
              "section": "<section where regression occurred>",
              "recommendation": "<how to fix>"
            }
          ],
          "overallAssessment": "<specific assessment with metrics>",
          "recommendation": "<specific recommendation with action items>",
          "keyChanges": [
            {
              "change": "<specific change description>",
              "type": "<added|removed|modified>",
              "section": "<section name>",
              "before": "<exact text before>",
              "after": "<exact text after>",
              "impact": "<specific impact>"
            }
          ],
          "metrics": {
            "atsScoreChange": <number, change in ATS score>,
            "keywordCountChange": <number, change in keyword count>,
            "wordCountChange": <number, change in word count>,
            "quantifiableAchievementsChange": <number, change in achievements>
          },
          "jobTargeting": {
            "version1": {
              "bestFor": ["<job type1>", ...],
              "reason": "<specific reason>"
            },
            "version2": {
              "bestFor": ["<job type1>", ...],
              "reason": "<specific reason>"
            }
          }
        }
      `;
}

/**
 * Skills market value prompt
 * Used by: /api/tools/skills-market-value/route.ts
 */
export function getSkillsMarketValuePrompt(resume: string, location?: string, industry?: string): string {
  return `
      Analyze the market value of skills in this resume based on current job market trends.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice like "deepen expertise" or "gain hands-on experience". 
      - Require specific salary ranges (e.g., "$120k-$150k", not "high salary")
      - Provide concrete percentages (e.g., "appears in 67% of job postings", not "common")
      - Include specific learning resources/certifications (exact names, providers, URLs)
      - Calculate ROI for skill development investments (salary increase / time/cost to learn)
      - Provide specific timeframes (e.g., "3-6 months to learn", not "some time")
      - Reference market data (job posting trends, salary surveys)
      
      ${location ? `Location: ${location}\n` : ''}
      ${industry ? `Industry: ${industry}\n` : ''}
      
      Resume:
      ${resume.substring(0, 6000)}
      
      For each skill identified, provide:
      1. Market demand with specific data (percentage of jobs, growth rate)
      2. Salary impact potential with exact ranges
      3. Growth trajectory with specific trends
      4. Competitive advantage with market positioning
      5. Learning recommendations with exact resources
      
      Return ONLY a JSON object:
      {
        "skillsAnalysis": [
          {
            "skill": "<skill name>",
            "category": "<technical|soft|certification|tool>",
            "marketValue": {
              "demand": "<high|medium|low>",
              "demandScore": <number 0-100>,
              "demandPercentage": <exact percentage, e.g., 67, meaning appears in 67% of job postings>,
              "salaryImpact": "<high|medium|low>",
              "salaryRange": "<exact range, e.g., '$120k-$150k' or '+$15k-$25k increase'>",
              "growthTrend": "<rising|stable|declining>",
              "growthRate": <exact percentage growth per year, e.g., 15>,
              "marketShare": <exact percentage of jobs requiring this, e.g., 45>,
              "competition": "<high|medium|low>",
              "competitionLevel": <number 0-100, how competitive>
            },
            "yourLevel": "<beginner|intermediate|advanced|expert>",
            "marketPosition": "<above|at|below market average>",
            "recommendations": {
              "develop": <boolean, should develop further>,
              "highlight": <boolean, should highlight more>,
              "certify": <boolean, should get certified>,
              "nextLevel": "<specific next skill or level to learn, e.g., 'Advanced React patterns' or 'AWS Solutions Architect'>",
              "learningResources": [
                {
                  "type": "<course|certification|book|tutorial>",
                  "name": "<exact resource name>",
                  "provider": "<provider name>",
                  "url": "<URL if available>",
                  "cost": "<exact cost>",
                  "duration": "<exact duration>",
                  "timeToLearn": "<exact time estimate, e.g., '3-6 months'>"
                }
              ],
              "roi": "<return on investment calculation, e.g., 'Learn in 3 months, increase salary by $20k/year = $80k ROI over 4 years'>"
            },
            "opportunities": ["opp1", ...],
            "threats": ["threat1", ...]
          }
        ],
        "marketPositioning": {
          "overallValue": <number 0-100>,
          "competitiveAdvantage": <number 0-100>,
          "marketFit": "<excellent|good|average|poor>",
          "topSkills": ["skill1", ...],
          "underutilizedSkills": ["skill1", ...],
          "missingHighValueSkills": ["skill1", ...]
        },
        "salaryPotential": {
          "currentEstimate": "<exact range, e.g., '$90k-$110k' based on location/industry>",
          "withSkillDevelopment": "<exact range, e.g., '$120k-$150k'>",
          "potentialIncrease": "<exact increase, e.g., '+$20k-$40k per year'>",
          "highValueSkillsToAdd": [
            {
              "skill": "<exact skill name>",
              "salaryIncrease": "<exact increase, e.g., '+$15k-$25k per year'>",
              "timeToLearn": "<exact time, e.g., '3-6 months'>",
              "cost": "<exact cost to learn, e.g., '$500-$2000'>",
              "ROI": "<exact ROI calculation, e.g., 'Invest $1k, gain $20k/year = 20x ROI in first year'>",
              "learningResources": [
                {
                  "type": "<course|certification|book>",
                  "name": "<exact name>",
                  "provider": "<provider>",
                  "url": "<URL>",
                  "cost": "<cost>",
                  "duration": "<duration>"
                }
              ]
            }
          ]
        },
        "careerPath": {
          "currentLevel": "<level>",
          "nextLevel": "<next level>",
          "pathway": ["step1", ...],
          "skillsNeeded": ["skill1", ...],
          "timeline": "<estimated timeline>"
        },
        "trends": {
          "emergingSkills": ["skill1", ...],
          "decliningSkills": ["skill1", ...],
          "stableSkills": ["skill1", ...],
          "industryTrends": ["trend1", ...]
        },
        "recommendations": [
          {
            "priority": "<critical|high|medium|low>",
            "action": "<specific action, e.g., 'Get AWS Solutions Architect certification'>",
            "skill": "<exact skill name>",
            "impact": "<specific impact, e.g., 'Increase salary by $20k/year, appear in 40% more job postings'>",
            "effort": "<low|medium|high>",
            "timeline": "<exact timeline, e.g., '3-6 months'>",
            "cost": "<exact cost estimate>",
            "roi": "<exact ROI calculation>",
            "resources": [
              {
                "type": "<course|certification|book>",
                "name": "<exact name>",
                "provider": "<provider>",
                "url": "<URL>",
                "cost": "<cost>"
              }
            ]
          }
        ]
      }
    `;
}

/**
 * Format validator prompt
 * Used by: /api/tools/format-validator/route.ts
 */
export function getFormatValidatorPrompt(resume: string): string {
  return `
      Analyze the resume formatting for ATS compatibility.
      
      CRITICAL: Provide SPECIFIC, ACTIONABLE data. Avoid generic advice. Include exact locations and fix instructions.
      - Require specific line/character positions for issues (e.g., "Line 15", "Section: Experience, bullet 3")
      - Provide exact fix instructions with full before/after examples
      - Include parsing accuracy estimates per section (0-100%)
      - Specify which ATS systems would fail (exact system names)
      - Provide exact file format recommendations with reasoning
      
      Check for:
      1. Proper section headers (exact format issues)
      2. Consistent formatting (specific inconsistencies)
      3. Readable structure (specific structural problems)
      4. ATS-friendly elements (specific missing elements)
      5. File format recommendations (exact format with reasoning)
      
      Return ONLY a JSON object:
      {
        "atsCompatible": <boolean>,
        "score": <number 0-100>,
        "issues": [
          {
            "type": "<formatting|structure|content>",
            "severity": "<critical|high|medium|low>",
            "description": "<specific issue description>",
            "location": "<exact location: line number, section name, character position, or 'Section: X, bullet Y'>",
            "before": "<exact problematic text>",
            "after": "<exact fixed text>",
            "fix": "<specific fix instructions with example>",
            "atsSystemsAffected": ["<exact ATS system names that would fail>"],
            "impact": "<specific impact on parsing, e.g., 'Prevents contact info extraction'>",
            "timeToFix": "<exact time estimate, e.g., '2 minutes'>"
          }
        ],
        "sectionAnalysis": {
          "header": {"parsingAccuracy": <number 0-100>, "issues": ["<issue1>", ...]},
          "contact": {"parsingAccuracy": <number 0-100>, "issues": ["<issue1>", ...]},
          "experience": {"parsingAccuracy": <number 0-100>, "issues": ["<issue1>", ...]},
          "education": {"parsingAccuracy": <number 0-100>, "issues": ["<issue1>", ...]},
          "skills": {"parsingAccuracy": <number 0-100>, "issues": ["<issue1>", ...]}
        },
        "strengths": [
          {
            "strength": "<specific strength>",
            "impact": "<how this helps ATS parsing>"
          }
        ],
        "recommendations": [
          {
            "action": "<specific action to take>",
            "priority": "<critical|high|medium|low>",
            "impact": "<specific expected improvement, e.g., '+10% parsing accuracy'>",
            "location": "<where to apply>",
            "example": "<before> → <after>"
          }
        ],
        "fileFormat": {
          "recommended": "<pdf|docx|txt>",
          "reason": "<specific reason>",
          "alternatives": [
            {
              "format": "<format>",
              "pros": ["<pro1>", ...],
              "cons": ["<con1>", ...]
            }
          ]
        },
        "estimatedParsingAccuracy": <number 0-100, overall>,
        "atsSystemCompatibility": {
          "workday": {"compatible": <boolean>, "accuracy": <number 0-100>},
          "taleo": {"compatible": <boolean>, "accuracy": <number 0-100>},
          "greenhouse": {"compatible": <boolean>, "accuracy": <number 0-100>}
        }
      }
      
      Resume:
      ${resume.substring(0, 5000)}
    `;
}



