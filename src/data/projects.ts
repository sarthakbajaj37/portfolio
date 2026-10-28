// Add a project = add one object to this array. The Projects (Finder) window
// renders whatever is here, and shows a "coming soon" state while it's empty.

export type Project = {
  name: string;
  description: string;
  stack: string[];
  github?: string;
  live?: string;
  year?: string;
};

export const projects: Project[] = [
  // {
  //   name: "my-cool-project",
  //   description: "One line about what it does and why it's interesting.",
  //   stack: ["Java", "Spring Boot", "Kafka"],
  //   github: "https://github.com/sarthakbajaj37/my-cool-project",
  //   live: "https://my-cool-project.vercel.app",
  //   year: "2026",
  // },
];
