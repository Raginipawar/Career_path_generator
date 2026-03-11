"""
Generate career docs doc_091 to doc_360 (270 docs)
Evenly distributed across all 25 domains with focus on priority doc_types
"""

import json
from datetime import datetime
import random

# All 25 valid domains
DOMAINS = [
    "AI & ML", "Cybersecurity", "EdTech & Technical Education", "Product Management",
    "Cloud & DevOps", "FinTech & Banking Technology", "UI/UX Design", "Healthcare IT & Health Tech",
    "Digital Marketing & Growth", "Full Stack Web Development", "Data Analytics & Business Intelligence",
    "HR Technology & People Analytics", "Sustainability & ESG", "Legal Tech & Compliance",
    "Supply Chain & Operations Tech", "GCC & Global Delivery Leadership", "Entrepreneurship & Startups",
    "Embedded Systems & IoT", "Research & Academia", "Gaming & Interactive Media",
    "Finance & Investment", "Content & Creator Economy", "Consulting & Strategy",
    "Civil & Infrastructure Engineering", "Sales & Business Development"
]

DOC_TYPES = ["transition_path", "skill_requirements", "salary_data", "role_description", "industry_trend", "career_story"]
EXPERIENCE_LEVELS = ["Entry", "Mid", "Senior", "Leadership"]
REGIONS = ["India", "Bangalore", "Mumbai", "Pune", "Hyderabad", "Delhi", "NCR"]

