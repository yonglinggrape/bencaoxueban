import { COURSE_CHAPTERS } from "./chapters"

export function findSimilarHerbs(
  topicName: string,
  excludeHerb: string,
  count: number = 4
): { name: string; mastery: string }[] {
  const chapter = COURSE_CHAPTERS.find(c => c.name === topicName)
  if (!chapter) return []

  const allHerbs = [
    ...chapter.drugs.master.map(h => ({ name: h, mastery: "master" as const })),
    ...chapter.drugs.familiar.map(h => ({ name: h, mastery: "familiar" as const })),
    ...chapter.drugs.understand.map(h => ({ name: h, mastery: "understand" as const })),
  ].filter(h => h.name !== excludeHerb)

  return allHerbs.sort(() => Math.random() - 0.5).slice(0, count)
}
