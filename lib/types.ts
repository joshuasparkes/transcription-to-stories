export interface UserStory {
  epicName: string;
  requirementNumber: string;
  requirement: string;
  userStory: string;
  supportingQuote?: string;
  acceptanceCriteria1: string;
  acceptanceCriteria2: string;
  acceptanceCriteria3: string;
  acceptanceCriteria4: string;
  [key: string]: string | undefined; // For additional acceptance criteria and other fields
}