# Content templates for each doc_type and domain combination
def generate_transition_path_doc(doc_id, domain, exp_level, region):
    """Generate transition path document"""
    content_map = {
        "HR Technology & People Analytics": f"Transitioning to HR Technology from HR operations or IT backgrounds is increasingly viable in India's digitizing HR landscape. The shift requires understanding HR workflows, people analytics, and HRMS platforms. Timeline: 4-7 months. Learn HR processes: recruitment, performance management, payroll, employee lifecycle. Master HRMS platforms: Workday, SAP SuccessFactors, Darwinbox, Keka. Develop analytics skills: SQL, Excel advanced, data visualization in Tableau. Understand HR compliance: PF, ESI, labor laws, DPDP Act for employee data. Technical HR professionals build integration systems, automate workflows, and generate insights from people data. Companies hiring: Darwinbox, Keka, sumHR, Freshworks (Freshteam), GCCs with large HR teams. Salary after transition: {exp_level} level 10-22 LPA in product companies, 6-14 LPA in service/consulting. Build projects: Leave management system, employee analytics dashboard, recruitment tracker. Join HR tech communities and attend SHRM events. Understanding both HR domain and technology creates unique value. Growing field as companies digitize HR and adopt people analytics. Work-life balance generally good. Career progression to HRIS Manager or Head of HR Technology.",
        "Sustainability & ESG": f"Professionals transitioning to Sustainability and ESG roles bring diverse backgrounds—engineering, finance, consulting, operations. The transition takes 6-12 months of domain learning. Study sustainability frameworks: GRI, SASB, TCFD, CDP. Understand India's regulatory landscape: BRSR (Business Responsibility and Sustainability Reporting) mandatory for top listed companies, ESG disclosures, carbon trading mechanisms. Learn carbon accounting: GHG Protocol, Scope 1/2/3 emissions, carbon footprint calculation tools. Develop data analysis skills for ESG metrics tracking and reporting. Certifications valued: GRI Certified Professional, CFA ESG, LEED AP. Companies hiring: Sustainability consulting firms (EY, Deloitte, PwC sustainability teams), corporates building ESG teams, climate tech startups, impact investing firms. Roles: ESG Analyst, Sustainability Manager, Carbon Analyst, CSR Manager. Salary: {exp_level} level 8-18 LPA in consulting, 12-25 LPA in corporates. Build understanding of renewable energy, circular economy, sustainable supply chains. Join networks: India GBC, CII Sustainability Council. Purpose-driven field with growing importance as climate action intensifies. Technical backgrounds valued for energy optimization and data analysis. Expect field work and stakeholder engagement. Career combines environmental impact with business strategy.",
        "Legal Tech & Compliance": f"Transitioning to Legal Tech suits both lawyers wanting to use technology and engineers interested in legal domain. Timeline: 5-9 months for career switchers. For lawyers: Learn legal tech tools (contract management: SpotDraft, IronClad; e-discovery: Relativity; legal research: Manupatra, SCC Online), basic coding for automation, understanding of AI/NLP for legal text. For engineers: Study legal workflows, compliance requirements (DPDP Act, GDPR, RBI regulations), privacy engineering, contract lifecycle management. Core skills: Document automation, legal analytics, compliance tracking systems, understanding of Indian legal system and regulations. Companies: Legal tech startups (SpotDraft, Leegality, Nyaaya, LegitQuest), law firms building tech teams, corporate legal operations, GCCs with compliance focus. Roles: Legal Tech Product Manager, Compliance Engineer, Contract Analyst, Privacy Engineer. Salary: {exp_level} level 10-20 LPA at startups, 15-30 LPA at corporates. DPDP Act creating significant demand for privacy professionals. Build projects: Contract analyzer, compliance tracker, legal research tool. Certifications: CIPP (privacy), legal tech courses from law schools. Niche but growing field as legal industry digitizes. Combination of legal and tech knowledge highly valued. Work involves both legal precision and technical implementation.",
        "Finance & Investment": f"Moving into Finance and Investment roles from engineering, data science, or other quant backgrounds is common path to financial services. Timeline: 6-12 months. Core knowledge areas: Financial markets (equities, fixed income, derivatives, commodities), portfolio management, financial modeling, valuation, risk management. Technical skills: Excel expert level, Python for quantitative analysis, SQL for financial data, Bloomberg Terminal, financial databases. Learn accounting fundamentals and financial statement analysis. Certifications highly valued: CFA (gold standard), FRM (risk management), NISM certifications for Indian markets. Roles: Equity Research Analyst, Quantitative Analyst, Risk Analyst, Portfolio Manager, Investment Banking Analyst. Companies: Zerodha, Groww, INDmoney, Angel One, traditional firms (ICICI Securities, HDFC Securities), prop trading firms, hedge funds, PE/VC firms. Salary: {exp_level} analysts 8-18 LPA, Quant roles 15-35 LPA, Investment banking 12-30 LPA plus bonuses. Quantitative backgrounds (engineering, stats, physics) advantage for quant and algo trading roles. Join CFA community, read financial news daily. Work hours intense in investment banking; better in wealth management. Growing field with India's capital markets expanding and retail investor growth. Analytical skills from tech backgrounds translate well.",
        "Consulting & Strategy": f"Management Consulting attracts engineers and business professionals for problem-solving and business impact work. Timeline: 3-6 months preparation for consulting roles. Core skills: Structured thinking and problem decomposition, business analysis and financial modeling, PowerPoint storytelling, stakeholder management, industry research. Frameworks: SWOT, Porter's Five Forces, BCG Matrix, value chain analysis. Quantitative skills: Excel modeling, data analysis, market sizing. Entry paths: Top MBA (IIMs, ISB) traditional route, boutique consulting firms, strategy roles in product companies, internal consulting teams at large corporations. Firms: McKinsey, BCG, Bain (MBB), Big 4 (Deloitte, PwC, EY, KPMG), Indian firms (Kearney, Praxis), tech consulting (Thoughtworks, Accenture). Salary: {exp_level} consultant 12-25 LPA, Senior Consultant 25-45 LPA, Manager 45-80 LPA at top firms. Work intense with long hours and frequent travel. Engineers bring analytical rigor and tech understanding valuable for digital transformation projects. Case interview preparation essential (Victor Cheng, Case In Point). Build broad business knowledge across industries. Exit opportunities to industry leadership or startups excellent. Career combines problem solving, learning, and business impact. Prestige and learning curve attract top talent despite demanding lifestyle.",
        "Sales & Business Development": f"Transitioning to Sales and Business Development from technical or other backgrounds offers uncapped earning potential and customer-facing work. Timeline: 2-5 months to develop foundational skills. Core competencies: Consultative selling, relationship building, pipeline management, CRM tools (Salesforce, HubSpot), negotiation, presentation skills. Understanding: Sales methodologies (SPIN selling, Challenger sale, solution selling), metrics (ARR, MRR, CAC, LTV), B2B vs B2C sales motions. Types: Inside sales (remote), field sales, account management, business development (new accounts), sales engineering (technical sales). Industries: SaaS companies need sales teams, FinTech, EdTech, B2B startups, enterprise software, GCCs. Companies: Freshworks, Zoho, Postman, Razorpay hire heavily in sales. Salary: {exp_level} sales reps 6-12 LPA base + 4-10 LPA variable, Mid-level Account Executives 12-20 LPA + variable matching base, Senior/Enterprise 20-40 LPA + significant variable. Top performers earn 50-100 LPA. Technical backgrounds advantage for selling complex products (sales engineering, solutions consulting). Build personal brand on LinkedIn, network actively. Skills transferable: every company needs sales. High-pressure but high-reward. Career path: SDR → Account Executive → Senior AE → Team Lead → Sales Manager → VP Sales. Meritocratic with clear metrics. Join sales communities and read sales books (Predictable Revenue, Fanatical Prospecting).",
        "Content & Creator Economy": f"Building a career in Content Creation and Creator Economy means monetizing expertise and audience. Timeline: 6-18 months to build sustainable income. Platform choice: YouTube (long-form, AdSense), LinkedIn (professional, B2B), Instagram (visual, lifestyle), Twitter (tech, quick insights), Newsletter (Substack, ConvertKit). Tech niches: Programming tutorials, system design, career advice, product reviews, freelancing, DevOps, cloud, data science. Content formats: Tutorials, explainers, project walkthroughs, career guides, interview prep, tools/frameworks comparison. Monetization: AdSense (YouTube: 10k-50k per lakh views in India), Sponsorships (10k-5L per post based on following), Courses (Udemy, Gumroad: 50k-50L annually), Consulting/coaching (2k-10k per hour), Affiliate marketing (Amazon, course platforms), Memberships (Patreon, channel memberships). Initial phase: Create 50-100 pieces of content before seeing traction. Post consistently (3x week minimum). Skills: Content creation, video editing (Premiere Pro, DaVinci Resolve), SEO/algorithms, community management, basic business. Tools investment: Camera (20-80k), mic (5-15k), editing software, lighting. Indian context: Regional language content huge opportunity. Tier 2/3 cities underserved. Challenges: Algorithm dependency, inconsistent income initially, burnout risk, privacy concerns. Successful creators combine content with products/services. Build email list for platform independence. Network with other creators. High uncertainty but unlimited upside. Most supplement with job initially. Requires consistency, authenticity, and patience.",
        "Gaming & Interactive Media": f"Transitioning to Gaming industry from software development or creative fields possible with targeted skill development. Timeline: 6-12 months to build portfolio and learn game development. Technical path: Learn game engines (Unity with C#, Unreal with C++), game physics, rendering, AI for NPCs, network programming for multiplayer, mobile game optimization. Creative path: Game design (mechanics, levels, balance), UI/UX for games, narrative design, 2D/3D art (Blender, Maya), sound design. Emerging: Blockchain games, VR/AR games, cloud gaming. Indian gaming landscape: Mobile-first market (casual, hyper-casual games), Real-money gaming (Dream11, MPL), PC/console gaming growing, Esports ecosystem expanding. Companies: Nazara Technologies, Dream11, MPL, Winzo, Games24x7, Zynga India, EA India, Ubisoft Pune, indie studios. Salary: {exp_level} developers 6-15 LPA, Mid 15-28 LPA, Senior 25-45 LPA. Lower than enterprise but improving. Build portfolio: Ship 2-3 games (even simple ones on Play Store/itch.io), participate in game jams, open-source contributions to game frameworks. Education: Specialized game development courses (ICAT, Arena) or self-learning (Udemy, YouTube, Unity Learn). Passion for games essential as crunch time demanding. Growing industry with India becoming game development hub for outsourcing and original IP.",
        "Research & Academia": f"Transitioning to Research and Academia from industry brings focus to advancing knowledge and teaching next generation. Timeline: Significant—PhD takes 4-6 years, postdoc 2-4 years before faculty position. Paths: Pursue PhD in area of interest (CS, AI, engineering, sciences), publish research papers, complete postdoctoral research, apply for faculty positions. Alternative: Industry research labs (Microsoft Research, Google Research, Adobe Research, TCS Research) hire PhDs without academic path. Research areas in demand: AI/ML, natural language processing, computer vision, quantum computing, climate science, biotechnology, materials science. Institutions: IITs, IISc, IISERs, TIFR, CSIR labs, DRDO, ISRO for government research. Funding: SERB, DST, DBT grants for research projects. Salary reality: PhD stipend 31-35k/month (2025 rates), Postdoc 50-70k/month, Assistant Professor at IITs 60k-1L/month, Industry research scientist 15-40 LPA. Pros: Intellectual freedom, deep work, teaching and mentoring, contributing to knowledge, academic conferences/travel, work-life balance at some institutions. Cons: Long training period, competitive positions, lower compensation vs industry, pressure to publish. Suitable for those passionate about specific research questions more than compensation. Strong fundamentals in math and theory essential. Growing research ecosystem in India with government investment.",
        "Embedded Systems & IoT": f"Software engineers transitioning to Embedded Systems and IoT need hardware-software integration skills. Timeline: 6-10 months to learn embedded programming and hardware interfacing. Core skills: C/C++ for embedded systems (different from application C++), microcontroller programming (ARM Cortex, ESP32, STM32, Arduino), understanding of electronics (datasheets, schematics, oscilloscope usage), communication protocols (I2C, SPI, UART, CAN for automotive), RTOS (Real-Time Operating Systems: FreeRTOS). IoT specific: WiFi/Bluetooth/LoRa protocols, MQTT for IoT messaging, cloud IoT platforms (AWS IoT Core, Azure IoT Hub), OTA firmware updates, power optimization. Emerging: Edge AI (running ML models on microcontrollers), security for embedded devices. Applications: Smart home/building automation, wearables, industrial IoT sensors, automotive electronics, medical devices, robotics. Companies: Bosch, Continental, Qualcomm, Texas Instruments, Ather Energy, IoT startups, consumer electronics companies. Salary: {exp_level} 8-16 LPA, Mid 14-25 LPA, Senior 22-40 LPA. Lower than pure software but growing. Educational resources: Online courses (Udemy, Coursera), textbooks, hands-on projects with dev boards (Raspberry Pi, Arduino, ESP32). Build portfolio with IoT projects. Indian ecosystem growing with Make in India push, EV revolution, smart cities. Career path: Firmware Engineer → Senior Embedded Engineer → Embedded Architect → Hardware Product Manager. Specialized field with valuable skills. Mix of software and hardware debugging. Good for those who enjoy lower-level programming and hardware.",
    }

    # Default template if domain not in specific map
    if domain not in content_map:
        content_map[domain] = f"Professionals transitioning to {domain} roles need to develop domain-specific knowledge and technical skills relevant to this field. The transition typically takes 6-12 months depending on background. Start by understanding the core workflows and challenges in {domain}. Take industry-relevant certifications and courses from recognized platforms. Build practical projects that demonstrate your understanding of {domain} applications. Network with professionals in this field through LinkedIn, industry events, and local meetups. In India, {domain} opportunities are growing across major metros including Bangalore, Pune, Hyderabad, NCR, and Mumbai. Companies value candidates who combine technical skills with domain expertise. Entry points include junior roles, internships, or internal transfers if currently employed. Salary expectations for {exp_level} level professionals range between 8-22 LPA depending on company type, location, and prior experience. Build a portfolio showcasing domain projects and contribute to relevant open-source initiatives. Stay updated with industry trends by following thought leaders, reading industry publications, and participating in online communities. The field offers strong career growth potential with increasing demand for skilled professionals who understand both technology and domain-specific challenges."

    return {
        "doc_id": doc_id,
        "text": content_map.get(domain, content_map[domain]),
        "metadata": {
            "doc_id": doc_id,
            "source": "Manual",
            "domain": domain,
            "doc_type": "transition_path",
            "role_title": f"{domain} Professional",
            "experience_level": exp_level,
            "region": region,
            "last_scraped": "2026-03-11"
        }
    }

