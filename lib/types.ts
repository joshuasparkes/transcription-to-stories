export interface UserStory {
  epicName: string;
  requirementNumber: string;
  requirement: string;
  userStory: string;
  acceptanceCriteria1: string;
  acceptanceCriteria2: string;
  acceptanceCriteria3: string;
  acceptanceCriteria4: string;
  [key: string]: string; // For additional acceptance criteria
}
