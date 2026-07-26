export type Exam = {
  id: string;
  title: string;
  countryCode: string;
  description: string;
  subjectIds: string[];
};

export type Subject = {
  id: string;
  examId: string;
  title: string;
  description: string;
  categoryIds: string[];
};

export type Category = {
  id: string;
  subjectId: string;
  title: string;
  parentId?: string;
};

export type DomainPack = {
  exams: Exam[];
  subjects: Subject[];
  categories: Category[];
};