def generate_skill_requirements_doc(doc_id, domain, role, exp_level, region):
    """Generate skill requirements document"""

    skills_content = {
        "HR Technology & People Analytics": f"{role} professionals in India's {exp_level} level need comprehensive HR and technology skills in 2026. HRMS platforms: Workday, SAP SuccessFactors, Darwinbox, Keka, greytHR expertise. Analytics: SQL for HR data queries, Excel advanced functions (pivot, vlookup, power query), Tableau or Power BI for dashboards. HR domain knowledge: Recruitment workflows, performance management cycles, compensation and benefits, employee engagement, HR compliance (PF, ESI, labor laws). People analytics: Cohort analysis, attrition prediction, recruitment funnel metrics, diversity analytics. Data privacy: Understanding DPDP Act for employee data, data security practices. Integration: API understanding to connect HRMS with other systems, webhooks, data synchronization. Reporting: Building HR dashboards, executive reports, headcount planning models. Soft skills: Communication with HR and business leaders, translating data insights to actions, change management. Tools: Google Workspace, Microsoft 365, survey tools (Culture Amp, Qualtrics), ATS systems. Emerging: AI for resume screening, chatbots for employee queries, predictive analytics for workforce planning. In {region}, understanding labor laws and compliance requirements critical. Career progression: HRIS Analyst → Senior Analyst → HRIS Manager → Director of HR Technology.",
        "Sustainability & ESG": f"{role} professionals at {exp_level} level in India require multidisciplinary skills in 2026. Regulatory knowledge: BRSR (Business Responsibility and Sustainability Reporting) framework, SEBI ESG disclosure requirements, Companies Act CSR provisions, international standards (GRI, SASB, TCFD, CDP). Carbon accounting: GHG Protocol mastery, calculating Scope 1/2/3 emissions, carbon footprint assessment tools, LCA (Life Cycle Assessment). Data management: Excel for sustainability data, ESG software platforms (Enablon, Sphera, Intelex), data quality and assurance. Sustainability strategy: Materiality assessment, stakeholder engagement, setting science-based targets, net-zero roadmaps. Domain knowledge: Renewable energy basics, circular economy principles, sustainable supply chain, water management, waste management. Reporting: Writing sustainability reports, ESG disclosures, responding to CDP questionnaires, investor ESG queries. Standards: Understanding ISO 14001 (environmental), ISO 45001 (health & safety), LEED certification. Soft skills: Cross-functional collaboration, presenting to leadership, vendor assessment for sustainability, training employees. Emerging: Climate risk assessment, TCFD climate scenario analysis, carbon markets and trading, biodiversity metrics. Industry-specific: Knowledge of sector-specific issues (for banking: green finance; for manufacturing: resource efficiency). Certifications valued: GRI Certified Professional, CFA ESG Certificate, LEED AP.",
        "Legal Tech & Compliance": f"{role} professionals need hybrid legal-technical skills in 2026 India. Legal domain: Understanding of Indian legal system, contract law, regulatory compliance (DPDP Act, GDPR, RBI regulations, SEBI norms), intellectual property basics. Technical skills: Legal tech platforms (SpotDraft, IronClad for contracts; Kira, Luminance for due diligence), document management systems, basic coding for automation (Python, JavaScript), understanding of AI/NLP for legal text analysis. Compliance: Building compliance frameworks, audit trails, regulatory reporting systems, KYC/AML workflows for FinTech, data privacy compliance tools. Contract management: Contract lifecycle from drafting to renewal, clause library management, contract analytics, obligation tracking, redlining and version control. Legal research: Using legal databases (Manupatra, SCC Online, Indian Kanoon), case law research, staying updated on regulatory changes. E-discovery: Managing electronic evidence, data preservation, document review platforms. Project management: Managing legal tech implementations, stakeholder management with lawyers and business. Soft skills: Attention to detail, understanding both legal and business requirements, clear documentation. Privacy engineering: Data mapping, privacy by design, consent management, data subject rights requests. Emerging: Generative AI for legal drafting, smart contracts on blockchain, legal analytics for case outcome prediction. For {exp_level} level in {region}, expect increasing focus on DPDP Act compliance and privacy engineering.",
        "Finance & Investment": f"{role} professionals at {exp_level} level in India require strong quantitative and market skills in 2026. Financial knowledge: Deep understanding of equity markets, fixed income, derivatives, mutual funds, portfolio theory, asset allocation. Technical skills: Excel expert (complex models, VBA), Python for quant analysis (pandas, numpy), R for statistics, SQL for financial databases, Bloomberg Terminal proficiency. Financial modeling: DCF valuation, comparable company analysis, LBO models, merger models, scenario analysis. Accounting: Financial statement analysis, understanding P&L, balance sheet, cash flows, ratio analysis. Market knowledge: Indian equity markets (NSE, BSE), global markets, sector analysis, macroeconomic indicators. Tools: Bloomberg, Reuters, Capital IQ, Factset, screener.in for Indian markets. For Quants: Probability, statistics, stochastic calculus, time series analysis, machine learning for trading algorithms. Risk management: VaR, stress testing, portfolio optimization, hedging strategies. Regulations: SEBI guidelines, insider trading rules, mutual fund regulations, FPI/FII norms. Soft skills: Communication of investment thesis, client presentations for wealth management roles, working under pressure. Certifications: CFA (highly valued), FRM for risk roles, NISM certifications mandatory for certain roles. Programming: Python increasingly important for backtesting strategies, algorithmic trading, portfolio analytics. Emerging: Alternative data for investment insights, ESG integration in investment analysis, crypto asset analysis.",
        "Consulting & Strategy": f"{role} consultants at {exp_level} level need diverse business and analytical skills in 2026. Analytical skills: Structured problem-solving, breaking complex problems into components, hypothesis-driven thinking, data analysis and interpretation. Business frameworks: SWOT, Porter's Five Forces, BCG Matrix, Ansoff Matrix, value chain analysis, profitability frameworks, market sizing. Financial analysis: Excel financial modeling, P&L analysis, business case development, ROI calculations, cost-benefit analysis. Communication: PowerPoint storytelling, executive presentations, client management, written communication for reports. Industry knowledge: Understanding multiple industries (technology, retail, financial services, healthcare), competitive landscapes, business models. Research: Primary research (interviews, surveys), secondary research (industry reports, market studies), data synthesis. Project management: Managing multiple workstreams, stakeholder coordination, timeline management, deliverable quality. Quantitative skills: Statistics, data analysis in Excel or Python, survey design and analysis. Soft skills: Client relationship building, working in teams, managing up and down, adaptability to different industries and problems. Strategy: Business strategy formulation, go-to-market strategy, pricing strategy, organizational design. For digital transformation consulting: Understanding of technology trends, agile methodologies, product management, cloud migration. Case interview skills: Structured thinking, mental math, charts and exhibits interpretation. Domain specialization: Developing expertise in specific sector or capability (M&A, operations, marketing). Location {region} has strong consulting ecosystem with both global and boutique firms.",
        "Sales & Business Development": f"{role} professionals at {exp_level} level in India need sales expertise and business acumen in 2026. Core sales skills: Consultative selling, needs assessment, solution positioning, objection handling, closing techniques, negotiation, relationship building. Sales process: Lead qualification (BANT framework), pipeline management, forecasting, opportunity sizing, proposal development. CRM mastery: Salesforce, HubSpot, Zoho CRM, tracking activities, pipeline visibility, analytics and reporting. Communication: Presentation skills, discovery questions (SPIN selling), active listening, tailoring message to audience, executive presence. Sales methodologies: SPIN Selling, Challenger Sale, Solution Selling, MEDDIC for enterprise sales, Sandler Training. Product knowledge: Deep understanding of product/solution, competitive landscape, value proposition, ROI calculation for customers. Technical acumen: For sales engineers and technical sales, understanding architecture, integrations, security, technical demos. Metrics: ARR/MRR, CAC, LTV, win rate, average deal size, sales cycle length, quota attainment. Industry knowledge: Understanding customer's business, pain points, decision-making processes, budget cycles. Tools: LinkedIn Sales Navigator for prospecting, email automation, video calling, proposal tools, e-signature. Prospecting: Cold calling, email outreach, social selling, inbound lead follow-up, referral generation. Account management: For {exp_level} roles, upselling, cross-selling, renewal management, customer success collaboration. Market knowledge: Competitive intelligence, industry trends, attending conferences. Soft skills: Resilience, handling rejection, time management, coachability, team collaboration. For {region}, understanding local business culture and building relationships critical.",
    }

    # Default template
    default_content = f"{role} professionals in {domain} at {exp_level} level require specific technical and domain skills in India's {region} market for 2026. Core technical competencies include proficiency in relevant programming languages, frameworks, and tools specific to this domain. Domain expertise requires understanding industry workflows, business processes, regulatory requirements, and market dynamics. Analytical skills essential: data analysis, problem-solving, quantitative reasoning, and decision-making frameworks. Communication abilities critical: technical documentation, stakeholder presentations, cross-functional collaboration, and client interaction. Platform and tool knowledge varies by specialization but commonly includes cloud platforms, data tools, project management software, and domain-specific applications. Certifications and continuous learning important to stay current with evolving technologies and industry best practices. Soft skills valued: adaptability, leadership potential, mentoring junior team members, strategic thinking, and business acumen. Understanding of agile methodologies, DevOps practices, and modern software development lifecycle. For {exp_level} level, expected to demonstrate track record of successful project delivery, technical leadership, and contribution to team growth. Industry-specific compliance and security awareness crucial depending on sector. Portfolio of relevant projects and contributions to open-source or community initiatives adds significant value. Salary and career progression tied to depth of expertise and ability to drive business outcomes."

    text = skills_content.get(domain, default_content)

    return {
        "doc_id": doc_id,
        "text": text,
        "metadata": {
            "doc_id": doc_id,
            "source": "Manual",
            "domain": domain,
            "doc_type": "skill_requirements",
            "role_title": role,
            "experience_level": exp_level,
            "region": region,
            "last_scraped": "2026-03-11"
        }
    }

