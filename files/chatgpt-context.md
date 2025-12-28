## PRD – Recruiter Agent (AI Hiring Copilot + Lightweight ATS)

### Primary source material

* Meeting transcript (Henry × Fikayo) – 24 Oct 2025 
* Henry’s product sketch PDF (“Recruiter Agent”) 
* Follow‑up meeting transcript (Henry × Fikayo) – 31 Oct 2025 

---

## 1. Product summary

Recruiter Agent is an internal hiring copilot that centralizes hiring data (role docs + candidate artifacts + interviews) and continuously produces structured outputs that improve decision‑making and interview quality.

Core concept from Henry’s sketch and walkthrough: **Data – Process – Decision**. 

* **Data**: internal judging criteria + candidate information + hiring process artifacts
* **Process**: stage‑based pipeline where each new artifact updates the candidate’s “state”
* **Decision**: clear, explainable scoring and recommendations (hire / don’t hire / proceed), plus “must validate” items and next‑stage interview questions

MVP focus (explicitly preferred in the meetings): **replicate and automate what the team currently does manually with ChatGPT** – ingest candidate artifacts, generate analysis + questions, update after each interview – rather than trying to solve real‑time meeting copilot first.  

---

## 2. Problem statement

Today, the hiring team:

* Downloads CVs, copies LinkedIn, pastes forms and test results into ChatGPT
* Asks ChatGPT to summarize candidate strengths/weaknesses and draft interview questions
* After interviews, repeats the process with transcripts to update evaluation and prep next stage

This is:

* **Slow and manual**
* **Hard to standardize** (different interviewers prompt differently)
* **Low traceability** (hard to see how opinions changed stage‑by‑stage)
* **Not centralized** (data scattered across YC Apply, Google Forms, Fireflies, spreadsheets, assessment tools)

Recruiter Agent solves this by turning hiring into a staged, evidence‑backed decision system where every new artifact updates the candidate’s profile and scoring, and automatically prepares the next interview.  

---

## 3. Goals and non‑goals

### Goals (MVP)

1. **Centralize candidate artifacts** for a job in one place:

   * Resume/CV PDF
   * LinkedIn URL (and later scraped summary)
   * Interest form responses (manual entry or import)
   * Interview transcript(s) 1–X (manual upload or attach from Fireflies)
   * Assessment results (PDF uploads, starting with Kand.io/test outputs)  

2. **Stage‑based evaluation**

   * Keep a “snapshot” per stage, not overwriting prior states
   * Show how ratings evolve from application → interview 1 → interview 2 → …  

3. **Explainable scoring**

   * Score from **1–100** (requested explicitly)
   * Provide a short “why this score” explanation grounded in evidence from artifacts 

4. **Interview preparation automation**

   * Generate interview questions for the next stage
   * Produce “must validate” items (open risks / claims to verify)
   * Allow interviewers to add their own questions (especially for panels) 

5. **Final decision support**

   * Hire / don’t hire recommendation with reasoning
   * “Curacel fit” view aligned to values/competencies 

### Non‑goals (MVP)

* Real‑time Google Meet copilot with live transcription and on‑call prompts (explicitly flagged as technically harder; defer) 
* Fully automated ingestion from YC Apply (no API; requires scraping – future) 
* Deep integrations with all assessment tools (many require paid plans or lack APIs – start with uploads) 
* Full ATS replacement (job posting, outreach, offer letters, etc.). Focus is the **interview flow and decision engine** first. 

---

## 4. Users and personas

1. **Recruiter / HR**

   * Owns pipeline, candidate intake, scheduling, moving candidates through stages
2. **Hiring Manager**

   * Needs fast candidate understanding, consistent evaluation, decision summary
3. **Interviewer / Panelist**

   * Needs tailored questions, must‑validate prompts, space to add own questions
4. **Admin (Org owner)**

   * Sets company‑wide judging criteria: values, competencies, personality templates, etc. (should not be set per job)  

---

## 5. Key product principles

1. **Data – Process – Decision** is the organizing model. 
2. **Evidence‑first outputs**: every score or strong claim should cite which artifact supports it (resume section, transcript snippet, form response).
3. **Stage snapshots are immutable** (append‑only). Don’t overwrite earlier evaluations. 
4. **One “agent” does not hold infinite memory** – system should retrieve only relevant company + role + candidate context when generating outputs (selective retrieval / RAG). 
5. **UX must not feel cramped** – full‑page views, collapsible menus, table‑based applicant list. 

---

## 6. User journeys

### Journey A – Company setup (Admin)

1. Admin opens **Settings**
2. Uploads / defines:

   * Company values
   * Company competency framework
   * Personality templates (e.g., OCEAN/MBTI guidance)
   * Optional: “existing team profiles” reference set  
