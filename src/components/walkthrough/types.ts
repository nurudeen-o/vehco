export type TourStep = {
  id: string;
  title: string;
  content: string;
  target: string;
  route?: string;
  placement?: "top" | "bottom" | "left" | "right";
  actionLabel?: string;
  actionHref?: string;
};

export type TourTrack = {
  id: string;
  title: string;
  description: string;
  duration: string;
  iconName: string;
  badge?: string;
  steps: TourStep[];
};

export type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  tourId?: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: "operations" | "compliance" | "offline" | "finance";
};