def generate_salary_doc(doc_id, domain, role, exp_level, region):
    """Generate salary data document"""

    # Salary ranges by domain and experience level (in LPA)
    salary_ranges = {
        "AI & ML": {"Entry": "8-18", "Mid": "18-40", "Senior": "40-80", "Leadership": "80-150"},
        "Cybersecurity": {"Entry": "6-14", "Mid": "15-35", "Senior": "35-70", "Leadership": "70-120"},
        "EdTech & Technical Education": {"Entry": "5-12", "Mid": "12-25", "Senior": "25-50", "Leadership": "50-100"},
        "Product Management": {"Entry": "12-22", "Mid": "22-45", "Senior": "45-90", "Leadership": "90-180"},
        "Cloud & DevOps": {"Entry": "7-15", "Mid": "15-35", "Senior": "35-65", "Leadership": "65-120"},
        "FinTech & Banking Technology": {"Entry": "8-16", "Mid": "18-40", "Senior": "40-80", "Leadership": "80-150"},
        "UI/UX Design": {"Entry": "5-12", "Mid": "12-28", "Senior": "28-55", "Leadership": "55-100"},
        "Healthcare IT & Health Tech": {"Entry": "6-14", "Mid": "14-32", "Senior": "32-60", "Leadership": "60-110"},
        "Digital Marketing & Growth": {"Entry": "4-10", "Mid": "10-25", "Senior": "25-50", "Leadership": "50-100"},
        "Full Stack Web Development": {"Entry": "5-12", "Mid": "12-28", "Senior": "28-55", "Leadership": "55-100"},
        "Data Analytics & Business Intelligence": {"Entry": "6-14", "Mid": "14-32", "Senior": "32-60", "Leadership": "60-110"},
        "HR Technology & People Analytics": {"Entry": "5-12", "Mid": "12-25", "Senior": "25-45", "Leadership": "45-85"},
        "Sustainability & ESG": {"Entry": "6-12", "Mid": "12-24", "Senior": "24-45", "Leadership": "45-85"},
        "Legal Tech & Compliance": {"Entry": "7-15", "Mid": "15-30", "Senior": "30-60", "Leadership": "60-110"},
        "Supply Chain & Operations Tech": {"Entry": "6-13", "Mid": "13-28", "Senior": "28-50", "Leadership": "50-95"},
        "GCC & Global Delivery Leadership": {"Entry": "8-16", "Mid": "16-35", "Senior": "35-70", "Leadership": "70-140"},
        "Entrepreneurship & Startups": {"Entry": "4-10", "Mid": "10-25", "Senior": "25-60", "Leadership": "30-200"},
        "Embedded Systems & IoT": {"Entry": "5-11", "Mid": "11-24", "Senior": "24-45", "Leadership": "45-85"},
        "Research & Academia": {"Entry": "4-10", "Mid": "10-22", "Senior": "22-45", "Leadership": "45-90"},
        "Gaming & Interactive Media": {"Entry": "5-12", "Mid": "12-26", "Senior": "26-50", "Leadership": "50-95"},
        "Finance & Investment": {"Entry": "6-15", "Mid": "15-35", "Senior": "35-75", "Leadership": "75-150"},
        "Content & Creator Economy": {"Entry": "3-10", "Mid": "10-30", "Senior": "30-80", "Leadership": "50-200"},
        "Consulting & Strategy": {"Entry": "10-20", "Mid": "20-45", "Senior": "45-90", "Leadership": "90-180"},
        "Civil & Infrastructure Engineering": {"Entry": "4-8", "Mid": "8-18", "Senior": "18-35", "Leadership": "35-70"},
        "Sales & Business Development": {"Entry": "6-15", "Mid": "15-35", "Senior": "35-70", "Leadership": "70-150"},
    }

    salary_range = salary_ranges.get(domain, {"Entry": "5-12", "Mid": "12-28", "Senior": "28-55", "Leadership": "55-100"})
    salary = salary_range.get(exp_level, "8-20")

    region_multipliers = {
        "Bangalore": "highest", "Hyderabad": "competitive", "Pune": "10-15% lower than Bangalore",
        "Mumbai": "comparable to Bangalore", "NCR": "comparable to Bangalore", "Delhi": "comparable to Bangalore",
        "India": "varies significantly by city"
    }

    region_note = region_multipliers.get(region, "competitive")

    text = f"{role} salaries in {domain} for {exp_level} level professionals in {region} are {region_note} in 2026. Typical compensation range: {salary} LPA depending on company type and skills. Product companies and well-funded startups pay at the higher end. Service companies and mid-sized firms offer lower range. Geographic premium: Bangalore offers highest salaries, followed by NCR and Mumbai. Hyderabad and Pune slightly lower but with better cost of living. Remote roles increasingly paying national rates equalizing geography. Company type variation: FAANG and top unicorns pay 30-50% above market average. Mid-stage startups (Series B/C) competitive with equity upside. Early-stage startups offer equity but lower base salaries. GCCs provide stability with competitive compensation and better work-life balance. Service companies (TCS, Infosys, Wipro, Cognizant) pay least but offer job security. Skill premiums: Specialized expertise commands 20-30% higher compensation. Rare skills like certain frameworks, niche domains, or certifications add value. Multilingual capabilities valued in customer-facing roles. Prior experience at top-tier companies creates 15-25% premium when switching. Compensation components: Base salary is primary component. Variable/bonus typically 10-20% of base tied to performance. Equity grants at startups (0.01-0.3% for {exp_level} roles). Stock refreshers at public companies important for total comp. Benefits: Health insurance, ESOPs/RSUs, learning budgets increasingly standard. Negotiation: Market increasingly transparent via salary sites. Multiple offers create leverage. Stock appreciation can significantly boost total compensation over time. Career progression: {exp_level} to next level typically takes 2-4 years with corresponding 30-50% salary increase.",

    return {
        "doc_id": doc_id,
        "text": text,
        "metadata": {
            "doc_id": doc_id,
            "source": "Manual",
            "domain": domain,
            "doc_type": "salary_data",
            "role_title": role,
            "experience_level": exp_level,
            "region": region,
            "last_scraped": "2026-03-11"
        }
    }

