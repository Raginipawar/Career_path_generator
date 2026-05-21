// src/routes/github.ts — GitHub public profile import
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const DOMAIN_MAP: Record<string, string> = {
  'machine-learning': 'AI & ML',
  'deep-learning':    'AI & ML',
  'nlp':              'AI & ML',
  'data-science':     'Data Analytics & Business Intelligence',
  'data-analysis':    'Data Analytics & Business Intelligence',
  'cybersecurity':    'Cybersecurity',
  'security':         'Cybersecurity',
  'fintech':          'FinTech & Banking Technology',
  'blockchain':       'FinTech & Banking Technology',
  'cloud':            'Cloud & DevOps',
  'devops':           'Cloud & DevOps',
  'kubernetes':       'Cloud & DevOps',
  'docker':           'Cloud & DevOps',
  'web':              'Full Stack Web Development',
  'frontend':         'Full Stack Web Development',
  'backend':          'Full Stack Web Development',
  'react':            'Full Stack Web Development',
  'node':             'Full Stack Web Development',
  'iot':              'Embedded Systems & IoT',
  'embedded':         'Embedded Systems & IoT',
  'ui':               'UI/UX Design',
  'ux':               'UI/UX Design',
  'healthcare':       'Healthcare IT',
  'product':          'Product Management',
  'game':             'Gaming & Interactive Media',
  'gaming':           'Gaming & Interactive Media',
};

// ─── POST /api/github/import ──────────────────────────────────────────────────
router.post('/import', async (req: Request, res: Response) => {
  const { username } = req.body as { username: string };
  if (!username?.trim()) { res.status(400).json({ error: 'GitHub username required' }); return; }

  try {
    const ghToken = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'User-Agent': 'CareerPathGenerator/1.0',
      'Accept': 'application/vnd.github.v3+json',
      ...(ghToken ? { 'Authorization': `Bearer ${ghToken}` } : {}),
    };

    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers, signal: AbortSignal.timeout(8000) }),
      fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=30`, { headers, signal: AbortSignal.timeout(8000) }),
    ]);

    if (!profileRes.ok) {
      if (profileRes.status === 404) { res.status(404).json({ error: `GitHub user "${username}" not found` }); return; }
      if (profileRes.status === 403 || profileRes.status === 429) {
        res.status(429).json({ error: 'GitHub API rate limit reached. Add a GITHUB_TOKEN to your backend environment variables to fix this.' });
        return;
      }
      throw new Error(`GitHub API error: ${profileRes.status}`);
    }

    const profile: any = await profileRes.json();
    const repos: any[] = reposRes.ok ? (await reposRes.json()) as any[] : [];

    // Extract languages from repos
    const langCount: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) {
        langCount[repo.language] = (langCount[repo.language] ?? 0) + (repo.stargazers_count + 1);
      }
    }
    const technicalSkills = Object.entries(langCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([lang]) => lang);

    // Extract domains from repo topics
    const topicSet = new Set<string>();
    for (const repo of repos) {
      for (const topic of repo.topics ?? []) {
        const mapped = DOMAIN_MAP[topic.toLowerCase()];
        if (mapped) topicSet.add(mapped);
      }
    }
    const suggestedDomains = [...topicSet].slice(0, 5);

    // Account age in years
    const accountAgeYears = profile.created_at
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : null;

    // Leadership proxy: total stars + followers
    const totalStars = repos.reduce((s: number, r: any) => s + (r.stargazers_count ?? 0), 0);
    const leadershipHint = Math.min(10, Math.round((profile.followers / 10) + (totalStars / 50)));

    res.json({
      technicalSkills,
      suggestedDomains,
      accountAgeYears,
      leadershipHint,
      publicRepos: profile.public_repos,
      bio: profile.bio ?? '',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ error: `Could not fetch GitHub profile: ${msg}` });
  }
});

export default router;
