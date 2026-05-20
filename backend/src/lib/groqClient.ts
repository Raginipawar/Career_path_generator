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
    temperature: 0.7,
    max_tokens: 800,
  });

  return response.choices[0]?.message?.content ?? 'I could not generate a response. Please try again.';
}

function buildChatSystemPrompt(
  profile: Record<string, unknown>,
  roadmap: Record<string, unknown> | null,
): string {
  const skills = (profile.technicalSkills as string[])?.join(', ') || 'not specified';
  const domains = (profile.interestDomains as string[])?.join(', ') || 'not specified';

  let prompt = `You are a personal AI career advisor for ${profile.fullName || 'the user'}.
You have full access to their career profile and generated roadmap. Answer questions about their career data concisely and specifically.

USER PROFILE:
- Name: ${profile.fullName}, Age: ${profile.age}, Location: ${profile.locationCity}, ${profile.locationState}
- Education: ${profile.highestDegree} in ${profile.fieldOfStudy} (${profile.institutionTier})
- Current Role: ${profile.currentRole} at ${profile.currentIndustry} (${profile.yearsOfExperience} years experience)
- Technical Skills: ${skills}
- Interest Domains: ${domains}
- Career Goal: ${profile.careerGoal}
- Life Stage: ${profile.lifeStage}, Burnout: ${profile.burnoutLevel}/10, Leadership: ${profile.leadershipScore}/10
- Work Priority: ${profile.workLifePriority}`;

  if (roadmap) {
    prompt += `

GENERATED ROADMAP:
- Transition: ${roadmap.current_role} → ${roadmap.target_role}
- Success Probability: ${roadmap.success_probability}%
- Timeline: ${roadmap.total_transition_months} months
- Explanation: ${roadmap.explanation}`;
  }

  prompt += `

RULES:
- Answer questions specifically using their profile data, not generic advice
- If asked "what roles can I reach in X years", use the roadmap timeline
- If asked "what skill should I learn first", reference their skill_gap from the roadmap
- If asked about salary, reference Indian market rates relevant to their domain
- Keep responses concise (2-4 sentences max unless a detailed breakdown is requested)
- Be honest — if a goal seems unrealistic given their profile, say so with data`;

  return prompt;
}
