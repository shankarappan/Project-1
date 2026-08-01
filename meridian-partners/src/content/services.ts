export type Service = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  highlights: string[];
};

export const services: Service[] = [
  {
    slug: "property-subdivision-development",
    title: "Property, Subdivision & Development",
    summary:
      "Clear guidance through subdivision conditions, development milestones, and title issue — so projects keep moving without costly delays.",
    body: `Property subdivision and development work demands precise interpretation of consent conditions, careful coordination with surveyors and councils, and disciplined management of title risks.

Meridian Partners advises developers, investors, and landowners through acquisition, consent compliance, easements and covenants, staged developments, unit titles, and the path to new titles. We focus on practical sequencing so conditions are met efficiently and settlements stay on track.`,
    highlights: [
      "Subdivision condition compliance",
      "Staged developments and title issue",
      "Easements, covenants, and access issues",
      "Unit titles and body corporate matters",
    ],
  },
  {
    slug: "commercial-litigation",
    title: "Commercial Litigation",
    summary:
      "Strong, clear representation for business disputes, regulatory challenges, and high-stakes commercial conflict.",
    body: `Business disputes can disrupt operations and create financial and reputational risk. Our litigation team provides early strategic advice and disciplined advocacy before the Auckland High Court and other forums.

We act in contractual and shareholder disputes, injunctions, insolvency litigation, judicial review, CCCFA matters, and complex commercial claims — with a focus on outcomes that protect your position.`,
    highlights: [
      "Contract and shareholder disputes",
      "Injunctions and urgent relief",
      "Insolvency and director liability",
      "Regulatory and judicial review matters",
    ],
  },
  {
    slug: "tax-disputes-ird-negotiation",
    title: "Tax Disputes & IRD Negotiation",
    summary:
      "Practical solutions for Inland Revenue investigations, disputes, and tax debt — led by a former IRD prosecutor and adjudicator.",
    body: `Dealing with Inland Revenue investigations or tax disputes can be complex and stressful. Meridian Partners helps individuals and businesses negotiate practical solutions with IRD, drawing on deep institutional knowledge of how enforcement and dispute processes work.

We assist with early intervention, settlement strategy, penalty and interest remission discussions, and structured repayment pathways designed to restore certainty.`,
    highlights: [
      "IRD investigations and disputes",
      "Tax debt negotiation",
      "Penalty and interest relief strategy",
      "Business and personal tax matters",
    ],
  },
  {
    slug: "student-loan-debt-ird-negotiation",
    title: "Student Loan Debt & Penalties",
    summary:
      "Negotiation support for overdue student loans, overseas borrowers, and penalty relief — including cases affecting travel and border certainty.",
    body: `Student loan debt can spiral through compounding interest and penalties, especially for Kiwis living overseas. We assist borrowers to negotiate repayment arrangements, explore amnesty or settlement options, and resolve long-standing balances so travel and compliance risk can be reduced.

Our approach prioritises clear communication with IRD, realistic repayment structures, and practical outcomes.`,
    highlights: [
      "Overseas borrower negotiations",
      "Penalty and interest remission",
      "Repayment arrangements",
      "Border certainty support",
    ],
  },
  {
    slug: "family-law",
    title: "Family Law",
    summary:
      "Sensitive, practical support for relationship property, parenting, separation, and Family Court processes.",
    body: `Family matters require both legal expertise and care. We help clients resolve relationship property, parenting arrangements, separation agreements, protection order applications, and Family Court processes with clear guidance and steady support.

We aim to reduce uncertainty, document outcomes properly, and help you take the next step with confidence.`,
    highlights: [
      "Relationship property",
      "Separation agreements",
      "Parenting and Family Court support",
      "Protection order applications",
    ],
  },
  {
    slug: "asset-protection-estate-planning",
    title: "Asset Protection & Estate Planning",
    summary:
      "Wills, trusts, and estate planning structured to protect family assets and carry out your wishes.",
    body: `Planning ahead helps protect your assets and ensures your wishes are followed. We assist with wills, trusts, estate planning, and asset protection strategies so your family and assets are properly safeguarded for the future.

Advice is tailored to your circumstances — whether you are protecting a family home, business interests, or intergenerational wealth.`,
    highlights: [
      "Wills and enduring powers",
      "Trust establishment and advice",
      "Estate planning strategies",
      "Asset protection structuring",
    ],
  },
  {
    slug: "acquisitions-and-sales",
    title: "Property & Business Acquisitions & Sales",
    summary:
      "Due diligence and settlement support for buying or selling property, businesses, and franchises.",
    body: `Buying or selling a property, business, or franchise requires careful legal guidance. We assist with due diligence, agreement review, risk identification, and smooth settlement so transactions remain cost and time effective.

Our team coordinates the moving parts — financiers, counterparties, and conditions — so completion is as hassle-free as possible.`,
    highlights: [
      "Residential and commercial sales",
      "Business and franchise purchases",
      "Due diligence and risk review",
      "Settlement management",
    ],
  },
  {
    slug: "commercial-contracts",
    title: "Commercial Contract Drafting & Advice",
    summary:
      "Clear, enforceable agreements that protect your business interests and reduce the chance of disputes.",
    body: `Well-written contracts help prevent disputes and protect your commercial position. We draft, review, and advise on commercial agreements so terms are fair, enforceable, and aligned with your objectives.

From supplier and customer contracts to shareholders’ agreements and bespoke commercial arrangements, we focus on clarity and practical risk allocation.`,
    highlights: [
      "Contract drafting and review",
      "Shareholder and joint venture agreements",
      "Supplier and customer terms",
      "Risk allocation advice",
    ],
  },
  {
    slug: "employment-law",
    title: "Employment Law",
    summary:
      "Practical employment advice for personal grievances, agreements, disciplinary processes, and workplace disputes.",
    body: `Employment issues benefit from early, clear advice. We support employees and employers with personal grievances, employment agreements and policies, disciplinary and performance processes, mediation preparation, and Employment Relations Authority matters.

Our approach is practical and people-focused, informed by real workplace experience.`,
    highlights: [
      "Personal grievances",
      "Employment agreements and policies",
      "Disciplinary processes",
      "Mediation and ERA support",
    ],
  },
];

export function getService(slug: string) {
  return services.find((s) => s.slug === slug);
}
