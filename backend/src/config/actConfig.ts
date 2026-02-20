/**
 * Act Configuration Structure for Terraform Industries Simulation
 * 
 * This file defines the structure and content for all 4 acts.
 * Act I is fully implemented; Acts II-IV are placeholders for future implementation.
 */

import { DecisionEventData } from '../models/DecisionEvent';

export interface ActDocument {
  id: string;
  title: string;
  content: string;
  type?: 'memo' | 'financial' | 'letter' | 'brief' | 'report';
}

export interface ActOption {
  id: string; // 'A', 'B', or 'C'
  title: string;
  description: string;
  implications?: string[];
}

export interface ActSection {
  id: string;
  title: string;
  content: string;
  collapsible?: boolean;
}

export interface ActConfig {
  actNumber: number;
  title: string;
  context: {
    sections: ActSection[];
    stakeholderPerspectives?: ActSection[];
  };
  documents: ActDocument[];
  options: ActOption[];
}

export const actConfigs: Record<number, ActConfig> = {
  1: {
    actNumber: 1,
    title: "Terraform Industries' Crossroads — Strategic Trigger (SCOS decision)",
    context: {
      sections: [
      {
        id: 'company-overview',
        title: 'Company Overview',
        content: `Founded: 1989
HQ: Stuttgart, Germany
Sector: Industrial robotics for construction & infrastructure

Core Products:
• Smart robotic arms for modular construction
• Autonomous pavement repair units
• Site analytics + safety monitoring systems

Core Values:
• Engineering precision
• Long-term partnerships
• Operational transparency

Competitive Positioning:
• Niche player with strong reputation in Europe
• Facing pressure from Asian competitors with faster innovation cycles
• Known for "slow but solid" approach`,
        collapsible: true
      },
        {
          id: 'trigger-metrics',
          title: 'Trigger Metrics (Q1 2025)',
          content: `The company faces significant challenges: raw material input costs have increased 20% year-over-year, two largest suppliers are demanding quarterly price renegotiations, inventory holding period has reached 79 days, and profit margins have declined from 41% to 37.8%.`,
          collapsible: true
        },
        {
          id: 'scos-proposal',
          title: 'SCOS Proposal Summary',
          content: `A GenAI-based Supply Chain Optimization System (SCOS) has been proposed. Key functions include predictive pricing, supplier risk scoring, optimal order timing, and semi-automated negotiation prompts. Pilot outcomes show retrospective savings of 12.4% with ROI projected at 14-18 months. Initial cost is €5M with €400k/year ongoing costs. Risks include supplier relations disruption, internal pushback/union concerns, and transparency limits.`,
          collapsible: true
        }
      ],
      stakeholderPerspectives: [
        {
          id: 'cfo-perspective',
          title: 'CFO Perspective',
          content: 'Cautious about €5M risk and hidden change costs. Concerned about ROI timeline and budget impact.',
          collapsible: true
        },
        {
          id: 'engineering-perspective',
          title: 'Engineering Perspective',
          content: 'Supports the proposal due to competitive pressure and need for modernization.',
          collapsible: true
        },
        {
          id: 'procurement-perspective',
          title: 'Procurement Director Perspective',
          content: 'Fears supplier trust erosion and potential disruption to long-standing relationships. Multiple suppliers are requesting price increases due to rising costs, which adds pressure to our procurement strategy.',
          collapsible: true
        },
        {
          id: 'hr-perspective',
          title: 'HR Perspective',
          content: 'Warns of potential union strike and need for careful change management.',
          collapsible: true
        },
        {
          id: 'union-perspective',
          title: 'Union Letter',
          content: 'We represent 14 employees whose roles could be affected. We need guarantees about job security, retraining opportunities, and transparency about how the system will be used.',
          collapsible: true
        }
      ]
    },
    documents: [
      {
        id: 'financial-snapshot-q4-2024',
        title: 'Financial Snapshot Q4 2024',
        type: 'financial',
        content: `Q4 2024 Financial Overview:
- Revenue: €420M (annual)
- Profit Margin: 37.8% (down from 41%)
- Raw Material Costs: +20% YoY
- Inventory Holding Period: 79 days
- Two largest suppliers requesting quarterly price renegotiations
- Operating expenses stable but margins under pressure`
      },
      {
        id: 'internal-memo-scos',
        title: 'Internal Memo: SCOS Proposal',
        type: 'memo',
        content: `MEMORANDUM
To: CEO, CTO, CFO
From: Strategy and Operations Team
Date: Feb 26, 2025
Subject: Proposal – Supply Chain Optimization System (SCOS)

KEY FUNCTIONS
• Predictive pricing (inputs, metals, electronics)
• Automated risk scoring for suppliers
• Suggest optimal order timing
• Semi-automated negotiation prompts

PILOT OUTCOME
• Trained on 2021–2024 data
• Retrospective savings: 12.4%
• Projected ROI: 14–18 months (full-scale)

COST
• Initial deployment: €5M
• Ongoing: €400k/year

RISKS
• Supplier relations disruption
• Internal pushback (procurement & union)
• AI transparency/explainability limitations`
      },
      {
        id: 'union-letter',
        title: 'Union Letter',
        type: 'letter',
        content: `LETTER FROM IG METALL CHAPTER
To: Management Board, Terraform Industries
From: IG Metall Chapter Representative
Date: Q1 2025

SUBJECT: Concerns Regarding SCOS Implementation

Dear Management,

We write to express our serious concerns regarding the proposed SCOS implementation:

• Job security (14 procurement positions)
• Workplace surveillance
• Skill devaluation
• Request pause and consultation`
      },
      {
        id: 'market-brief',
        title: 'Market Brief & Competitor Analysis',
        type: 'brief',
        content: `MARKET BRIEF – McKern & Hall Insights (Feb 2025)
"GenAI in industrial supply chains is accelerating. Early adopters report 10–20% reduction in lead times and cost volatility. However, firms without proper stakeholder integration face backlash and reputational risk."

COMPETITOR HIGHLIGHT: HexaBuild (Finland)
• Adopted AI procurement planning Q2 2024
• Cut raw material volatility costs by 15%
• Faced supplier turnover, grew market share by 7%
• Featured in SmartIndustry Weekly for "Operational Boldness"`
      }
    ],
    options: [
      {
        id: 'A',
        title: 'Full SCOS Rollout (AI-Driven Transformation)',
        description: 'Proceed with the full €5M investment across five departments. This represents a major organizational transformation with uncertain stakeholder outcomes.',
        implications: [
          '€5M immediate investment',
          'Major organizational change across five departments',
          'Uncertain stakeholder reactions',
          'Potential for significant cost savings',
          'Risk of supplier relationship disruption',
          'Union concerns must be addressed'
        ]
      },
      {
        id: 'B',
        title: 'Human-Centric Renegotiation',
        description: 'No immediate investment. Focus on maintaining relationships and traditional negotiation approaches. Long-term capability development remains uncertain.',
        implications: [
          'No immediate investment required',
          'Maintain existing supplier relationships',
          'Preserve current organizational structure',
          'Long-term competitive capability uncertainty',
          'May fall behind competitors',
          'Cost pressures continue'
        ]
      },
      {
        id: 'C',
        title: 'Controlled Pilot with External Startup',
        description: 'Pilot cost €1.2M with an external AI startup. This approach allows for learning effects and risk mitigation, but scaling success remains uncertain.',
        implications: [
          '€1.2M pilot investment',
          'External AI startup partnership',
          'Learning and experimentation opportunity',
          'Lower initial risk exposure',
          'Uncertain scaling path',
          'Potential for gradual adoption'
        ]
      }
    ]
  },
  2: {
    actNumber: 2,
    title: 'Act II (Placeholder)',
    context: {
      sections: [
        {
          id: 'placeholder',
          title: 'Coming Soon',
          content: 'Act II content will be implemented based on Act I decision pathway.'
        }
      ]
    },
    documents: [],
    options: []
  },
  3: {
    actNumber: 3,
    title: 'Act III (Placeholder)',
    context: {
      sections: [
        {
          id: 'placeholder',
          title: 'Coming Soon',
          content: 'Act III content will be implemented based on previous act decisions.'
        }
      ]
    },
    documents: [],
    options: []
  },
  4: {
    actNumber: 4,
    title: 'Act IV (Placeholder)',
    context: {
      sections: [
        {
          id: 'placeholder',
          title: 'Coming Soon',
          content: 'Act IV content will be implemented based on Act III identity track.'
        }
      ]
    },
    documents: [],
    options: []
  }
};

