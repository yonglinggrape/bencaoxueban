// Complete all 解表药 herb card data
import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" })
const prisma = new PrismaClient({ adapter })

interface HerbFull {
  latinName: string; properties: string; effects: string; usage: string; rarity: string; mnemonic?: string
}

const data: Record<string, HerbFull> = {
  // === 发散风寒药 (master) ===
  "紫苏叶": {
    latinName: "Perilla frutescens",
    properties: "辛，温。归肺、脾经。",
    effects: "解表散寒，行气和胃，解鱼蟹毒，安胎。",
    usage: "用于风寒感冒，咳嗽呕恶，脾胃气滞，妊娠恶阻，鱼蟹中毒。",
    rarity: "常见",
  },
  "防风": {
    latinName: "Saposhnikovia divaricata",
    properties: "辛、甘，微温。归膀胱、肝、脾经。",
    effects: "祛风解表，胜湿止痛，止痉。",
    usage: "用于外感表证，风疹瘙痒，风湿痹痛，破伤风。",
    rarity: "常见",
  },
  "羌活": {
    latinName: "Notopterygium incisum",
    properties: "辛、苦，温。归膀胱、肾经。",
    effects: "解表散寒，祛风除湿，止痛。",
    usage: "用于风寒感冒，头痛项强，风湿痹痛，肩背酸痛。",
    rarity: "常见",
  },
  "白芷": {
    latinName: "Angelica dahurica",
    properties: "辛，温。归胃、大肠、肺经。",
    effects: "解表散寒，祛风止痛，宣通鼻窍，燥湿止带，消肿排脓。",
    usage: "用于风寒感冒，头痛眉棱骨痛，鼻渊鼻塞，带下，疮疡肿痛。",
    rarity: "常见",
  },
  "细辛": {
    latinName: "Asarum sieboldii",
    properties: "辛，温，有小毒。归心、肺、肾经。",
    effects: "解表散寒，祛风止痛，通窍，温肺化饮。",
    usage: "用于风寒感冒，头痛牙痛，鼻渊鼻塞，风湿痹痛，痰饮喘咳。",
    rarity: "常见",
  },
  "薄荷": {
    latinName: "Mentha haplocalyx",
    properties: "辛，凉。归肺、肝经。",
    effects: "疏散风热，清利头目，利咽透疹，疏肝行气。",
    usage: "用于风热感冒，头痛目赤，咽喉肿痛，麻疹不透，肝郁胁痛。",
    rarity: "常见",
  },
  "牛蒡子": {
    latinName: "Arctium lappa",
    properties: "辛、苦，寒。归肺、胃经。",
    effects: "疏散风热，宣肺祛痰，利咽透疹，解毒消肿。",
    usage: "用于风热感冒，咳嗽痰多，咽喉肿痛，麻疹不透，痈肿疮毒。",
    rarity: "常见",
  },
  "蝉蜕": {
    latinName: "Cryptotympana pustulata",
    properties: "甘，寒。归肺、肝经。",
    effects: "疏散风热，利咽开音，透疹，明目退翳，息风止痉。",
    usage: "用于风热感冒，咽痛音哑，麻疹不透，风疹瘙痒，目赤翳障，小儿惊风。",
    rarity: "常见",
  },
  "菊花": {
    latinName: "Chrysanthemum morifolium",
    properties: "甘、苦，微寒。归肺、肝经。",
    effects: "疏散风热，平抑肝阳，清肝明目，清热解毒。",
    usage: "用于风热感冒，头痛眩晕，目赤肿痛，眼目昏花，疮痈肿毒。",
    rarity: "常见",
  },
  "葛根": {
    latinName: "Pueraria lobata",
    properties: "甘、辛，凉。归脾、胃、肺经。",
    effects: "解肌退热，透疹，生津止渴，升阳止泻，通经活络，解酒毒。",
    usage: "用于外感发热头痛，项背强痛，麻疹不透，热病口渴，泄泻，高血压。",
    rarity: "常见",
  },

  // === 发散风寒药 (familiar) ===
  "生姜": {
    latinName: "Zingiber officinale",
    properties: "辛，微温。归肺、脾、胃经。",
    effects: "解表散寒，温中止呕，温肺止咳，解鱼蟹毒。",
    usage: "用于风寒感冒，胃寒呕吐，寒痰咳嗽，鱼蟹中毒。",
    rarity: "常见",
  },
  "荆芥": {
    latinName: "Schizonepeta tenuifolia",
    properties: "辛，微温。归肺、肝经。",
    effects: "祛风解表，透疹消疮，止血（炒炭）。",
    usage: "用于外感表证，麻疹不透，风疹瘙痒，疮疡初起，吐衄下血（炒炭）。",
    rarity: "常见",
  },
  "藁本": {
    latinName: "Ligusticum sinense",
    properties: "辛，温。归膀胱经。",
    effects: "祛风散寒，除湿止痛。",
    usage: "用于风寒感冒，巅顶头痛，风湿痹痛。",
    rarity: "常见",
  },
  "辛夷": {
    latinName: "Magnolia biondii",
    properties: "辛，温。归肺、胃经。",
    effects: "散风寒，通鼻窍。",
    usage: "用于风寒头痛，鼻渊鼻塞，鼻流浊涕。包煎。",
    rarity: "常见",
  },
  "升麻": {
    latinName: "Cimicifuga foetida",
    properties: "辛、甘，微寒。归肺、脾、胃、大肠经。",
    effects: "发表透疹，清热解毒，升举阳气。",
    usage: "用于风热头痛，麻疹不透，齿痛口疮，咽喉肿痛，中气下陷。",
    rarity: "常见",
  },
  "淡豆豉": {
    latinName: "Glycine max",
    properties: "苦、辛，凉。归肺、胃经。",
    effects: "解表除烦，宣发郁热。",
    usage: "用于外感表证，胸中烦闷，虚烦不眠。",
    rarity: "常见",
  },
  "桑叶": {
    latinName: "Morus alba",
    properties: "甘、苦，寒。归肺、肝经。",
    effects: "疏散风热，清肺润燥，平抑肝阳，清肝明目。",
    usage: "用于风热感冒，肺热燥咳，头晕头痛，目赤昏花。",
    rarity: "常见",
  },
  "木贼": {
    latinName: "Equisetum hiemale",
    properties: "甘、苦，平。归肺、肝经。",
    effects: "疏散风热，明目退翳。",
    usage: "用于风热目赤，迎风流泪，目生翳障。",
    rarity: "常见",
  },

  // === 发散风寒/风热药 (understand) ===
  "香薷": {
    latinName: "Mosla chinensis",
    properties: "辛，微温。归肺、脾、胃经。",
    effects: "发汗解表，化湿和中，利水消肿。",
    usage: "用于夏季外感风寒，暑湿证，水肿小便不利。",
    rarity: "常见",
  },
  "苍耳子": {
    latinName: "Xanthium sibiricum",
    properties: "辛、苦，温，有小毒。归肺经。",
    effects: "散风寒，通鼻窍，祛风湿，止痛。",
    usage: "用于风寒头痛，鼻渊鼻塞，风湿痹痛，风疹瘙痒。",
    rarity: "常见",
  },
  "浮萍": {
    latinName: "Spirodela polyrrhiza",
    properties: "辛，寒。归肺、膀胱经。",
    effects: "发汗解表，透疹止痒，利水消肿。",
    usage: "用于风热感冒，麻疹不透，风疹瘙痒，水肿尿少。",
    rarity: "常见",
  },
  "蔓荆子": {
    latinName: "Vitex trifolia",
    properties: "辛、苦，微寒。归膀胱、肝、胃经。",
    effects: "疏散风热，清利头目。",
    usage: "用于风热感冒，头痛头风，目赤肿痛，目昏多泪。",
    rarity: "常见",
  },
  "西河柳": {
    latinName: "Tamarix chinensis",
    properties: "辛、甘，平。归肺、胃、心经。",
    effects: "发表透疹，祛风除湿。",
    usage: "用于麻疹不透，风疹瘙痒，风湿痹痛。",
    rarity: "珍稀",
    mnemonic: "【口诀】西河柳发表透疹，祛风除湿。\n【记忆】西河柳→河边的柳树→发表透疹(如柳条透发)，祛风除湿(河边潮湿)。",
  },
  "谷精草": {
    latinName: "Eriocaulon buergerianum",
    properties: "辛、甘，平。归肝、肺经。",
    effects: "疏散风热，明目退翳。",
    usage: "用于风热目赤，目生翳障，羞明流泪。",
    rarity: "常见",
    mnemonic: "【口诀】谷精草疏散风热，明目退翳。\n【记忆】谷精草→谷物精华→明目退翳之良药，善治风热目疾。",
  },
}

async function main() {
  console.log("Completing 解表药 herb data...")
  let count = 0
  for (const [name, d] of Object.entries(data)) {
    await prisma.herbCard.updateMany({
      where: { name },
      data: {
        latinName: d.latinName,
        properties: d.properties,
        effects: d.effects,
        usage: d.usage,
        rarity: d.rarity,
        ...(d.mnemonic ? { mnemonic: d.mnemonic } : {}),
      },
    })
    count++
  }
  console.log(`Updated ${count} herbs.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