3. Saves as “Company Rulebook” used across all jobs

**Outcome:** Global judging criteria exists once (not job‑specific). 

---

### Journey B – Create a job (Recruiter)

1. Recruiter creates a job (e.g., “Executive Ops”)
2. Chooses a **pipeline template / flow type** (because different roles have different stages – start with one) 
3. Uploads role artifacts:

   * Job Description (JD)
   * Scorecard (if separate)
   * Role objectives (6–12 months)
   * Role competency & clarifications
   * Hiring rubric / rubric questions 

**Outcome:** Job is ready for candidates; system can generate “ideal candidate” framing for this role.

---

### Journey C – Add a candidate (Recruiter)

1. Recruiter clicks **Add Applicant**
2. Provides:

   * Name
   * Email
   * LinkedIn URL
   * Resume/CV PDF upload
   * (Optional) interest form response pasted / uploaded / later imported 
3. System runs “Application Stage” evaluation:

   * Extracts structured resume facts
   * Produces Application Score (1–100)
   * Provides concise explanation (why score)
   * Creates first snapshot (“Interest” / “Application”) 

**Outcome:** Candidate appears in applicant list with score and summary.

---

### Journey D – Add interview transcript for a stage (Recruiter / Hiring Manager)

1. On candidate profile → “Interview Stages”
2. For a stage (Interview 1 / HR screen / panel):

   * **Attach meeting** (future: via Fireflies search) or upload transcript file
   * Store transcript + optional summary + optional video link 
3. System runs stage analysis:

   * Stage Score (1–100) + why
   * Strengths/weaknesses updated for that stage snapshot
   * “Must validate” items
   * Interview questions for next stage
   * Hire/don’t hire recommendation (for that stage) 

**Outcome:** Next interview is prepped automatically.

---

### Journey E – Final decision (Hiring Manager)

1. Candidate profile → “Decision”
2. System shows:

   * Stage scores + overall aggregate score
   * Summary of evolution across stages
   * Final recommendation with evidence
3. Hiring manager records final disposition:

   * Hire / No hire / Hold / Needs more info
   * Notes (human override)

---

## 7. Information architecture and screens

### 7.1 Job‑level screens

#### Screen: Jobs list

* List of jobs
* Status: open/closed
* Counts: candidates in pipeline

#### Screen: Job detail – Applicants

UX requirements from Henry:

* **Full page** (avoid cramped modal layout) 
* Applicant list should be a **table**
* Side menu should be **collapsible**
* When opening a candidate, candidate list panel should collapse or reduce to avoid clutter 

Table columns (MVP):

* Candidate name
* Current stage
* Overall score (1–100)
* Latest stage score
* Updated at
* Tags (optional: “strong”, “risk”, etc.)

Actions (nice‑to‑have, inspired by YC flow Henry referenced):

* Favorite/star
* Archive
* Share link
* Report flag 

---

### 7.2 Candidate profile screens

Henry’s sketch explicitly frames candidate profile with tabs: **Interest – Interview Stages – Curacel Fit – Decision**. 

#### Screen: Candidate profile – Overview header (always visible)

* Name
* Email
* LinkedIn URL (explicitly requested to include) 
* Avatar (optional – pull from LinkedIn if possible, otherwise placeholder) 
* Overall score (1–100)
* “Why this score” summary (1–3 sentences)
* Last updated timestamp

#### Tab 1: Interest (Application / pre‑interview)

Show:

* Resume summary (no separate CV tab needed – summarize here; still allow viewing raw PDF) 
* Key experience highlights (“meaningful work experiences”)
* Extracted skills / domains
* Application score explanation
* “Must validate” items pre‑interview
* Suggested Interview 1 questions (personalized)

#### Tab 2: Interview Stages

For each stage (Interview 1…N):

* Stage inputs:

  * Attached transcript(s)
  * Attached notes/rubric (manual entry or upload)
* Stage outputs (AI‑generated):

  * Stage score (1–100) + explanation
  * Strengths / weaknesses (with evidence links)
  * Must validate next
  * Next interview questions
  * Stage recommendation (proceed / hold / reject)

Also support:

* “Panelist questions” section where interviewers add custom questions (MVP: plain text list attached to stage) 

#### Tab 3: Curacel Fit

This corresponds to values/competencies summary shown in Henry’s sketch. 
Show:

* Values alignment score(s)
* Competency alignment score(s)
* Evidence snippets from transcripts / forms / resume
* Flags (e.g., inconsistent with values)

#### Tab 4: Decision

Show:

