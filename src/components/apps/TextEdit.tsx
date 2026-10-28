import { profile } from "@/data/profile";

export function TextEdit() {
  return (
    <div className="mx-auto max-w-2xl px-8 py-6 font-serif text-[14px] leading-relaxed">
      <h1 className="text-center text-2xl font-bold">{profile.name}</h1>
      <p className="mb-6 text-center text-[13px] text-neutral-500">
        {profile.location} · {profile.email}
      </p>

      <h2 className="mb-2 border-b border-neutral-300 pb-0.5 text-[13px] uppercase tracking-wider dark:border-neutral-700">Experience</h2>
      {profile.experience.map((job) => (
        <div key={job.company} className="mb-5">
          <div className="flex items-baseline justify-between">
            <span className="font-bold">
              {job.company}
              {job.current && (
                <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-emerald-600">NOW</span>
              )}
            </span>
            <span className="text-[13px]">{job.location}</span>
          </div>
          {job.stack && <p className="text-[12px] italic text-neutral-500">({job.stack})</p>}
          {job.roles.map((r) => (
            <div key={r.title} className="mt-2">
              <div className="flex items-baseline justify-between italic">
                <span className="font-semibold">{r.title}</span>
                <span className="text-[13px]">{r.period}</span>
              </div>
              <ul className="ml-5 mt-1 list-disc space-y-1">
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}

      <h2 className="mb-2 border-b border-neutral-300 pb-0.5 text-[13px] uppercase tracking-wider dark:border-neutral-700">Education</h2>
      <div className="mb-5 flex items-baseline justify-between">
        <span>
          <span className="font-bold">{profile.education.school}</span> — {profile.education.degree} ({profile.education.detail})
        </span>
        <span className="text-[13px]">{profile.education.period}</span>
      </div>

      <h2 className="mb-2 border-b border-neutral-300 pb-0.5 text-[13px] uppercase tracking-wider dark:border-neutral-700">Achievements</h2>
      <ul className="ml-5 list-disc">
        {profile.achievements.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </div>
  );
}