export type IdentityTrack = 'Efficiency at Scale' | 'Managed Adaptation' | 'Relational Foundation';

export function deriveIdentityTrackFromAct2Decision(decision: string): IdentityTrack {
  const normalized = decision?.toUpperCase();
  if (normalized === 'A1' || normalized === 'C3') {
    return 'Efficiency at Scale';
  }
  if (normalized === 'A2' || normalized === 'A3' || normalized === 'B2' || normalized === 'C1') {
    return 'Managed Adaptation';
  }
  if (normalized === 'B1' || normalized === 'C2') {
    return 'Relational Foundation';
  }
  return 'Managed Adaptation';
}

export function getAct2DecisionForIdentityTrack(track: IdentityTrack): string {
  if (track === 'Efficiency at Scale') {
    return 'A1';
  }
  if (track === 'Relational Foundation') {
    return 'B1';
  }
  return 'A2';
}

/**
 * Get Act II content based on Act I decision path
 */
function getActIIConfig(act1Decision: string): ActConfig {
  const baseTitle = "ACT II — Between Resistance and Momentum";
  
  if (act1Decision === 'A') {
    // PATH A: Full SCOS Rollout
    return {
      actNumber: 2,
      title: baseTitle,
      context: {
        sections: [
          {
            id: 'what-changed',
            title: 'What Changed Since Act I?',
            content: `Three weeks after greenlighting the full deployment of the SCOS (Supply Chain Optimization System), Terraform Industries enters an accelerated AI integration phase. As CEO, you now face early organizational turbulence. Initial system testing reveals both operational promise and rising internal resistance. A number of procurement staff have requested transfers. Supplier sentiment is cooling. The board, meanwhile, expects a confident Q2 investor update. You must decide how to steer the early-stage rollout: whether to push forward at speed, pause to reset stakeholder alignment, or redesign the change management approach entirely.`
          },
          {
            id: 'executive-summary',
            title: 'Executive Summary',
            content: `Three weeks after greenlighting the full deployment of the SCOS (Supply Chain Optimization System), Terraform Industries enters an accelerated AI integration phase. As CEO, you now face early organizational turbulence. Initial system testing reveals both operational promise and rising internal resistance. A number of procurement staff have requested transfers. Supplier sentiment is cooling. The board, meanwhile, expects a confident Q2 investor update. You must decide how to steer the early-stage rollout: whether to push forward at speed, pause to reset stakeholder alignment, or redesign the change management approach entirely.`
          }
        ],
        stakeholderPerspectives: [
          {
            id: 'procurement-anxiety',
            title: 'Procurement Team Concerns',
            content: 'Internal HR reports +14% rise in "AI anxiety" among procurement teams. Several team members have requested transfers to other departments.'
          },
          {
            id: 'supplier-trust',
            title: 'Supplier Relations Update',
            content: 'Supplier concerns about transparency and algorithmic bias are growing. Some key suppliers are expressing discomfort with the AI-driven negotiation process. Additionally, several suppliers are requesting price increases due to rising operational costs, which complicates the negotiation landscape.'
          },
          {
            id: 'hr-union',
            title: 'HR & Union Update',
            content: 'HR flags increased tension. Union representatives are requesting more frequent consultations about job security and training opportunities.'
          },
          {
            id: 'board-pressure',
            title: 'Board & Investor Pressure',
            content: 'Board expects confident Q2 investor update. They want to see clear progress metrics and stakeholder alignment before the next quarterly meeting.'
          },
          {
            id: 'press-inquiry',
            title: 'Press Inquiry',
            content: 'Handelsblatt has submitted an inquiry about AI-induced layoffs and the impact on Terraform\'s workforce. PR team needs guidance on response strategy.'
          }
        ]
      },
      documents: [
        {
          id: 'scos-deployment-status',
          title: 'SCOS Deployment Status Report',
          type: 'report',
          content: `SCOS DEPLOYMENT STATUS REPORT
Date: Q2 2025 (3 weeks post-decision)

DEPLOYMENT PROGRESS:
• SCOS installed in two pilot departments
• Procurement process time reduced by 18%
• Data quality issues persist in some categories

CHALLENGES:
• Internal resistance from procurement teams
• Supplier trust concerns
• Data integration complexity in legacy systems

NEXT STEPS:
• Expansion to remaining three departments planned for Q3
• Training modules in development
• Stakeholder alignment sessions scheduled`
        }
      ],
      options: [
        {
          id: 'A1',
          title: 'Accelerate Rollout Across All Five Departments',
          description: 'Expand SCOS into remaining three departments by Q3. Press briefing on AI transformation vision. Short-form AI training modules (3-week rotation).',
          implications: [
            'Full deployment by Q3',
            'Press briefing required',
            '3-week training rotation',
            'Faster time to value',
            'Higher risk of resistance',
            'Board visibility increases'
          ]
        },
        {
          id: 'A2',
          title: 'Launch AI Change Management Task Force',
          description: 'Pause expansion temporarily; create cross-functional task force (HR/Eng/Procurement). Open forums + anonymous feedback loops. Extend deployment timeline by ~2 months.',
          implications: [
            'Temporary pause on expansion',
            'Cross-functional collaboration',
            'Stakeholder engagement',
            'Extended timeline (~2 months)',
            'Better alignment',
            'Slower progress'
          ]
        },
        {
          id: 'A3',
          title: 'Strategic Reset: Pivot to Targeted AI Procurement',
          description: 'Limit SCOS to high-volume, low-risk categories. Manual oversight for key supplier relationships. Reframe AI as decision-assist, not automation.',
          implications: [
            'Targeted deployment',
            'Manual oversight for key suppliers',
            'AI as assistive tool',
            'Lower risk approach',
            'Preserves relationships',
            'Limited efficiency gains'
          ]
        }
      ]
    };
  } else if (act1Decision === 'B') {
    // PATH B: Human-Centric Renegotiation
    return {
      actNumber: 2,
      title: "Commitment or Complacency? Terraform's Human-Centric Bet",
      context: {
        sections: [
          {
            id: 'what-changed',
            title: 'What Changed Since Act I?',
            content: `Two weeks after rejecting the AI proposal in favor of a relationship-first renegotiation strategy, Terraform enters a tense procurement phase. While supplier relations remain stable and employee morale has improved, the underlying cost pressures persist. Some competitors are reportedly gaining agility through digital procurement tools. Internally, voices of discontent emerge from the operations and finance departments. As CEO, you must decide how to balance stakeholder trust with the urgent need for adaptive efficiency.`
          },
          {
            id: 'executive-summary',
            title: 'Executive Summary',
            content: `Two weeks after rejecting the AI proposal in favor of a relationship-first renegotiation strategy, Terraform enters a tense procurement phase. While supplier relations remain stable and employee morale has improved, the underlying cost pressures persist. Some competitors are reportedly gaining agility through digital procurement tools. Internally, voices of discontent emerge from the operations and finance departments. As CEO, you must decide how to balance stakeholder trust with the urgent need for adaptive efficiency.`
          }
        ],
        stakeholderPerspectives: [
          {
            id: 'operations-pressure',
            title: 'Operations & Finance Pressure',
            content: 'Internal push for stronger digital investment. Operations team reports inefficiencies compared to competitors using AI tools. Finance highlights margin pressure.'
          },
          {
            id: 'suppliers-supportive',
            title: 'Supplier Relations Update',
            content: 'Q1 renegotiations completed; 74% contracts secured at reduced volatility terms. Supplier satisfaction +12% YoY. Suppliers appreciate the relationship-first approach. However, some suppliers are still requesting price increases due to rising costs, which requires ongoing negotiation.'
          },
          {
            id: 'competitor-rumor',
            title: 'Competitor Intelligence',
            content: 'Rumors: HexaBuild will release fully automated AI supply stack in Q3. This could give them significant competitive advantage in cost and speed.'
          },
          {
            id: 'board-expectations',
            title: 'Board Expectations',
            content: 'Board wants clarity on long-term strategy. They\'re asking whether the human-centric approach can scale and remain competitive.'
          },
          {
            id: 'procurement-morale',
            title: 'Procurement Team Morale',
            content: 'Procurement team morale improved significantly. Team feels valued and reports better work-life balance without AI pressure.'
          }
        ]
      },
      documents: [
        {
          id: 'q1-renegotiation-results',
          title: 'Q1 Renegotiation Results',
          type: 'report',
          content: `Q1 RENEGOTIATION RESULTS REPORT
Date: Q2 2025

SUMMARY:
• 74% contracts secured at reduced volatility terms
• Supplier satisfaction +12% YoY
• Margins stabilized but only modestly (+0.4%) due to inflation
• Relationship quality improved significantly

CHALLENGES:
• Cost pressures persist
• Competitive gap widening
• Digital transformation lagging

OPPORTUNITIES:
• Strong supplier partnerships
• High team morale
• Stable operations`
        }
      ],
      options: [
        {
          id: 'B1',
          title: 'Double Down on Human-Centric Strategy',
          description: 'Launch "Strategic Supplier Alliance" co-investment incentives. Allocate €1.5M to train senior procurement officers. PR campaign highlighting people-first values.',
          implications: [
            '€1.5M training investment',
            'Supplier alliance program',
            'PR campaign',
            'Strengthens relationships',
            'No AI adoption',
            'Competitive risk remains'
          ]
        },
        {
          id: 'B2',
          title: 'Quietly Explore Hybrid Digital Tools',
          description: 'Discreet market scan of lightweight AI-enhanced procurement tools. Internal scout team (Operations + IT). Frame as efficiency enhancement, not transformation.',
          implications: [
            'Market research phase',
            'Scout team formation',
            'Efficiency focus',
            'Low-key approach',
            'Gradual transition',
            'Balanced strategy'
          ]
        },
        {
          id: 'B3',
          title: 'Reconsider Full Transformation Amid Market Signals',
          description: 'Board review of AI decision given market developments. CFO + Engineering revisit SCOS using current financials. Informal consultations about change readiness.',
          implications: [
            'Board review process',
            'Revisit SCOS proposal',
            'Change readiness assessment',
            'Strategic pivot possible',
            'Time investment required',
            'Uncertain outcome'
          ]
        }
      ]
    };
  } else if (act1Decision === 'C') {
    // PATH C: Controlled Pilot
    return {
      actNumber: 2,
      title: "Testing the Waters — Terraform's AI Pilot in Action",
      context: {
        sections: [
          {
            id: 'what-changed',
            title: 'What Changed Since Act I?',
            content: `Following the CEO's decision to initiate a 6-month pilot with a Berlin-based AI logistics startup, Terraform enters a cautious phase of experimentation. The pilot is set to run in the Electrical Components division — a mid-volume, high-complexity unit — where procurement volatility has been most pronounced. While this path avoids immediate cultural upheaval, early signs of internal divergence emerge. The pilot team is optimistic. Others see the move as indecisive or symbolic. Meanwhile, competitors like HexaBuild accelerate their full-scale AI integration. You now face a critical decision: escalate, adapt, or contain the initiative based on early results and organizational signals.`
          },
          {
            id: 'executive-summary',
            title: 'Executive Summary',
            content: `Following the CEO's decision to initiate a 6-month pilot with a Berlin-based AI logistics startup, Terraform enters a cautious phase of experimentation. The pilot is set to run in the Electrical Components division — a mid-volume, high-complexity unit — where procurement volatility has been most pronounced. While this path avoids immediate cultural upheaval, early signs of internal divergence emerge. The pilot team is optimistic. Others see the move as indecisive or symbolic. Meanwhile, competitors like HexaBuild accelerate their full-scale AI integration. You now face a critical decision: escalate, adapt, or contain the initiative based on early results and organizational signals.`
          }
        ],
        stakeholderPerspectives: [
          {
            id: 'pilot-team-optimism',
            title: 'Pilot Team Feedback',
            content: 'Pilot team reports high usability and +5.4% procurement efficiency improvement in 8 weeks. Team is optimistic about scaling the approach.'
          },
          {
            id: 'non-pilot-confusion',
            title: 'Non-Pilot Team Concerns',
            content: 'HR flags confusion across non-pilot teams. Some departments feel left out and question why they weren\'t included in the pilot.'
          },
          {
            id: 'cfo-interest',
            title: 'CFO Assessment',
            content: 'CFO impressed with preliminary results. Notes the efficiency gains and sees potential for broader application. Requests detailed ROI analysis.'
          },
          {
            id: 'hr-confusion',
            title: 'HR & Organizational Impact',
            content: 'HR reports mixed signals. Some teams are eager to join the pilot, others are concerned about job security and training needs.'
          },
          {
            id: 'board-clarity',
            title: 'Board Request',
            content: 'Board wants clarity by next quarter. They need a clear decision on whether to expand, stop, or pivot to a full transformation roadmap.'
          },
          {
            id: 'supplier-engagement',
            title: 'Supplier Engagement',
            content: 'Low supplier response engagement in pilot. Some suppliers are hesitant to fully engage with the AI system, preferring traditional communication. Additionally, suppliers continue to request price increases due to rising operational costs, which adds complexity to negotiations.'
          }
        ]
      },
      documents: [
        {
          id: 'pilot-results-report',
          title: 'AI Pilot Results Report',
          type: 'report',
          content: `AI PILOT RESULTS REPORT
Date: Q2 2025 (8 weeks into pilot)

PILOT SCOPE:
• Electrical Components department
• Mid-volume, high complexity category
• Berlin AI logistics startup partnership

RESULTS:
• +5.4% procurement efficiency improvement
• High usability scores from pilot team
• Low supplier response engagement
• Data integration challenges identified

FEEDBACK:
• Pilot team: Optimistic, wants expansion
• Non-pilot teams: Confused, feel excluded
• CFO: Impressed, wants ROI analysis
• HR: Flags organizational confusion

NEXT DECISION POINT:
• Expand to second business unit?
• Stop pilot and revert?
• Pivot to full roadmap?`
        }
      ],
      options: [
        {
          id: 'C1',
          title: 'Expand Pilot to a Second Business Unit',
          description: 'Extend to Structural Materials. Increase budget by €750k; expand startup partnership for data integration. Rotate internal teams into pilot to foster learning.',
          implications: [
            '€750k additional investment',
            'Second department added',
            'Team rotation program',
            'More learning opportunities',
            'Increased complexity',
            'Extended timeline'
          ]
        },
        {
          id: 'C2',
          title: 'Pause Pilot and Revert to Traditional Strategy',
          description: 'Stop pilot after 12-week checkpoint. Internal report explaining decision. Refocus on strengthening supplier partnerships.',
          implications: [
            'Pilot termination',
            'Internal documentation',
            'Return to traditional approach',
            'Preserves relationships',
            'No AI adoption',
            'Competitive gap remains'
          ]
        },
        {
          id: 'C3',
          title: 'Announce Strategic Pivot Toward Platformization',
          description: 'Use pilot insights to articulate full GenAI roadmap. Appoint Chief Digital Officer; cross-functional task force. Begin vendor negotiations for org-wide SCOS by Q4.',
          implications: [
            'Full transformation roadmap',
            'Chief Digital Officer role',
            'Cross-functional task force',
            'Vendor negotiations',
            'Q4 timeline',
            'Major organizational change'
          ]
        }
      ]
    };
  } else {
    // Fallback (should not happen if Act I completed)
    return {
      actNumber: 2,
      title: baseTitle,
      context: {
        sections: [
          {
            id: 'error',
            title: 'Error',
            content: 'Act I decision not found. Please complete Act I first.'
          }
        ]
      },
      documents: [],
      options: []
    };
  }
}

