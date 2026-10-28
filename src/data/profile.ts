// Single source of truth for everything personal on the site.
// Update this file (not the components) when your details change.

export type Role = {
  title: string;
  period: string;
  bullets: string[];
};

export type Job = {
  company: string;
  location: string;
  stack?: string;
  current?: boolean;
  roles: Role[];
};

export const profile = {
  name: "Sarthak Bajaj",
  handle: "sarthak",
  headline: "Backend engineer who likes building systems that scale quietly.",
  location: "Bangalore, India",
  currentRole: "SDE @ Kiwi",
  email: "bajajsarthak37@gmail.com",
  links: {
    github: "https://github.com/sarthakbajaj37",
    linkedin: "https://linkedin.com/in/sarthak-bajaj-90b834143",
  },
  about: [
    "Hey, I'm Sarthak 👋 — a software engineer based in Bangalore, currently working as an SDE at Kiwi.",
    "I spend most of my time in Java and Spring Boot, designing microservices, event-driven pipelines with Kafka, and the occasional React frontend.",
    "Before Kiwi, I spent two years at Salescode.ai building a Distributor Management System used by thousands of distributors across multiple countries — growing from Software Engineer to Senior Software Engineer leading a small team.",
  ],
  skills: {
    Languages: ["Java", "SQL", "TypeScript", "JavaScript", "HTML", "CSS"],
    Backend: ["Spring Boot", "Spring MVC", "Spring Security", "REST APIs", "Microservices", "Hibernate", "JPA"],
    "Data & Messaging": ["MySQL", "PostgreSQL", "Redis", "Kafka"],
    Frontend: ["React.js"],
    Practices: ["Event-driven Architecture", "System Design", "Multithreading", "CI/CD"],
    Tools: ["IntelliJ", "Git", "Postman", "Cursor", "Claude Code", "VS Code"],
    Also: ["AWS", "Python", "C++"],
  } as Record<string, string[]>,
  experience: [
    {
      company: "Kiwi",
      location: "Bangalore, Karnataka",
      current: true,
      roles: [
        {
          title: "Software Development Engineer",
          period: "Sep 2026 – Present",
          bullets: ["Building backend services at Kiwi."],
        },
      ],
    },
    {
      company: "Salescode.ai",
      location: "Gurgaon, Haryana",
      stack: "Java, Spring Boot, MySQL, Kafka, Redis, React, TypeScript",
      roles: [
        {
          title: "Senior Software Engineer",
          period: "Apr 2026 – Aug 2026",
          bullets: [
            "Led a team of 3 engineers, driving technical decisions and module architecture across 6 DMS modules: Stock, Sale Returns, Delivery Confirmation, Collections, Credit, and Accounting.",
            "Designed and delivered the Credit and Accounting modules from scratch — ledger management and credit/debit note generation.",
            "End-to-end owner of the Stock microservice: architecture, feature development, performance and production stability.",
            "Mentored engineers, ran code reviews, and enforced coding standards across the team.",
          ],
        },
        {
          title: "Software Engineer",
          period: "Jul 2024 – Mar 2026",
          bullets: [
            "Co-designed the Stock microservice for a DMS platform serving thousands of distributors across multiple countries, using the Strategy pattern to support 10+ stock operations.",
            "Built an async bulk stock ingestion engine on Apache Kafka — 4x throughput improvement.",
            "Optimized bulk stock confirmation and invoicing with a graph data structure — 60% faster for complex distributor hierarchies.",
            "Built a logging and audit pipeline on AWS S3, Glue and Redshift for traceability and compliance.",
            "Introduced Redis caching across DMS modules, cutting database load and API latency.",
            "Contributed React + TypeScript frontend work across DMS modules.",
          ],
        },
      ],
    },
  ] as Job[],
  education: {
    school: "Chitkara University",
    degree: "B.E. Computer Science",
    period: "2021 – 2025",
    detail: "CGPA 9.14 / 10",
  },
  achievements: [
    "Exceptional Performance Award at Salescode.ai — Q2 FY 2025-26 (Jul–Sep 2025).",
  ],
};
