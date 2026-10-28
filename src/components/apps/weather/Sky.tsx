"use client";

import { weatherCodeToSky, type SkyKind } from "@/lib/weather";

const GRADIENTS: Record<SkyKind, [string, string]> = {
  clear: ["linear-gradient(180deg,#1f6fc5 0%,#4f9be0 55%,#8cc4ef 100%)", "linear-gradient(180deg,#070b1f 0%,#141d45 55%,#2a3a6e 100%)"],
  partly: ["linear-gradient(180deg,#3a7cc0 0%,#6aa0d2 60%,#a3c4e2 100%)", "linear-gradient(180deg,#0e1430 0%,#222d52 60%,#3a4870 100%)"],
  cloudy: ["linear-gradient(180deg,#5f7488 0%,#8798aa 60%,#adb9c6 100%)", "linear-gradient(180deg,#171c25 0%,#2b333f 60%,#434c59 100%)"],
  fog: ["linear-gradient(180deg,#7f8b97 0%,#a3adb7 60%,#c6cdd4 100%)", "linear-gradient(180deg,#22272e 0%,#373e47 60%,#4e5661 100%)"],
  drizzle: ["linear-gradient(180deg,#4f6378 0%,#71849a 60%,#97a6b6 100%)", "linear-gradient(180deg,#121a24 0%,#25303d 60%,#3a4655 100%)"],
  rain: ["linear-gradient(180deg,#3d4f63 0%,#5d7085 60%,#8293a5 100%)", "linear-gradient(180deg,#0d141d 0%,#1e2833 60%,#333f4c 100%)"],
  snow: ["linear-gradient(180deg,#7d95b1 0%,#a5b8cd 60%,#cdd9e6 100%)", "linear-gradient(180deg,#1d2840 0%,#34425e 60%,#53627e 100%)"],
  storm: ["linear-gradient(180deg,#262b36 0%,#3d4453 60%,#59606f 100%)", "linear-gradient(180deg,#0c0e14 0%,#1b1f29 60%,#2e3340 100%)"],
};

export function skyGradient(code: number, isDay: boolean) {
  const [day, night] = GRADIENTS[weatherCodeToSky(code)];
  return isDay ? day : night;
}