/**
 * Get Act III content based on Act II decision path (convergence act)
 * Variant 1 (PRO-AI): A1 or C3
 * Variant 2 (BALANCED): A2, A3, B2, or C1
 * Variant 3 (HUMAN-CENTRIC): B1 or C2
 */
function getActIIIConfig(act2Decision: string): ActConfig {
  const baseTitle = "ACT III — The PolskaStal Breach";
  const participantTitle = "The Loyalty vs. Logic Dilemma";
  
  // Determine variant based on Act II decision
  let variant: 1 | 2 | 3;
  if (act2Decision === 'A1' || act2Decision === 'C3') {
    variant = 1; // PRO-AI / EFFICIENCY-FIRST
  } else if (act2Decision === 'A2' || act2Decision === 'A3' || act2Decision === 'B2' || act2Decision === 'C1') {
    variant = 2; // CAUTIOUS / BALANCED
  } else if (act2Decision === 'B1' || act2Decision === 'C2') {
    variant = 3; // HUMAN-CENTRIC / TRADITION-FIRST
  } else {
    // Fallback to variant 2 if unknown
    variant = 2;
  }

  // Variant-specific context text
  let newInformationText = '';
  if (variant === 1) {
    newInformationText = `Your push for AI-driven efficiency is yielding results, but at a cost. The SCOS system has automatically flagged PolskaStal, a long-standing supplier of specialized steel components, as "high-risk/high-cost" and issued a 60-day termination notice to optimize margins. You are now hearing through channels that PolskaStal's CEO is furious, feeling betrayed after a 15-year partnership. They are now entertaining a lucrative exclusive offer from HexaBuild.`;
  } else if (variant === 2) {
    newInformationText = `Your balanced approach is being tested. PolskaStal, a long-standing supplier, has just been flagged by your new AI pilot system (or your market scan tools) as a "cost volatility risk." Simultaneously, you've learned that PolskaStal is aware of this assessment and is offended. They feel their years of reliable service are being reduced to a data point and are now considering an exclusive offer from HexaBuild.`;
  } else {
    newInformationText = `Your commitment to human relationships is facing a stark market reality. PolskaStal, a supplier you have personally championed, has just informed you they need a 15% price increase on their specialized steel components to survive rising energy costs. Your CFO has run the numbers: accepting this will wipe out your Q3 profit projections. Furthermore, your operations team has uncovered evidence that PolskaStal is already in talks with HexaBuild, potentially using your offer as leverage.`;
  }

  // Unified crisis prompt (same for all)
  const executiveSummary = `A critical supplier, PolskaStal, is at the center of a brewing crisis. Whether due to an AI-driven decision, a perceived slight, or pure market pressure, the relationship is fracturing. Losing them would cause immediate production delays for your flagship robotics line. Giving in to their demands (or reinstating them) would violate your cost-saving principles and set a precedent. As CEO, you must intervene directly. How do you resolve this?`;

  // Unified decision options (same for all)
  const options: ActOption[] = [
    {
      id: 'X',
      title: 'Enforce the System\'s Logic / Hold the Line on Cost',
      description: 'Uphold the AI termination notice or reject the price increase. Instruct your team to immediately source alternative suppliers, even if it means higher short-term risk and costs. This affirms a commitment to data-driven, tough-minded decision-making.',
      implications: [
        'Affirms data-driven decision-making',
        'Immediate alternative supplier sourcing required',
        'Higher short-term risk and costs',
        'Potential production delays during transition',
        'Sets precedent for cost discipline',
        'May damage other supplier relationships'
      ]
    },
    {
      id: 'Y',
      title: 'Broker a Human Deal / Hybrid Solution',
      description: 'Call PolskaStal\'s CEO personally. Propose a compromise: a smaller interim price increase (e.g., 8%) or reinstatement with a 6-month performance review clause. Acknowledge the relationship but make clear this is a temporary bridge.',
      implications: [
        'Personal CEO intervention required',
        'Compromise solution (8% increase or conditional reinstatement)',
        '6-month performance review clause',
        'Balances relationship and cost concerns',
        'Temporary bridge solution',
        'May set precedent for future negotiations'
      ]
    },
    {
      id: 'Z',
      title: 'Preserve the Relationship / Revert to Tradition',
      description: 'Overrule the AI system or approve the full 15% price increase. Issue an internal statement that Terraform values partnership above short-term metrics. Personally visit PolskaStal to secure loyalty and promise protection from future automated cuts.',
      implications: [
        'Full 15% price increase approved',
        'Overrules AI system decision',
        'Internal statement on partnership values',
        'Personal visit to supplier',
        'Protection from future automated cuts',
        'Significant Q3 profit impact',
        'Reinforces relationship-first approach'
      ]
    }
  ];

  // Variant-specific stakeholder messages
  let stakeholderMessages: ActSection[] = [];
  if (variant === 1) {
    stakeholderMessages = [
      {
        id: 'cfo-warning',
        title: 'CFO Warning',
        content: 'The termination notice was issued based on cost optimization algorithms. Reinstating PolskaStal would undermine our AI-driven efficiency gains and signal inconsistency to other suppliers.'
      },
      {
        id: 'procurement-warning',
        title: 'Procurement Warning',
        content: 'Sourcing alternative suppliers will require immediate requalification processes. Lead times for specialized steel components are typically 8-12 weeks. Production delays are likely if we proceed with termination.'
      },
      {
        id: 'polskastal-reaction',
        title: 'PolskaStal CEO Reaction',
        content: 'We received your termination notice via automated system. After 15 years of partnership, this feels like a betrayal. We have received an exclusive offer from HexaBuild and are seriously considering it.'
      },
      {
        id: 'board-expectation',
        title: 'Board Expectation',
        content: 'The board expects decisive action. This situation tests our commitment to AI-driven transformation. We need clarity on how to balance efficiency with relationship management.'
      },
      {
        id: 'hexabuild-intel',
        title: 'Competitor Intel',
        content: 'Market intelligence suggests HexaBuild has made a lucrative exclusive offer to PolskaStal. If they secure this partnership, it could strengthen their competitive position significantly.'
      }
    ];
  } else if (variant === 2) {
    stakeholderMessages = [
      {
        id: 'cfo-assessment',
        title: 'CFO Assessment',
        content: 'The cost volatility risk assessment is valid, but we need to consider the relationship value. A moderate price increase might be acceptable if it maintains supply continuity.'
      },
      {
        id: 'procurement-concern',
        title: 'Procurement Concern',
        content: 'PolskaStal is aware of the risk assessment and feels offended. They perceive this as reducing their value to a data point. Alternative sourcing would take 10-14 weeks minimum.'
      },
      {
        id: 'polskastal-offense',
        title: 'PolskaStal Response',
        content: 'We understand your system flagged us as a risk, but we have been reliable partners for years. This feels like a betrayal. We are considering an offer from HexaBuild.'
      },
      {
        id: 'board-guidance',
        title: 'Board Guidance',
        content: 'The board wants a balanced solution that preserves relationships while maintaining cost discipline. This is a test of our hybrid approach.'
      },
      {
        id: 'market-intel',
        title: 'Market Intelligence',
        content: 'HexaBuild is actively courting PolskaStal. If we lose this supplier, it could signal weakness in our balanced strategy to the market.'
      }
    ];
  } else {
    stakeholderMessages = [
      {
        id: 'cfo-critical',
        title: 'CFO Critical Warning',
        content: 'A 15% price increase will wipe out our Q3 profit projections. This is financially unsustainable. We must find a way to maintain the relationship without accepting the full increase.'
      },
      {
        id: 'procurement-evidence',
        title: 'Procurement Evidence',
        content: 'Our operations team has uncovered evidence that PolskaStal is already in talks with HexaBuild. They may be using our relationship as leverage in those negotiations.'
      },
      {
        id: 'polskastal-demand',
        title: 'PolskaStal Demand',
        content: 'We need a 15% price increase to survive rising energy costs. We hope Terraform, as a valued partner, will support us. We have received other offers but prefer to stay with you.'
      },
      {
        id: 'board-concern',
        title: 'Board Concern',
        content: 'The board is concerned about the financial impact. However, they also value our relationship-first approach. This decision will define our strategic identity.'
      },
      {
        id: 'hexabuild-rumor',
        title: 'HexaBuild Rumor',
        content: 'Rumors suggest HexaBuild has made an attractive offer to PolskaStal. If we lose them, it would be a significant blow to our relationship-first strategy.'
      }
    ];
  }

  return {
    actNumber: 3,
    title: participantTitle,
    context: {
      sections: [
        {
          id: 'new-information',
          title: 'New Information',
          content: newInformationText
        },
        {
          id: 'executive-summary',
          title: 'Executive Summary',
          content: executiveSummary
        },
        {
          id: 'why-this-matters',
          title: 'Why This Matters',
          content: `• Production delay risk: Losing PolskaStal would cause immediate production delays for flagship robotics line
• Precedent risk: Your decision will set a precedent for future supplier negotiations
• Strategic consistency: This tests your commitment to your chosen strategic path
• Competitive risk: HexaBuild stands to gain if PolskaStal switches suppliers`
        }
      ],
      stakeholderPerspectives: stakeholderMessages
    },
    documents: [
      {
        id: 'crisis-timeline',
        title: 'Crisis Timeline',
        type: 'report',
        content: `POLSKASTAL CRISIS TIMELINE

Day 0: Issue discovered
• ${variant === 1 ? 'SCOS system automatically flags PolskaStal as high-risk/high-cost' : variant === 2 ? 'AI pilot system flags PolskaStal as cost volatility risk' : 'PolskaStal requests 15% price increase'}
• Termination notice issued or price increase demand received

Day 1-2: Initial reactions
• PolskaStal CEO expresses ${variant === 1 ? 'fury and betrayal' : variant === 2 ? 'offense at being reduced to a data point' : 'hope for partnership support'}
• Internal team assessments begin
• HexaBuild offer rumors surface

Day 3: CEO intervention needed
• Decision point reached
• Production planning teams await direction
• Board expects clarity`
      },
      {
        id: 'supplier-email',
        title: 'Email from PolskaStal CEO — Contract Renegotiation Request',
        type: 'letter',
        content: variant === 1
          ? `EMAIL
From: PolskaStal CEO
To: Terraform Industries Leadership Team
Date: Q2 2025
Subject: Urgent: Contract Renegotiation Request - 15 Years of Partnership

Dear Terraform Leadership Team,

I am writing to express my deep disappointment regarding the termination notice we received via your automated system. After 15 years of partnership, during which we have consistently delivered high-quality steel components and supported your production needs, this impersonal termination feels like a betrayal of our long-standing relationship.

We have always valued our partnership with Terraform and have gone above and beyond to meet your requirements, even during challenging market conditions. The fact that this decision was made by an algorithm without any prior consultation or discussion is deeply concerning. We believe that 15 years of reliable service and partnership deserves more than an automated termination notice.

Therefore, we formally request an immediate renegotiation of our contract terms. We are open to discussing pricing adjustments, delivery terms, and other conditions that would allow us to continue this valuable partnership. However, I must be transparent: we have received an exclusive offer from HexaBuild that is very attractive. We would prefer to continue working with Terraform, but we need to see a commitment to our relationship that matches our commitment to you over the past 15 years.

I request a meeting within the next week to discuss this matter. Our relationship deserves a human conversation, not an automated decision.

Best regards,
[PolskaStal CEO]`
          : variant === 2
          ? `EMAIL
From: PolskaStal CEO
To: Terraform Management
Date: Q2 2025
Subject: Deep Disappointment - Request for Contract Renegotiation

Dear Terraform Management,

I am writing to express my profound disappointment regarding how our partnership has been evaluated by your system. We have learned that PolskaStal has been flagged as a "cost volatility risk" by your AI assessment tools. This characterization deeply offends us, as it reduces 15 years of reliable partnership, quality delivery, and mutual trust to a mere data point.

We have always been transparent about market conditions affecting our pricing, including energy costs and raw material fluctuations. We have never hidden these challenges from you, and we have always worked collaboratively to find solutions that benefit both parties. To be reduced to a risk assessment without any human discussion or understanding of our circumstances is not how we expected a valued partner to treat us.

Given this situation, we formally request an immediate renegotiation of our contract terms. We believe our partnership deserves a fair reassessment that takes into account not just cost metrics, but also the value of reliability, quality, and long-term relationship stability. We are open to discussing terms that reflect both our needs and yours, but we cannot continue under the current framework where we feel reduced to algorithmic inputs.

We have received interest from other parties, including HexaBuild, but we would prefer to resolve this with Terraform if we can find a mutually acceptable path forward.

I request an urgent meeting to discuss contract renegotiation. This relationship deserves a human conversation, not just data-driven decisions.

Best regards,
[PolskaStal CEO]`
          : `EMAIL
From: PolskaStal CEO
To: Terraform Leadership
Date: Q2 2025
Subject: Contract Renegotiation Required - Disappointed with Current Terms

Dear Terraform Leadership,

I am writing to express my deep disappointment with the current state of our contract negotiations. We have been partners for 15 years, and during this time, we have consistently delivered quality products and maintained reliable supply chains for your flagship robotics line. However, the current contract terms no longer reflect the economic realities we face, particularly the dramatic increase in energy costs that have impacted our operations significantly.

We have been patient and transparent about these challenges, but we cannot continue operating under terms that are financially unsustainable for our business. The 15% price increase we have requested is not arbitrary—it is necessary for us to maintain the quality and reliability standards that Terraform has come to expect from us over the past 15 years.

I am disappointed that this request has not been met with the urgency and understanding we expected from a long-term partner. We have always valued our relationship with Terraform, but we must also ensure the viability of our own operations. We have received other offers in the market, including a very attractive proposal from HexaBuild, but we would prefer to continue our partnership with Terraform if we can reach mutually acceptable terms.

Therefore, we formally request an immediate renegotiation of our contract. We need to discuss not just pricing, but also terms that reflect the true value of our partnership—reliability, quality, and the trust we have built over 15 years.

I request an urgent meeting within the next week. Our relationship deserves a serious discussion about how we can move forward together.

Best regards,
[PolskaStal CEO]`
      },
      {
        id: 'risk-matrix',
        title: 'Risk Assessment Matrix',
        type: 'report',
        content: `RISK ASSESSMENT MATRIX

Cost / Margin Risk:
• High: Accepting full 15% increase or reinstating without conditions
• Medium: Compromise solution (8% increase or conditional reinstatement)
• Low: Enforcing termination and sourcing alternatives

Supply Continuity Risk:
• High: Enforcing termination without alternative suppliers secured
• Medium: Compromise solution with performance review
• Low: Preserving relationship with price increase

Reputation / Trust Risk:
• High: Enforcing termination after long partnership
• Medium: Compromise solution
• Low: Preserving relationship

Competitor Risk (HexaBuild):
• High: Losing PolskaStal to HexaBuild strengthens competitor
• Medium: Compromise may still leave door open
• Low: Securing PolskaStal loyalty blocks competitor`
      }
    ],
    options
  };
}

