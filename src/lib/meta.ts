export const meta = (title: string, description: string) => ({
  meta: [
    { title: `${title} · Pulsemail` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · Pulsemail` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});

export const trend = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  sent: 1800 + Math.round(Math.sin(i / 2) * 600 + i * 120),
  opens: 800 + Math.round(Math.cos(i / 3) * 300 + i * 70),
  clicks: 200 + Math.round(Math.sin(i / 1.5) * 90 + i * 25),
}));
