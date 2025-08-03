export type Score = '1' | '2' | '3' | '4' | '5' | '';

export interface School {
  id: number;
  name: string;
  principal: string;
  students: string;
  languageScore: Score;
  mathScore: Score;
  englishScore: Score;
  scienceScore: Score;
  climate: Score;
  stability: Score;
  vision: Score;
  staffQuality: Score;
  leadership: Score;
  collaboration: Score;
  parentInvolvement: Score;
  teachingOrganization: Score;
  teacherCollaboration: Score;
  notes: string;
  languageChallenges: number[];
  mathChallenges: number[];
  englishChallenges: number[];
  scienceChallenges: number[];
  climateChallenges: number[];
  staff_stabilityChallenges: number[];
  visionChallenges: number[];
  staff_qualityChallenges: number[];
  leadershipChallenges: number[];
  collaborationChallenges: number[];
  parent_involvementChallenges: number[];
  teaching_organizationChallenges: number[];
  teacher_collaborationChallenges: number[];
}

export type ChallengeCategory = 
  | 'language' | 'math' | 'english' | 'science' 
  | 'climate' | 'staff_stability' | 'vision' | 'staff_quality' 
  | 'leadership' | 'collaboration' | 'parent_involvement'
  | 'teaching_organization' | 'teacher_collaboration';

export interface SchoolForAnalysis extends School {
  characterization: string;
  specificChallenges: { category: string; text: string }[];
  tier: 1 | 2 | 3;
}

export interface AnalysisData {
  schools: SchoolForAnalysis[];
  summary: {
    totalSchools: number;
    totalStudents: number;
    riskySchools: number;
    excellentSchools: number;
  };
  subjectDistribution: Record<string, Record<string, number>>;
  challengesAnalysis: Record<string, { challenges: Record<string, number>; affectedSchools: number }>;
  mtssClassification: {
    tier1: SchoolForAnalysis[];
    tier2: SchoolForAnalysis[];
    tier3: SchoolForAnalysis[];
  };
  insights: Insight[];
  heatmapData: { field: string; percentage: number; lowSchools: number; }[];
  organizationalData: { name: string; value: number }[];
  overallPerformanceData: { name: string; value: number }[];
  schoolSizeData: { name: string; value: number }[];
}

export interface Insight {
    title: string;
    text: string;
}

export interface GeneratedIssue {
    title: string;
    action: string;
    subject: string;
    context: string;
    result: string;
    vision: string;
    rationale: string;
    level: string;
}

export interface FinalIssue extends GeneratedIssue {
  originalChallenge: string;
  rootCauses: string[];
}

export interface InterventionPlan {
  mainGoal: string;
  smartObjectives: string[];
  tier1: { outcomes: string[] };
  tier2Groups: {
    id: string;
    name:string;
    outcomes: string[];
    schools: string[];
  }[];
  tier3: { outcomes: string[] };
}

export interface SupportPlanAction {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  targetAudience: string;
  frequency: string;
}

export interface SupportPlanPartner {
    id: string;
    name: string;
    category: string;
    role: string;
}

export interface SupportPlanResource {
    id: string;
    name: string;
    category: string;
    details: string;
}

export interface SupportPlanTask {
    id: string;
    task: string;
    responsible: string;
    startDate: string;
    endDate: string;
    status: string;
    actionId: string;
}

export interface SupportPlan {
  coreActions: SupportPlanAction[];
  partners: SupportPlanPartner[];
  resources: SupportPlanResource[];
  operationalPlan: SupportPlanTask[];
}
