export const DOMAINS = {
  HERBOLOGY: "中药学",
} as const

export type DomainKey = keyof typeof DOMAINS

export const HERB_CATEGORIES = [
  "解表药", "清热药", "泻下药", "祛风湿药", "化湿药", "利水渗湿药",
  "温里药", "理气药", "消食药", "止血药", "活血化瘀药", "化痰止咳平喘药",
  "安神药", "平肝息风药", "补虚药", "收涩药",
] as const

export const RARITY_LEVELS = ["常见", "珍稀", "名贵", "传奇"] as const