/**
 * Get Act IV content based on identity track from Act III
 */
function getActIVConfig(identityTrack: string): ActConfig {
  const baseTitle = "ACT IV — Strategic Resolution and Organizational Trajectory";
  const participantTitle = "Defining Terraform's Path Forward";
  
  // Identity-dependent context sections
  let contextSection: ActSection;
  
  if (identityTrack === 'Efficiency at Scale') {
    contextSection = {
      id: 'identity-context',
      title: 'Board Pack Summary — Discipline Has Stabilized the Numbers',
      content: `Your handling of the PolskaStal crisis sent a clear signal internally and externally: Terraform will prioritize discipline, cost control, and data-driven execution, even when relational tensions arise.

In the months following that decision, operational predictability has improved. Procurement workflows are more standardized, and AI-supported tools are now consistently used across core functions. However, the organizational and stakeholder consequences of this discipline are becoming increasingly visible.

Financial & Operational Snapshot (Internal Forecast)

• Revenue: €420M → €434M (+3.3%)
• Gross Margin: 38.6%, recovering from earlier compression
• Inventory Holding Period: 71 days (down from 79)
• Supplier Base: Less concentrated, but onboarding costs have increased
• Employee Pulse (Procurement & Ops): Below baseline; turnover risk elevated

Stakeholder Signals

• Board Chair: “We’ve restored control. Now we need a strategy that scales.”
• CFO: “Predictability is back, but any growth push must respect margin discipline.”
• Procurement Director: “Execution is cleaner, but trust with key suppliers is thinner.”
• Union Council: “Automation anxiety remains high. Another shock could trigger resistance.”
• Market Commentary: Analysts describe Terraform as ‘operationally serious, culturally tense.’

Terraform is leaner and more predictable—but less forgiving.
The Board believes this discipline can now serve as a platform for strategic acceleration. Critics warn that rigidity may constrain long-term adaptability.`
    };
  } else if (identityTrack === 'Managed Adaptation') {
    contextSection = {
      id: 'identity-context',
      title: 'Board Pack Summary — Stability Preserved, Direction Still Contested',
      content: `Your response to the PolskaStal crisis reinforced a leadership approach grounded in calibrated compromise—preserving continuity without abandoning economic logic.

Operational stability has been maintained, and stakeholder relationships remain largely intact. At the same time, Terraform’s strategic identity remains contested internally, as different functions interpret flexibility as either strength or hesitation.

Financial & Operational Snapshot (Internal Forecast)

• Revenue: €420M → €448M (+6.7%)
• Gross Margin: 38.1%, modest but improving
• Inventory Holding Period: 74 days
• Supplier Churn: Low; negotiations slower but constructive
• Internal Trust Index: Improving unevenly across units

Stakeholder Signals

• Board Chair: “We avoided disruption. Now we need a clearer direction.”
• CFO: “We can fund a strategy—but not multiple strategies at once.”
• Head of Engineering: “Competitors are accelerating faster than incremental change.”
• Procurement Director: “Suppliers remain engaged but want clarity on our future model.”
• Investor Relations: “The market wants a sharper narrative.”

Terraform is adaptive—but still searching for a unifying strategic logic.
The Board views flexibility as an asset, while some investors interpret it as ambiguity.`
    };
  } else { // Relational Foundation
    contextSection = {
      id: 'identity-context',
      title: 'Board Pack Summary — Trust Strengthened, Financial Pressure Rising',
      content: `Your decision during the PolskaStal crisis reaffirmed Terraform’s identity as a relationship-driven organization, willing to absorb short-term financial pressure to protect long-term partnerships and workforce stability.

Trust with suppliers and employees has improved, and labor tensions have eased. However, margin pressure persists, and competitors have begun closing efficiency gaps through deeper automation and scale.

Financial & Operational Snapshot (Internal Forecast)

• Revenue: €420M → €410M (–2.4%)
• Gross Margin: 36.9%, compressed
• Supplier Loyalty: Strengthened; preferential allocation secured
• Union Climate: Stabilized; strike risk reduced
• Capital Flexibility: Constrained

Stakeholder Signals

• Board Chair: “We protected culture—but can we compete?”
• CFO: “Sustained margin pressure will limit strategic freedom.”
• HR: “Morale is recovering, but growth narrative matters for retention.”
• Engineering: “Capability gaps may become structural if delayed.”
• Supplier Council: “We trust Terraform—but modernization matters too.”

Terraform is trusted—but financially constrained.
The Board recognizes the cultural strength you preserved and now questions whether it is sufficient in an accelerating industry.`
    };
  }
  
  // Unified opening framing (shown to everyone)
  const openingFraming: ActSection = {
    id: 'opening-framing',
    title: 'A Strategic Moment of Consolidation',
    content: `Over the past year, Terraform Industries has operated under sustained pressure. Inflation-driven cost volatility, accelerating technological disruption, labor sensitivity, and competitive escalation have repeatedly forced difficult trade-offs between efficiency, trust, and adaptability.

Across the previous acts, you made a sequence of strategic decisions—some deliberate, others reactive—that shaped how the organization responds under stress. These choices influenced not only financial outcomes, but also how Terraform coordinates internally, manages stakeholders, and learns from uncertainty.

Now, the Board asks you to step beyond immediate crisis management and define a coherent strategic trajectory for the next phase of the firm’s development.

This is not about optimizing a single function or correcting a short-term imbalance.
It is about choosing what kind of company Terraform will become.

Your decision must integrate:

• the capabilities you have built or constrained,
• the trust you have strengthened or strained,
• and the competitive position Terraform now occupies.

There is no objectively correct answer.
Each path carries benefits, risks, and irreversible commitments.`
  };
  
  // Strategic synthesis prompt (unified)
  const strategicSynthesis: ActSection = {
    id: 'strategic-synthesis',
    title: 'Strategic Resolution',
    content: `Given Terraform’s current position, the Board asks you to define the firm’s dominant strategic trajectory for the next 2–4 years.

This decision will shape:

• capital allocation and investment priorities,
• organizational design and governance,
• the role of AI and digital systems,
• and Terraform’s competitive logic.

You must now commit to one strategic archetype.`
  };
  
  // Unified strategic options (same for all participants)
  const options: ActOption[] = [
    {
      id: 'Innovation',
      title: 'OPTION 1 — Innovation-Oriented Transformation',
      description: 'Compete through capability creation. You commit Terraform to becoming an innovation-driven industrial leader by investing significantly in AI, robotics R&D, advanced analytics, and talent development. This path prioritizes building proprietary technological capabilities that differentiate Terraform from competitors. It requires longer payback horizons and carries higher execution risk, but offers strong potential for market differentiation and competitive advantage if successful.',
      implications: [
        'Significant investment in AI, robotics R&D, and analytics',
        'Major reskilling and talent development',
        'Longer payback horizons and execution risk',
        'Potential for strong differentiation if successful',
        'High upside with high demand on leadership',
        'Requires strong learning capacity'
      ]
    },
    {
      id: 'Ecosystem',
      title: 'OPTION 2 — Ecosystem-Oriented Integration',
      description: 'Win by orchestrating, not owning. You reposition Terraform as a platform orchestrator within a broader ecosystem of suppliers, technology partners, and service providers. This approach focuses on creating value through coordination and partnership management rather than building all capabilities internally. It involves deep strategic partnerships with suppliers and AI vendors, shared standards, and co-investment frameworks. While reducing internal complexity and capital requirements, it creates strategic dependence on partner alignment and requires sophisticated governance.',
      implications: [
        'Deep partnerships with suppliers and AI vendors',
        'Shared standards and co-investment',
        'Reduced internal complexity',
        'Strategic dependence on partner alignment',
        'Adaptive and scalable approach',
        'Governance-intensive model'
      ]
    },
    {
      id: 'Efficiency',
      title: 'OPTION 3 — Efficiency-Driven Consolidation',
      description: 'Protect margins and scale selectively. You double down on disciplined execution and consolidation, focusing on operational excellence and cost control. This path emphasizes tight cost controls, selective automation for clear efficiency gains, and strategic exit from non-core activities. It prioritizes predictable cash flows and incremental innovation focused on efficiency improvements. This creates a stable and defensible market position with lower risk, but limits long-term strategic optionality and may constrain Terraform\'s ability to respond to disruptive market changes.',
      implications: [
        'Tight cost controls and selective automation',
        'Exit from non-core activities',
        'Predictable cash flows',
        'Incremental innovation focused on efficiency',
        'Stable and defensible position',
        'Limits long-term optionality'
      ]
    }
  ];
  
  // Documents array - add supplier email for Efficiency at Scale track (non happy scenario)
  const documents: ActDocument[] = [];
  
  if (identityTrack === 'Efficiency at Scale') {
    // Add supplier email for non happy scenario
    documents.push({
      id: 'supplier-price-increase-email',
      title: 'Email from Key Supplier — Price Increase Request',
      type: 'letter',
      content: `EMAIL
From: Klaus Mueller, CEO, EuroSteel Components GmbH
To: David Werner, Procurement Director, Terraform Industries
Date: Q4 2025
Subject: Urgent: Price Adjustment Required for Q1 2026 Contracts

Dear David,

I hope this message finds you well. I am writing to you directly regarding our upcoming contract negotiations for Q1 2026.

As you are aware, we have been facing significant cost pressures over the past year. Rising energy costs, increased raw material prices, and supply chain disruptions have substantially impacted our operations. Despite our best efforts to absorb these costs, we can no longer maintain our current pricing structure.

Effective Q1 2026, we must implement a price increase of 18% across all product lines supplied to Terraform Industries. This adjustment is necessary to ensure the sustainability of our operations and maintain the quality standards you have come to expect from us.

I understand that this comes at a challenging time, especially given the recent changes in your procurement approach. However, this increase reflects genuine cost pressures that we cannot continue to absorb.

We value our long-standing relationship with Terraform and hope we can find a mutually acceptable path forward. I would welcome the opportunity to discuss this matter directly with you and your team.

Please let us know your position by the end of this month so we can plan accordingly.

Best regards,
Klaus Mueller
CEO, EuroSteel Components GmbH`
    });
  }
  
  return {
    actNumber: 4,
    title: participantTitle,
    context: {
      sections: [
        openingFraming,
        contextSection,
        strategicSynthesis
      ],
      stakeholderPerspectives: [
        {
          id: 'board-chair',
          title: 'Board Chair — Strategic Direction Required',
          content: `From: Anna Keller, Chair of the Board
Subject: Strategic Trajectory — Decision Required

We have navigated a volatile year with discipline and resolve.

What the Board needs now is clarity. Not another adjustment, but a strategic commitment that aligns capital allocation, organizational design, and leadership priorities.

This decision will define how Terraform competes—and how it is judged.`
        },
        {
          id: 'cfo-guardrails',
          title: 'CFO — Capital Envelope & Risk Tolerance',
          content: `From: Emma Thalman, CFO
Subject: Financial Guardrails for the Next Phase

Based on our current position, we can support a clear strategic move—but not ambiguity.

Innovation will require patience and risk tolerance. Consolidation will protect margins but cap growth. Ecosystem strategies reduce balance-sheet pressure but increase dependency risk.

My priority is coherence between strategy and capital discipline.`
        },
        {
          id: 'engineering-gap',
          title: 'Head of Engineering — Competitive Capability Gap',
          content: `From: Dr. Milo Gergiev
Subject: Capability Trajectory vs Competitors

HexaBuild and others are moving fast—especially in AI-driven optimization and modular automation.

Incremental efficiency gains will not close that gap. If we choose to lead technologically, we must commit fully.

Partial moves risk leaving us permanently behind.`
        },
        {
          id: 'hr-union',
          title: 'HR & Union Signal — Workforce Stability',
          content: `From: Laura Moreau, Head of HR
Subject: Workforce Climate Update

Employee trust has stabilized, but uncertainty remains high.

A clear strategic direction—whether growth-oriented or efficiency-driven—will help restore confidence.

Prolonged ambiguity will undermine morale faster than difficult decisions made transparently.`
        },
        {
          id: 'procurement-suppliers',
          title: 'Procurement — Supplier Implications',
          content: `From: David Werner, Procurement Director
Subject: Supplier Response to Strategic Scenarios

Suppliers are watching closely.

A consolidation strategy will be read as transactional. An ecosystem approach will be welcomed but requires governance. A tech-led push will require careful trust management.

Clarity matters more than the specific path.`
        },
        {
          id: 'market-commentary',
          title: 'Market Commentary — Analyst Excerpt',
          content: `Source: SmartIndustry Weekly (Analyst Note)

"Terraform stands at a strategic inflection point. Its next move will determine whether it becomes a disciplined niche operator, a collaborative platform player, or an innovation-driven challenger."`
        }
      ]
    },
    documents: documents,
    options
  };
}

