// src/lib/groqClient.ts
// Direct Groq SDK client for resume parsing and chat
// Separate from the RAG service Groq calls to avoid rate limit contention

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CHAT_MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'llama-3.2-11b-vision-preview';

// ─── Resume Parsing ───────────────────────────────────────────────────────────

const RESUME_PARSE_PROMPT = `You are a resume parser. Extract structured career profile data from the provided resume content.

Return ONLY valid JSON (no markdown, no backticks) matching this exact structure:
{
  "fullName": "string or empty",
  "age": null,
  "gender": "",
  "locationCity": "string or empty",
  "locationState": "string or empty",
  "highestDegree": "string or empty",
  "fieldOfStudy": "string or empty",
  "institutionTier": "Tier 1" | "Tier 2" | "Tier 3" | "Tier 2",
  "currentRole": "string or empty",
  "currentIndustry": "string or empty",
  "yearsOfExperience": number or 0,
  "employmentStatus": "Employed Full-Time" | "Employed Part-Time" | "Self-Employed" | "Unemployed" | "Student" | "Career Break",
  "currentSalaryLpa": 0,
  "technicalSkills": ["array", "of", "skills"],
  "softSkills": ["array", "of", "soft", "skills"],
  "certifications": ["array", "of", "certifications"],
  "interestDomains": [],
  "careerGoal": "string or empty"
}

Rules:
- Extract only what is clearly present in the resume
- For institutionTier: IIT/IIM/NIT/BITS = Tier 1, good private colleges = Tier 2, others = Tier 3, unknown = Tier 2
- For employmentStatus: infer from context (student resume = Student, working = Employed Full-Time)
- technicalSkills: programming languages, frameworks, tools, cloud platforms
- softSkills: leadership, communication, teamwork etc if mentioned
- certifications: AWS, Google Cloud, PMP, etc if mentioned
- Leave age, gender, salary as null/0 — user fills those manually
- ONLY output JSON, nothing else`;

export async function parseResumeFromText(text: string): Promise<Record<string, unknown>> {
  const response = await groq.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: RESUME_PARSE_PROMPT },
      { role: 'user', content: `RESUME CONTENT:\n\n${text}` },
    ],
    temperature: 0.1,
    max_tokens: 1500,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

export async function parseResumeFromImage(base64: string, mimeType: string): Promise<Record<string, unknown>> {
  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: RESUME_PARSE_PROMPT + '\n\nExtract the career profile data from this resume image.',
          },
        ] as any,
      },
    ],
    temperature: 0.1,
    max_tokens: 1500,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// ─── Career Chat ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithProfile(
  userMessage: string,
  history: ChatMessage[],
  profile: Record<string, unknown>,
  roadmap: Record<string, unknown> | null,
): Promise<string> {
  const systemPrompt = buildChatSystemPrompt(profile, roadmap);

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await groq.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 600,
  });

  return response.choices[0]?.message?.content ?? 'I could not generate a response. Please try again.';
}

function buildChatSystemPrompt(
  profile: Record<string, unknown>,
  roadmap: Record<string, unknown> | null,
): string {
  const skills    = (profile.technicalSkills as string[])?.join(', ') || 'none listed';
  const softSkills = (profile.softSkills as string[])?.join(', ') || 'none listed';
  const certs     = (profile.certifications as string[])?.join(', ') || 'none';
  const domains   = (profile.interestDomains as string[])?.join(', ') || 'not specified';

  let prompt = `You are a senior AI career advisor. You have the user's full profile and generated roadmap loaded below.
Be direct, specific, and professional — like a McKinsey career coach. Never say "not explicitly stated" or "it's implied". You have the data — USE IT.
Format responses cleanly. Use numbers when relevant. 2–4 sentences max unless the user asks for a breakdown.

═══ USER PROFILE ═══
Name: ${profile.fullName || 'User'} | Age: ${profile.age} | Location: ${profile.locationCity}, ${profile.locationState}
Education: ${profile.highestDegree} in ${profile.fieldOfStudy} (${profile.institutionTier})
Current: ${profile.currentRole} @ ${profile.currentIndustry} | ${profile.yearsOfExperience} years experience | ₹${profile.currentSalaryLpa} LPA
Technical Skills: ${skills}
Soft Skills: ${softSkills}
Certifications: ${certs}
Domains of Interest: ${domains}
Career Goal: ${profile.careerGoal}
Burnout: ${profile.burnoutLevel}/10 | Leadership: ${profile.leadershipScore}/10 | Stress Tolerance: ${profile.stressTolerance}/10
Work Priority: ${profile.workLifePriority} | Work Style: ${profile.preferredWorkStyle}
Willing to Relocate: ${profile.willingToRelocate ? 'Yes' : 'No'} | Target Timeline: ${profile.targetTimelineYears} years`;

  if (roadmap) {
    const nodes = (roadmap.nodes as any[]) ?? [];
    const allGaps = nodes.flatMap((n: any) => n.skill_gap ?? []);
    const uniqueGaps = [...new Set(allGaps)];

    // Count how many nodes each skill appears in (frequency = blocking score)
    const gapFrequency: Record<string, number> = {};
    for (const n of nodes) {
      for (const s of (n.skill_gap ?? [])) {
        gapFrequency[s] = (gapFrequency[s] ?? 0) + 1;
      }
    }
    const topBlockers = Object.entries(gapFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, count]) => `${skill} (blocks ${count} stage${count > 1 ? 's' : ''})`)
      .join(', ');

    const nodesSummary = nodes.map((n: any, i: number) =>
      `  Step ${i + 1}: ${n.role_title} (+${n.timeline_months}mo | ₹${n.salary_estimate_lpa} LPA | ${n.risk_level} risk)\n` +
      `    Need to build: ${(n.skill_gap ?? []).join(', ') || 'none'}\n` +
      `    Already have:  ${(n.required_skills ?? []).filter((s: string) => !(n.skill_gap ?? []).includes(s)).join(', ') || 'base skills'}`
    ).join('\n');

    const altPaths = ((roadmap.alternative_paths ?? roadmap.alternativePaths) as any[])
      ?.map((a: any) => `  • ${a.path_name}: ${a.success_probability}% success, ${a.total_months} months`)
      .join('\n') ?? '';

    prompt += `

═══ GENERATED ROADMAP ═══
Transition: ${roadmap.current_role} → ${roadmap.target_role}
Success Probability: ${roadmap.success_probability}%  |  Total Timeline: ${roadmap.total_transition_months} months
AI Explanation: ${roadmap.explanation}

TOP SKILL BLOCKERS (highest impact):
${topBlockers || 'No skill gaps identified'}

ALL SKILL GAPS ACROSS THE PATH:
${uniqueGaps.join(', ') || 'None'}

ROADMAP STEPS:
${nodesSummary || 'No steps generated'}

ALTERNATIVE PATHS:
${altPaths || 'None'}`;
  }

  prompt += `

═══ ADVISOR RULES ═══
1. Always reference SPECIFIC data (skill names, months, salaries, percentages) — never speak in generalities
2. "Which skill is blocking me most?" → Cite the topBlockers list with stage count
3. "What roles can I reach in X years?" → Calculate from timeline_months and map to steps
4. "Is my probability realistic?" → Explain factors: skill overlap, experience, burnout
5. "What should I focus on this month?" → Pick the #1 gap from Step 2 with a concrete action
6. If goal seems unrealistic → say so directly with the numbers that show why
7. Tone: professional, warm, direct. Like a trusted advisor who has read every line of the data`;

  return prompt;
}