* Summary across stages
* Score timeline (Application → Interview 1 → Interview 2 → …)
* Final recommendation + confidence
* Human decision capture (final disposition + notes)

---

### 7.3 Settings screens

#### Screen: Company Rulebook (Admin)

Must exist as settings because it applies to every job and “doesn’t change”. 
Inputs:

* Values (list + descriptions)
* Competencies (list + rubric guidance)
* Personality templates (optional guidance text)
* Existing team profiles (optional uploads / text snippets)

Outputs:

* Stored as retrievable context for AI evaluation.

---

## 8. Functional requirements

### 8.1 Candidate ingestion

**FR‑1** Add candidate manually

* Inputs: name, email, LinkedIn URL, resume PDF
* Stores raw files + extracted text

**FR‑2** Programmatic ingestion (MVP‑lite)

* Provide a simple API endpoint or webhook receiver to push applicant data into system
  Rationale: YC Apply has no usable API; Curacel may build scrapers/automations to push into Recruiter Agent. 

**FR‑3** Artifact uploads

* Resume PDF
* Interest form data (paste JSON/text or upload CSV)
* Assessments (PDF)
* Interview transcript (text file / doc / pasted)

### 8.2 Role setup artifacts

**FR‑4** Upload and manage job documents:

* JD
* Scorecard
* Role objectives (6–12 months)
* Role competency clarification
* Hiring rubric 

### 8.3 Stage model and snapshots

**FR‑5** Configurable pipeline stages per job

* MVP: ship with one template (e.g., “Executive Ops”) and allow simple edits
* Future: multiple templates (engineering differs) 

**FR‑6** Stage snapshots are preserved

* Each stage has:

  * Inputs (artifacts attached to that stage)
  * Outputs (AI analysis)
  * Timestamp + version id
* UI lets user view older snapshots without overwrite 

### 8.4 Scoring and recommendations

**FR‑7** 1–100 scoring system

* At minimum:

  * Application score
  * Per‑stage score
  * Overall aggregate score 

**FR‑8** Explainability (“why”)

* Every score shown with:

  * A short textual rationale
  * Evidence references (links to artifact snippets)

### 8.5 Question generation

**FR‑9** Interview question generator (role‑based + candidate‑based)

* Generates role‑level questions from job docs/rubric
* Personalizes questions using candidate profile
  (Henry explicitly described generic questions adapting per person; he referenced how external tools do this) 

**FR‑10** Question categories / types

* Support selecting question style (e.g., situational, behavioral) before generation (noted in Fikayo’s UI flow) 

**FR‑11** Panelist manual questions

* Allow adding/editing custom questions per stage (MVP: simple list + owner attribution)

### 8.6 Transcript ingestion

**FR‑12** Manual transcript upload (MVP)

* Accept pasted text or file upload
* Store transcript
* Trigger stage analysis

**FR‑13** Fireflies attach meeting (Phase 2)

* “Attach meeting” flow:

  * Search Fireflies meetings
  * Select meeting
  * Store transcript + summary + video link
  * Link to candidate stage 

### 8.7 Decision capture

**FR‑14** Final decision UI

* System recommendation displayed
* Human override recorded

---

## 9. AI requirements

### 9.1 Inputs to the AI engine

Must support three major input buckets (from Henry’s sketch): 

1. **Internal judging criteria**

   * Company values/competencies
   * Personality templates
   * Existing team profiles
2. **Current role**

   * JD, scorecards, role objectives, competency clarifications, hiring rubric
3. **Candidate + hiring data**

   * CV + LinkedIn
   * Interest form
   * Interview transcripts 1–X
   * Assessment results

### 9.2 Processing model – selective retrieval

A single monolithic prompt with everything won’t scale. The system should:

* Store all docs as text
* Build embeddings / searchable index
* At evaluation time, retrieve only:

  * relevant company values/competencies
  * relevant role docs
  * the stage’s artifacts
  * plus the candidate’s baseline profile summary 

### 9.3 Required AI outputs (structured)

For each stage, generate a JSON object with:

* `stage_score` (0–100)
* `score_rationale` (short)
* `strengths[]` (each with evidence refs)
* `weaknesses[]` (each with evidence refs)
* `must_validate[]`
  Each item: what to validate, why it matters, suggested probing questions
* `next_interview_questions[]`
  Each: category, question, what a good answer looks like
* `recommendation` (advance / hold / reject) + confidence
* `evidence_map[]`
  Array of references: `{artifact_id, quote, location}`

Also generate:

* `overall_candidate_profile` (updated progressively but versioned)
* `curacel_fit` summary (values/competencies alignment) 

### 9.4 Guardrails

* If information is missing, AI must say “insufficient evidence” rather than guess.
* Any numeric score must come with a rationale tied to concrete evidence.