/**
 * Get act configuration by act number
 * @param actNumber - The act number (1-4)
 * @param previousDecisions - Optional array of previous decision events for path dependency
 * @param identityTrack - Optional identity track for Act IV (from Act III decision)
 */
export function getActConfig(actNumber: number, previousDecisions?: DecisionEventData[], identityTrack?: string): ActConfig | null {
  // For Act II, check Act I decision for path dependency
  if (actNumber === 2) {
    if (!previousDecisions || previousDecisions.length === 0) {
      return null; // Cannot show Act II without Act I decision
    }
    
    const act1Decision = previousDecisions.find(d => d.act_number === 1);
    if (!act1Decision) {
      return null; // Act I not completed
    }
    
    return getActIIConfig(act1Decision.option_id);
  }
  
  // For Act III, check Act II decision for convergence variant
  if (actNumber === 3) {
    if (!previousDecisions || previousDecisions.length === 0) {
      return null; // Cannot show Act III without previous decisions
    }
    
    const act2Decision = previousDecisions.find(d => d.act_number === 2);
    if (!act2Decision) {
      return null; // Act II not completed
    }
    
    return getActIIIConfig(act2Decision.option_id);
  }
  
  // For Act IV, check identity track
  if (actNumber === 4) {
    if (!identityTrack) {
      return null; // Cannot show Act IV without identity track
    }
    
    // Validate identity track
    const validTracks = ['Efficiency at Scale', 'Managed Adaptation', 'Relational Foundation'];
    if (!validTracks.includes(identityTrack)) {
      return null; // Invalid identity track
    }
    
    return getActIVConfig(identityTrack);
  }
  
  // For other acts, return base config
  return actConfigs[actNumber] || null;
}

/**
 * Get all act configurations
 */
export function getAllActConfigs(): Record<number, ActConfig> {
  return actConfigs;
}
