/** Big Five personality traits */
export interface BigFive {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

/** AI Companion profile */
export interface Companion {
  id: string;
  name: string;
  avatar: string;
  description: string;
  personality: BigFive;
  tags: string[];
  isDefault?: boolean;
  createdAt?: string;
}

/** User profile */
export interface Profile {
  id: string;
  email: string;
  username: string;
  avatar: string;
  preferredLanguage: 'zh' | 'en';
  theme: 'light' | 'dark';
  createdAt: string;
}

/** Chat message */
export interface Message {
  id: string;
  companionId: string;
  role: 'user' | 'companion';
  content: string;
  emotion?: string;
  createdAt: string;
}

/** Memory entry for calendar */
export interface Memory {
  id: string;
  date: string;
  type: 'stm' | 'ltm' | 'anterior';
  title: string;
  description: string;
  companionId: string;
  mood?: Mood;
}

/** Energy account for billing */
export interface EnergyAccount {
  id: string;
  userId: string;
  balance: number;
  totalUsed: number;
  totalRecharged: number;
}

/** Payment order */
export interface PaymentOrder {
  id: string;
  userId: string;
  amount: number;
  energyAmount: number;
  status: 'pending' | 'paid' | 'failed';
  paymentMethod: 'alipay' | 'wechat';
  createdAt: string;
  paidAt?: string;
}

/** Drama/story */
export interface Drama {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  companionId: string;
  scenes: DramaScene[];
  isActive: boolean;
  createdAt: string;
}

/** Drama scene */
export interface DramaScene {
  id: string;
  order: number;
  title: string;
  content: string;
  choices?: DramaChoice[];
  backgroundImage?: string;
}

/** Drama choice */
export interface DramaChoice {
  id: string;
  text: string;
  nextSceneId: string;
  effects?: {
    affection?: number;
    trust?: number;
  };
}

/** Drama session progress */
export interface DramaSession {
  id: string;
  userId: string;
  dramaId: string;
  currentSceneId: string;
  choices: string[];
  affection: number;
  trust: number;
  startedAt: string;
  updatedAt: string;
}

/** Milestone in the relationship journey */
export interface Milestone {
  id: number;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  isCurrent: boolean;
}

/** Mood/emotion tracking */
export interface Mood {
  id: string;
  companionId: string;
  userId: string;
  mood: 'happy' | 'calm' | 'sad' | 'anxious' | 'excited' | 'tender';
  intensity: number;
  note?: string;
  date: string;
}

/** Crowdfunding milestone/plan */
export interface CrowdfundingPlan {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  backers: number;
  previewImage: string;
  status: 'active' | 'funded' | 'locked';
  features: string[];
  deadline?: string;
}

/** Navigation item */
export interface NavItem {
  label: string;
  path: string;
  icon: string;
}
