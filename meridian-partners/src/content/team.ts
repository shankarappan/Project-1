export type TeamMember = {
  slug: string;
  name: string;
  role: string;
  focus: string;
  email?: string;
  phone?: string;
  image: string;
  credentials?: string;
  memberships: string[];
  bio: string[];
  featured: boolean;
};

export const team: TeamMember[] = [
  {
    slug: "adelina-ong",
    name: "Adelina Ong",
    role: "Partner and Notary Public",
    focus: "Property, Trust and Commercial",
    email: "adelina@mplaw.nz",
    phone: "021 0219 8883",
    image: "/images/team/adelina-ong.png",
    credentials: "Admitted 2001",
    memberships: [
      "New Zealand Law Society",
      "Auckland District Law Society",
      "Property Law Section, New Zealand Law Society",
      "New Zealand Society of Notaries",
      "Committee Member, The Law Association of New Zealand (TLANZ)",
    ],
    bio: [
      "Adelina Ong is a senior New Zealand property lawyer specialising in complex property transactions and development work, with more than 20 years’ experience advising developers, investors, business owners, and overseas purchasers.",
      "Admitted as a lawyer in 2001, Adelina has practised in New Zealand and Queensland, Australia, and has worked both in private practice and as in-house legal counsel for a national property development and project management company. This background gives her a commercial, outcomes-driven approach that goes beyond standard legal advice.",
      "Before joining Meridian Partners, Adelina ran her own specialist property practice for seven years, acting on high-value and sophisticated transactions that require careful structuring, risk management, and coordination with clients, financiers, surveyors, tax advisers, planners, and local authorities.",
      "She focuses on technically demanding property matters including subdivisions and staged developments, complex easements and covenants, commercial acquisitions and leasing, OIO approvals, unit titles, cross-lease conversions, and property structuring for investors.",
    ],
    featured: true,
  },
  {
    slug: "dave-ananth",
    name: "Dave Ananth",
    role: "Partner",
    focus: "Tax Disputes & Commercial Negotiations",
    email: "dave@mplaw.nz",
    phone: "021 0216 8888",
    image: "/images/team/dave-ananth.png",
    credentials: "LLB · Honorary Consul of Timor-Leste (Auckland)",
    memberships: [
      "Honorary Consul of Timor-Leste (Auckland, NZ)",
      "Admitted as Barrister & Solicitor of New Zealand High Court 1989",
      "Honorary Advisor (ASEAN Region) – Auckland Business Chamber",
      "President – New Zealand Malaysian Business Association (NZMBA)",
      "Layperson Member – NZ Health Practitioners Disciplinary Tribunal",
      "Trustee – Atmabhav",
    ],
    bio: [
      "In the complex world of Inland Revenue negotiations, Dave Ananth stands out for legal acumen and a perspective few in the private sector possess. As a partner and tax barrister at Meridian Partners, he has built a reputation as an “insider” advocate — earned through a career that includes serving as a former Inland Revenue Department prosecutor and adjudicator.",
      "With over 35 years of experience across New Zealand and international jurisdictions — including tenure as a Magistrate and Judicial Officer in Malaysia — Dave brings calm, judicial rigor to high-stakes tax negotiation.",
      "He specialises in student loan debt resolution for local and overseas borrowers, tax debt management, penalty relief, and early intervention strategies designed to resolve matters before they escalate.",
    ],
    featured: true,
  },
  {
    slug: "arvind-nair",
    name: "Arvind Nair",
    role: "Partner",
    focus: "Commercial Litigation",
    email: "arvind@mplaw.nz",
    phone: "021 033 5253",
    image: "/images/team/arvind-nair.png",
    credentials: "BCom, LLB (Hons)",
    memberships: ["New Zealand Law Society", "RITANZ"],
    bio: [
      "Arvind Nair is a commercial litigator and partner at Meridian Partners, with a practice focused on high-stakes disputes, regulatory challenges, and complex commercial litigation.",
      "He is regularly before the Auckland High Court, acting for individuals, business owners, and companies in matters where outcomes matter and early strategic decisions can determine the entire case.",
      "Arvind is known for clear thinking under pressure, sharp advocacy, and a disciplined approach to litigation — particularly in disputes involving financial exposure, regulatory risk, or reputational consequences.",
      "His practice covers contractual and shareholder disputes, judicial review, CCCFA litigation, tax disputes, injunctions, insolvency litigation, employment litigation, and Fair Trading matters.",
    ],
    featured: true,
  },
  {
    slug: "michelle-delegat",
    name: "Michelle Delegat",
    role: "Solicitor",
    focus: "Employment Law & Family Law",
    email: "michelle@mplaw.nz",
    phone: "022 469 6564",
    image: "/images/team/michelle-delegat.png",
    credentials: "BBS (Hons), MBS, LLB",
    memberships: ["New Zealand Law Society"],
    bio: [
      "Michelle Delegat is a solicitor at Meridian Partners with a practice focused on employment law and family law matters, supporting individuals and businesses through practical, people-focused legal issues.",
      "She joined the firm following her admission to the bar in 2025, after completing her LLB at Auckland University of Technology, where she was awarded top academic student for her undergraduate year. She also holds a Bachelor of Business Studies (Honours) and a Master of Business Studies from Massey University.",
      "Before entering legal practice, Michelle worked in corporate recruitment management, giving her first-hand insight into workplace dynamics and organisational decision-making.",
    ],
    featured: true,
  },
  {
    slug: "kevin-tiew",
    name: "Kevin Tiew",
    role: "Solicitor",
    focus: "Property and Commercial",
    email: "kevin@mplaw.co.nz",
    phone: "022 130 3643",
    image: "/images/team/kevin-tiew.jpg",
    credentials: "LLB",
    memberships: [
      "New Zealand Law Society",
      "Property Law Section, New Zealand Law Society",
    ],
    bio: [
      "Kevin advises clients on a wide range of property, commercial, and business matters, acting for property owners, investors, developers, business owners, and private companies throughout New Zealand.",
      "His practice centres on communicating legal and commercial issues clearly and suggesting practical, commercially viable solutions — across residential and commercial property transactions, leasing, business acquisitions, financing arrangements, and trust matters.",
    ],
    featured: false,
  },
  {
    slug: "liz-culpan",
    name: "Liz Culpan",
    role: "Practice & Finance Manager",
    focus: "Operations & Finance",
    email: "liz@mplaw.co.nz",
    image: "/images/team/liz-culpan.jpg",
    memberships: [],
    bio: [
      "Liz Culpan is responsible for the firm’s management in both financial and operational matters. She oversees financial performance, operations, and regulatory compliance, and provides reporting to support the firm’s strategic growth.",
      "Liz also assists the partners with day-to-day business operations including human resources, policy, supplier engagement, and the systems that keep the firm running smoothly.",
    ],
    featured: false,
  },
  {
    slug: "simran-aujla",
    name: "Simran Aujla",
    role: "Clerk",
    focus: "Legal Support",
    image: "/images/team/simran-aujla.png",
    memberships: [],
    bio: [
      "Simran supports the firm’s lawyers with research, document preparation, and client file administration as part of Meridian Partners’ clerking team.",
    ],
    featured: false,
  },
  {
    slug: "priyanka-lavan",
    name: "Priyanka Lavan",
    role: "Clerk",
    focus: "Legal Support",
    image: "/images/team/priyanka-lavan.jpg",
    memberships: [],
    bio: [
      "Priyanka supports the firm’s lawyers with research, document preparation, and client file administration as part of Meridian Partners’ clerking team.",
    ],
    featured: false,
  },
];

export function getTeamMember(slug: string) {
  return team.find((m) => m.slug === slug);
}

export const featuredTeam = team.filter((m) => m.featured);
