export const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

export const scheduleTypes = [
  "Class",
  "Laboratory",
  "Quiz",
  "Exam",
  "Assignment",
  "Event",
] as const;

export type DayName = (typeof days)[number];
export type ScheduleType = (typeof scheduleTypes)[number];

export type ScheduleEntry = {
  id: string;
  title: string;
  code: string;
  room: string;
  days: DayName[];
  start: string;
  end: string;
  type: ScheduleType;
  reminderMinutes: number;
};

export type ScheduleSettings = {
  ownerName: string;
  schoolName: string;
  wallpaperTitle: string;
};