def generate_industry_trend_doc(doc_id, domain, region):
    """Generate industry trend document"""

    trends = {
        "AI & ML": "AI & ML industry in India experiencing unprecedented growth in 2026 driven by generative AI revolution and increasing enterprise adoption. LLM applications dominating: companies building internal chatbots, document processing, code assistants, customer service automation. OpenAI's GPT-4 and Anthropic's Claude widely adopted. Indian LLM development gaining momentum with government initiatives and research institutions developing Indic language models. MLOps maturity increasing: companies moving from notebook-driven development to production ML platforms with proper versioning, monitoring, and governance. Vector databases (Pinecone, Weaviate) critical for RAG applications. Computer vision applications expanding: autonomous vehicles, surveillance, retail analytics, agriculture tech, medical imaging. NLP for Indian languages: massive opportunity as companies build multilingual products for 1.4 billion population. Emerging: Edge AI for on-device inference, AI regulation discussions (ethical AI, bias detection), AI infrastructure companies, fine-tuning services. Talent war intensifying: salaries rising 20-30% YoY for ML engineers. Remote work normalized allowing tier-2 city talent access to top opportunities. Government AI mission funding research and startups. Challenges: data privacy concerns, model hallucinations in production, compute costs, skill shortage.",
        "Sustainability & ESG": "Sustainability & ESG sector in India accelerating in 2026 due to regulatory mandates and investor pressure. SEBI's BRSR (Business Responsibility and Sustainability Reporting) now mandatory for top 1000 listed companies, creating demand for ESG professionals. Companies moving beyond compliance to genuine sustainability transformation. Carbon neutrality commitments increasing: corporates setting net-zero targets, requiring carbon accounting and reduction strategies. Renewable energy integration mainstream with falling solar costs and government support. Climate tech startups booming: carbon accounting SaaS, ESG data platforms, circular economy marketplaces, agri-tech for sustainable farming. Investor focus: PE/VC funds integrating ESG criteria, sustainability-linked financing growing. Supply chain sustainability critical: Scope 3 emission tracking, vendor sustainability assessments, circular supply chains. Climate risk assessment emerging: TCFD reporting gaining traction, physical and transition risk analysis for businesses. Green jobs increasing: solar technicians, EV infrastructure, green building, waste management. Challenges: greenwashing concerns, data quality for ESG metrics, standardization of reporting frameworks, balancing growth with sustainability. Government initiatives: Green Hydrogen Mission, EV adoption targets, circular economy policy. Growing field combining purpose with commercial viability.",
        "Legal Tech & Compliance": "Legal Tech in India at inflection point in 2026 with regulatory changes and technology adoption. DPDP (Digital Personal Data Protection) Act implementation creating massive demand for privacy professionals, compliance tools, consent management platforms. Companies scrambling to achieve compliance. Contract lifecycle management platforms gaining adoption: automated contract generation, clause libraries, obligation tracking, renewals. AI-powered legal research tools improving efficiency for lawyers and corporate legal teams. E-discovery and litigation support technology advancing. Digital court systems expanding post-pandemic acceleration. Online dispute resolution (ODR) mandated for certain cases. RegTech for financial services: KYC/AML automation, transaction monitoring, regulatory reporting for RBI/SEBI compliance. GRC (Governance, Risk, Compliance) platforms consolidating compliance workflows. Startups: SpotDraft (contracts), Leegality (e-sign and verification), Nyaaya (legal education), LegitQuest (legal research) attracting VC funding. Corporate legal ops growing: legal teams adopting technology, data analytics, process improvements. Challenges: Resistance from traditional legal community, integration with legacy systems, AI bias in legal decisions, data security. Opportunities: Legal process outsourcing, alternative legal service providers, freelance lawyer platforms. Growing recognition that legal tech increases access to justice and reduces costs.",
        "Content & Creator Economy": "Creator Economy in India exploding in 2026 with democratized content creation and multiple monetization platforms. YouTube mature platform with lakhs of creators earning from AdSense. Short-form video dominating: Instagram Reels, YouTube Shorts. Tech content creators thriving: programming tutorials, career advice, product reviews, system design, DevOps, data science content. Regional language content massive opportunity: Hindi, Tamil, Telugu creators building large audiences. Monetization diversifying beyond ads: sponsorships (brands allocating significant budgets), courses (Udemy, Gumroad, Teachable), community memberships (Patreon, Discord), affiliate marketing, consulting. Creator tools evolving: AI-assisted editing, thumbnail generation, analytics platforms, collaboration marketplaces connecting creators with brands. Platforms competing for creators: YouTube Shorts fund, Instagram bonuses, LinkedIn creator mode with newsletters. Personal branding critical: LinkedIn becoming creator platform for professional content. Email lists and newsletters gaining importance for platform independence. Podcasting growing with Spotify investments. Challenges: Algorithm dependency, income volatility, burnout, privacy invasion, platform policies changing. Successful creators building businesses: production houses, agencies, product lines, EdTech companies. Indian creators going global with English content. Micro-influencers (10k-100k followers) monetizing effectively in niches. Space maturing with professionalization: managers, MCNs, creator funds.",
    }

    default_trend = f"{domain} in India's technology landscape is evolving rapidly in 2026 with several key trends shaping the industry. Digital transformation accelerating across sectors driving demand for skilled professionals in this domain. Companies investing heavily in modernizing their technology stack and processes. Regulatory environment evolving with new compliance requirements and data privacy laws creating both challenges and opportunities. Automation and AI integration becoming standard practice, requiring professionals to upskill continuously. Remote and hybrid work models normalized, enabling talent from tier-2 and tier-3 cities to access opportunities previously limited to metros. Startup ecosystem in this domain maturing with increasing VC funding and successful exit stories inspiring new ventures. Global capability centers (GCCs) expanding operations in India, bringing international best practices and technologies. Technology stack evolution: modern frameworks and platforms replacing legacy systems, cloud adoption near-universal, open-source gaining prominence. Skill premium increasing for specialized expertise as demand outpaces supply of qualified professionals. Work culture improving: focus on work-life balance, learning budgets, flexible working arrangements becoming competitive advantages for hiring. Cross-functional collaboration increasing: domain experts expected to understand business context and communicate with non-technical stakeholders. Government initiatives supporting industry growth through policy reforms, skill development programs, and infrastructure investments. Challenges include rapid technology changes requiring continuous learning, global competition, and economic uncertainties affecting hiring and funding cycles.",

    text = trends.get(domain, default_trend)

    return {
        "doc_id": doc_id,
        "text": text,
        "metadata": {
            "doc_id": doc_id,
            "source": "Manual",
            "domain": domain,
            "doc_type": "industry_trend",
            "role_title": None,
            "experience_level": "Mid",
            "region": region,
            "last_scraped": "2026-03-11"
        }
    }

