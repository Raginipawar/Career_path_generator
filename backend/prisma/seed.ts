// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const clusters = [
  { name: 'Software Engineering', description: 'Building software applications and systems', domains: ['tech', 'fintech', 'healthtech'], demandScore: 92, growthTrend: 'rising', avgSalary: 1800000, topSkills: ['JavaScript', 'Python', 'System Design', 'DSA'] },
  { name: 'Data Science & Analytics', description: 'Extracting insights from data using ML/statistics', domains: ['tech', 'finance', 'healthcare'], demandScore: 89, growthTrend: 'rising', avgSalary: 1600000, topSkills: ['Python', 'SQL', 'Machine Learning', 'Statistics'] },
  { name: 'AI/ML Engineering', description: 'Building and deploying AI systems', domains: ['tech', 'research', 'products'], demandScore: 95, growthTrend: 'rising', avgSalary: 2200000, topSkills: ['PyTorch', 'TensorFlow', 'MLOps', 'LLMs'] },
  { name: 'Product Management', description: 'Defining product vision and roadmaps', domains: ['tech', 'e-commerce', 'saas'], demandScore: 85, growthTrend: 'rising', avgSalary: 2000000, topSkills: ['Strategy', 'Data Analysis', 'Agile', 'Stakeholder Management'] },
  { name: 'DevOps & Cloud Engineering', description: 'Infrastructure, CI/CD, and cloud platforms', domains: ['tech', 'fintech', 'enterprise'], demandScore: 88, growthTrend: 'rising', avgSalary: 1900000, topSkills: ['AWS', 'Docker', 'Kubernetes', 'Terraform'] },
  { name: 'Cybersecurity', description: 'Protecting systems and data from threats', domains: ['finance', 'government', 'tech'], demandScore: 91, growthTrend: 'rising', avgSalary: 1700000, topSkills: ['Penetration Testing', 'SIEM', 'Cryptography', 'Compliance'] },
  { name: 'UX/UI Design', description: 'Designing intuitive and beautiful user experiences', domains: ['tech', 'e-commerce', 'media'], demandScore: 78, growthTrend: 'stable', avgSalary: 1200000, topSkills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'] },
  { name: 'FinTech & Banking', description: 'Technology in financial services', domains: ['finance', 'banking', 'insurance'], demandScore: 82, growthTrend: 'rising', avgSalary: 1800000, topSkills: ['Payments', 'Blockchain', 'Risk Models', 'Regulatory Compliance'] },
  { name: 'Healthcare & MedTech', description: 'Technology applied to health and medicine', domains: ['healthcare', 'biotech', 'research'], demandScore: 80, growthTrend: 'rising', avgSalary: 1400000, topSkills: ['Medical Imaging', 'EHR Systems', 'Clinical Informatics', 'HIPAA'] },
  { name: 'Education Technology', description: 'Building tools and platforms for learning', domains: ['edtech', 'nonprofits', 'government'], demandScore: 72, growthTrend: 'stable', avgSalary: 1000000, topSkills: ['Instructional Design', 'LMS', 'Gamification', 'Content Creation'] },
  { name: 'Research & Academia', description: 'Academic or industry research careers', domains: ['academia', 'research labs', 'R&D'], demandScore: 68, growthTrend: 'stable', avgSalary: 900000, topSkills: ['Research Methodology', 'Publishing', 'Grant Writing', 'Statistics'] },
  { name: 'Entrepreneurship & Startups', description: 'Founding or joining early-stage companies', domains: ['any'], demandScore: 70, growthTrend: 'rising', avgSalary: 600000, topSkills: ['Business Development', 'Fundraising', 'Product', 'Leadership'] },
  { name: 'Consulting & Strategy', description: 'Business and technology consulting', domains: ['consulting', 'enterprise', 'government'], demandScore: 76, growthTrend: 'stable', avgSalary: 1600000, topSkills: ['Problem Solving', 'Communication', 'Excel', 'Project Management'] },
  { name: 'Supply Chain & Logistics', description: 'Optimizing movement of goods and services', domains: ['manufacturing', 'e-commerce', 'logistics'], demandScore: 74, growthTrend: 'rising', avgSalary: 1100000, topSkills: ['ERP', 'Forecasting', 'Procurement', 'Lean'] },
  { name: 'Digital Marketing', description: 'Growth, branding, and online marketing', domains: ['e-commerce', 'media', 'startups'], demandScore: 71, growthTrend: 'stable', avgSalary: 900000, topSkills: ['SEO/SEM', 'Analytics', 'Social Media', 'Content Strategy'] },
  { name: 'Embedded Systems & IoT', description: 'Low-level hardware and connected device software', domains: ['manufacturing', 'automotive', 'smart devices'], demandScore: 77, growthTrend: 'rising', avgSalary: 1400000, topSkills: ['C/C++', 'RTOS', 'Firmware', 'Protocols'] },
  { name: 'Robotics & Automation', description: 'Building intelligent robotic systems', domains: ['manufacturing', 'logistics', 'defence'], demandScore: 83, growthTrend: 'rising', avgSalary: 1600000, topSkills: ['ROS', 'Computer Vision', 'Control Systems', 'Simulation'] },
  { name: 'Game Development', description: 'Creating video games and interactive experiences', domains: ['gaming', 'entertainment', 'metaverse'], demandScore: 65, growthTrend: 'stable', avgSalary: 1000000, topSkills: ['Unity', 'Unreal Engine', 'C#', 'Graphics Programming'] },
  { name: 'Blockchain & Web3', description: 'Decentralized applications and smart contracts', domains: ['crypto', 'finance', 'gaming'], demandScore: 62, growthTrend: 'declining', avgSalary: 1800000, topSkills: ['Solidity', 'Ethereum', 'DeFi', 'Smart Contracts'] },
  { name: 'AR/VR Development', description: 'Immersive augmented and virtual reality experiences', domains: ['gaming', 'education', 'enterprise'], demandScore: 69, growthTrend: 'rising', avgSalary: 1500000, topSkills: ['Unity XR', 'Three.js', 'Spatial Computing', '3D Modeling'] },
  { name: 'Technical Writing & Developer Relations', description: 'Communicating complex technology to developers', domains: ['tech', 'SaaS', 'open source'], demandScore: 64, growthTrend: 'stable', avgSalary: 1100000, topSkills: ['Technical Writing', 'Developer Advocacy', 'API Documentation', 'Community'] },
  { name: 'Bioinformatics', description: 'Applying computing to biological data', domains: ['biotech', 'pharma', 'research'], demandScore: 73, growthTrend: 'rising', avgSalary: 1300000, topSkills: ['Python/R', 'Genomics', 'Sequence Analysis', 'Statistics'] },
];

async function main() {
  console.log('🌱 Seeding career clusters...');
  
  for (const cluster of clusters) {
    await prisma.careerCluster.upsert({
      where: { name: cluster.name },
      update: cluster,
      create: cluster,
    });
    console.log(`  ✅ ${cluster.name}`);
  }
  
  console.log(`\n✅ Seeded ${clusters.length} career clusters successfully!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