const CSS = `
.wx-scene{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.wx-sun{position:absolute;top:-120px;right:-80px;width:360px;height:360px;border-radius:9999px;background:radial-gradient(circle,rgba(255,236,170,.75) 0%,rgba(255,220,130,.25) 35%,transparent 70%);animation:wx-pulse 8s ease-in-out infinite}
.wx-moon{position:absolute;top:36px;right:48px;width:54px;height:54px;border-radius:9999px;background:radial-gradient(circle at 35% 35%,#fffbe8,#e9e4cf 60%,#cfc8ad);box-shadow:0 0 40px 10px rgba(255,250,220,.18)}
.wx-stars{position:absolute;inset:0;background-image:
radial-gradient(1px 1px at 10% 20%,#fff,transparent),radial-gradient(1px 1px at 25% 65%,#fff,transparent),
radial-gradient(1.5px 1.5px at 40% 30%,#fff,transparent),radial-gradient(1px 1px at 55% 80%,#fff,transparent),
radial-gradient(1px 1px at 70% 15%,#fff,transparent),radial-gradient(1.5px 1.5px at 85% 55%,#fff,transparent),
radial-gradient(1px 1px at 92% 85%,#fff,transparent),radial-gradient(1px 1px at 5% 90%,#fff,transparent),
radial-gradient(1px 1px at 33% 8%,#fff,transparent),radial-gradient(1px 1px at 62% 45%,#fff,transparent);
background-size:420px 420px;opacity:.8;animation:wx-twinkle 5s ease-in-out infinite alternate}
.wx-stars.b{background-size:300px 300px;background-position:120px 80px;animation-delay:-2.5s;opacity:.5}
.wx-cloud{position:absolute;border-radius:9999px;background:rgba(255,255,255,.28);filter:blur(28px);animation:wx-drift 60s linear infinite}
.wx-cloud.dark{background:rgba(30,36,48,.35)}
.wx-rain{position:absolute;inset:-40px 0 0 0;background-image:repeating-linear-gradient(100deg,transparent 0 18px,rgba(255,255,255,.22) 18px 19px,transparent 19px 40px);background-size:240px 60px;animation:wx-fall .5s linear infinite}
.wx-rain.light{opacity:.45;animation-duration:.8s}
.wx-snow{position:absolute;inset:0;background-image:radial-gradient(2.5px 2.5px at 20px 30px,rgba(255,255,255,.9),transparent),radial-gradient(2px 2px at 90px 120px,rgba(255,255,255,.8),transparent),radial-gradient(3px 3px at 150px 60px,rgba(255,255,255,.9),transparent),radial-gradient(2px 2px at 200px 170px,rgba(255,255,255,.7),transparent);background-size:240px 200px;animation:wx-snow 9s linear infinite}
.wx-snow.b{background-size:180px 160px;animation-duration:14s;opacity:.6}
.wx-fog{position:absolute;left:-50%;width:200%;height:90px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);filter:blur(14px);animation:wx-fog 30s ease-in-out infinite alternate}
.wx-flash{position:absolute;inset:0;background:rgba(255,255,255,.55);opacity:0;animation:wx-flash 7s infinite}
@keyframes wx-pulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.08);opacity:1}}
@keyframes wx-twinkle{from{opacity:.35}to{opacity:.9}}
@keyframes wx-drift{from{transform:translateX(-40%)}to{transform:translateX(140%)}}
@keyframes wx-fall{from{background-position:0 0}to{background-position:-30px 60px}}
@keyframes wx-snow{from{background-position:0 0}to{background-position:40px 400px}}
@keyframes wx-fog{from{transform:translateX(-10%)}to{transform:translateX(10%)}}
@keyframes wx-flash{0%,88%,92%,96%,100%{opacity:0}90%,94%{opacity:.8}}
@media (prefers-reduced-motion: reduce){.wx-scene *{animation:none!important}}
`;

const CLOUDS = [
  { top: "4%", w: 320, h: 110, delay: "0s", dur: "70s" },
  { top: "18%", w: 420, h: 140, delay: "-25s", dur: "90s" },
  { top: "36%", w: 260, h: 90, delay: "-50s", dur: "65s" },
];

/** Animated background for a weather code. Pure CSS; honours prefers-reduced-motion. */
export function Sky({ code, isDay, compact }: { code: number; isDay: boolean; compact?: boolean }) {
  const kind = weatherCodeToSky(code);
  const cloudy = kind !== "clear";
  const darkClouds = kind === "rain" || kind === "storm";
  return (
    <div className="wx-scene" style={{ background: skyGradient(code, isDay) }}>
      <style href="sb-weather-sky" precedence="default">
        {CSS}
      </style>
      {!compact && (
        <>
          {isDay && (kind === "clear" || kind === "partly") && <div className="wx-sun" />}
          {!isDay && (kind === "clear" || kind === "partly") && (
            <>
              <div className="wx-stars" />
              <div className="wx-stars b" />
              <div className="wx-moon" />
            </>
          )}
          {cloudy &&
            CLOUDS.slice(0, kind === "partly" ? 2 : 3).map((c, i) => (
              <div
                key={i}
                className={darkClouds ? "wx-cloud dark" : "wx-cloud"}
                style={{ top: c.top, width: c.w, height: c.h, animationDelay: c.delay, animationDuration: c.dur }}
              />
            ))}
          {kind === "fog" && (
            <>
              <div className="wx-fog" style={{ top: "30%" }} />
              <div className="wx-fog" style={{ top: "55%", animationDelay: "-12s" }} />
            </>
          )}
          {(kind === "rain" || kind === "storm") && <div className="wx-rain" />}
          {kind === "drizzle" && <div className="wx-rain light" />}
          {kind === "snow" && (
            <>
              <div className="wx-snow" />
              <div className="wx-snow b" />
            </>
          )}
          {kind === "storm" && <div className="wx-flash" />}
        </>
      )}
    </div>
  );
}