def generate_main_batch():
    """Generate 270 docs (doc_091 to doc_360)"""
    docs = []
    doc_num = 91

    # Strategy: For each domain, generate roughly 11 docs (270 / 25 = 10.8)
    # Distribution per domain: 3 transition_path, 3 skill_requirements, 3 salary_data, 2 industry_trend/role_description/career_story

    for domain in DOMAINS:
        # 3 transition_path docs per domain
        for i in range(3):
            exp_level = random.choice(EXPERIENCE_LEVELS)
            region = random.choice(REGIONS)
            doc = generate_transition_path_doc(f"doc_{doc_num:03d}", domain, exp_level, region)
            docs.append(doc)
            doc_num += 1

        # 3 skill_requirements docs per domain
        for i in range(3):
            exp_level = random.choice(EXPERIENCE_LEVELS)
            region = random.choice(REGIONS)
            role = f"{domain} Specialist" if i == 0 else f"{domain} Engineer" if i == 1 else f"{domain} Analyst"
            doc = generate_skill_requirements_doc(f"doc_{doc_num:03d}", domain, role, exp_level, region)
            docs.append(doc)
            doc_num += 1

        # 3 salary_data docs per domain
        for i in range(3):
            exp_level = ["Entry", "Mid", "Senior"][i]
            region = random.choice(REGIONS)
            role = f"{domain} Professional"
            doc = generate_salary_doc(f"doc_{doc_num:03d}", domain, role, exp_level, region)
            docs.append(doc)
            doc_num += 1

        # 2 industry_trend docs per domain
        for i in range(2):
            region = random.choice(REGIONS)
            doc = generate_industry_trend_doc(f"doc_{doc_num:03d}", domain, region)
            docs.append(doc)
            doc_num += 1

    # Trim to exactly 270 docs if we went over
    docs = docs[:270]

    return docs

if __name__ == "__main__":
    docs = generate_main_batch()

    # Save to file
    output_path = "data/processed/additional_career_docs.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)

    print(f"Generated {len(docs)} docs (doc_091 to doc_{90 + len(docs):03d})")
    print(f"Saved to {output_path}")

    # Print distribution
    from collections import Counter
    doc_types = Counter([d['metadata']['doc_type'] for d in docs])
    domains = Counter([d['metadata']['domain'] for d in docs])
    exp_levels = Counter([d['metadata']['experience_level'] for d in docs])

    print(f"\nDoc Type Distribution:")
    for dt, count in sorted(doc_types.items(), key=lambda x: -x[1]):
        print(f"  {dt}: {count}")
    print(f"\nDomain Distribution (top 10):")
    for domain, count in sorted(domains.items(), key=lambda x: -x[1])[:10]:
        print(f"  {domain}: {count}")
    print(f"\nExperience Level Distribution:")
    for level, count in sorted(exp_levels.items(), key=lambda x: -x[1]):
        print(f"  {level}: {count}")