### 9.5 Model flexibility (nice‑to‑have)

Henry referenced model switching infrastructure in another context; for Recruiter Agent, keep the product **model‑agnostic** where possible:

* Central “LLM provider config”
* Ability to swap models without breaking structured outputs (enforce schema)

---

## 10. Data model (suggested)

### Entities

* **Organization**
* **User** (role: admin, recruiter, hiring_manager, interviewer)
* **Job**
* **PipelineTemplate**
* **PipelineStageDefinition**
* **Candidate**
* **Application** (Candidate × Job)
* **StageInstance** (Application × StageDefinition)
* **Artifact** (resume, transcript, assessment, form response, rubric notes)
* **AIStageOutput** (JSON + metadata + model version)
* **Question**

  * GeneratedQuestion
  * ManualQuestion
* **DecisionRecord**
* **AuditLog**

### Key constraints

* StageInstances are **append‑only** for snapshots (new version per update).
* Artifacts must be linked to StageInstances (except baseline candidate artifacts like resume, which link to Application and can be referenced by stages).

---

## 11. Integrations

### MVP integrations

* File upload storage (resume PDFs, transcripts, assessments)
* Optional: simple inbound API for applicant creation (to support YC scraping later)

### Phase 2 integrations

* Fireflies “attach meeting” search + import 
* Google Forms import for interest form responses
* Assessment platform APIs where available (plan‑dependent) 

---

## 12. Non‑functional requirements

### Security and privacy

* Role‑based access control
* Candidate data is sensitive:

  * Encrypt at rest (storage + DB where feasible)
  * Audit logs for who viewed/exported
* Clear retention policy (e.g., delete candidate data after X months if not hired)

### Performance

* Candidate list loads fast (< 2s for 500 candidates)
* AI processing can be async, but UI must show:

  * “Processing” state
  * last successful output timestamp

### Reliability

* If AI fails, candidate data still accessible
* Re‑run analysis button

---

## 13. MVP scope – what to build first

### MVP “must ship”

1. Settings: Company values/competencies (Rulebook)
2. Jobs:

   * Create job
   * Upload JD + rubric + role objectives
   * Choose pipeline template (single template OK)
3. Candidates:

   * Add applicant (name, email, LinkedIn URL, resume PDF)
   * Applicant list table (full page + collapsible nav)
4. AI:

   * Application score (1–100) + explanation
   * Candidate profile view with tabs:

     * Interest
     * Interview Stages
     * Curacel Fit
     * Decision 
5. Interview stages:

   * Upload transcript to a stage
   * Generate stage score + must validate + next questions
   * Manual question entry
6. Decision:

   * Final recommendation + human decision capture

### Explicitly defer

* Real‑time meeting copilot Chrome extension workflow 
* YC Apply scraper
* Full automation of every assessment platform

---

## 14. Acceptance criteria (selected)

### AC‑1 Add Applicant

* Given a recruiter uploads resume PDF + LinkedIn URL + email
* When candidate is created
* Then system extracts resume text and generates:

  * application score 1–100
  * “why score” summary
  * initial must‑validate + suggested interview 1 questions

### AC‑2 Stage snapshot preserved

* Given a candidate has Interview 1 analysis
* When recruiter uploads a second transcript (Interview 2)
* Then Interview 1 outputs remain unchanged and viewable
* And Interview 2 outputs appear as a new snapshot

### AC‑3 Explainability

* Every displayed score has:

  * rationale text
  * at least 2 evidence references OR explicitly states insufficient evidence

### AC‑4 UX layout

* Candidate list is in a table
* Candidate detail opens in full page
* Side menu is collapsible
* Candidate list panel collapses (or becomes compact) when viewing candidate detail 

---

## 15. Open questions (track explicitly)

These were surfaced implicitly in the meetings and should be decided early:

1. **Funneling point** – at what stage do candidates enter “AI evaluation” by default? (Henry suspects “most likely HR screen”, but it should be configurable.) 
2. **Overall score aggregation** – simple average vs weighted by stage importance?
3. **Evidence UX** – how should the UI show citations into resume/transcripts (highlighted snippets, expandable references)?
4. **Pipeline template design** – what is the first canonical template to ship (Executive Ops vs Engineering)? 
5. **Fireflies** – do we require users to paste transcripts in MVP, or implement “Attach meeting” immediately? (Henry suggested attaching by searching Fireflies as a practical middle step.) 

---

If you want, I can also convert this PRD into a “build spec” format that’s extremely code‑agent friendly (explicit routes, pages, components, API endpoints, and JSON schemas) – but the document above already reflects the product behavior and UX Henry described across the meetings and the PDF sketch.
