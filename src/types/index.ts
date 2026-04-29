export type UserRole = 'student' | 'advisor' | 'mentor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
}

export interface StudentProfile extends User {
  role: 'student';
  major?: string;
  year?: number;
  gpa?: number;
  transcript?: TranscriptEntry[];
  skills: Skill[];
  interests: string[];
  careerGoals?: string;
}

export interface AdvisorProfile extends User {
  role: 'advisor';
  department: string;
  specializations: string[];
  assignedStudents: string[];
}

export interface MentorProfile extends User {
  role: 'mentor';
  title: string;
  company: string;
  industry: string;
  yearsExperience: number;
  expertise: string[];
  bio: string;
  linkedinUrl?: string;
  availability: 'available' | 'limited' | 'unavailable';
  menteeCount: number;
  maxMentees: number;
}

export interface TranscriptEntry {
  courseCode: string;
  courseName: string;
  credits: number;
  grade: string;
  semester: string;
  year: number;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  source: 'self-reported' | 'verified' | 'inferred';
}

export type SkillCategory = 
  | 'technical'
  | 'soft'
  | 'analytical'
  | 'creative'
  | 'leadership'
  | 'communication';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface CareerRecommendation {
  id: string;
  title: string;
  description: string;
  matchScore: number;
  requiredSkills: Skill[];
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  demandTrend: 'growing' | 'stable' | 'declining';
  jobOpenings: number;
  industries: string[];
}

export interface SkillGap {
  skill: Skill;
  currentLevel: SkillLevel | null;
  requiredLevel: SkillLevel;
  priority: 'high' | 'medium' | 'low';
  resources: LearningResource[];
}

export interface LearningResource {
  id: string;
  title: string;
  type: 'course' | 'certification' | 'workshop' | 'book' | 'project';
  provider: string;
  url: string;
  duration?: string;
  cost?: number;
}

export interface MentorshipRequest {
  id: string;
  studentId: string;
  mentorId: string;
  status: 'pending' | 'accepted' | 'declined';
  message: string;
  createdAt: Date;
  respondedAt?: Date;
}

export interface CounselingReport {
  id: string;
  studentId: string;
  advisorId: string;
  date: Date;
  summary: string;
  recommendations: string[];
  nextSteps: string[];
  attachments?: string[];
}
