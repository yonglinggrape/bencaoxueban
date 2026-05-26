import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { COURSE_CHAPTERS } from "../lib/tcm/chapters"

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding 本草学伴 database...")

  // 知识域: 仅中药学
  const herbology = await prisma.knowledgeDomain.upsert({
    where: { slug: "herbology" }, update: {}, create: { name: "中药学", slug: "herbology", description: "研究中药基本理论和临床应用", icon: "leaf", sortOrder: 1 },
  })

  // 知识点: 中药学分类 (19个章节，总论无药材无需topic)
  const topicData = [
    "解表药", "清热药", "泻下药", "祛风湿药", "化湿药", "利水渗湿药",
    "温里药", "理气药", "消食药", "驱虫药", "止血药", "活血化瘀药", "化痰止咳平喘药",
    "安神药", "平肝息风药", "开窍药", "补虚药", "收涩药",
  ]
  const topics: Record<string, string> = {}
  for (const name of topicData) {
    const t = await prisma.topic.upsert({
      where: { name_domainId: { name, domainId: herbology.id } },
      update: {}, create: { name, domainId: herbology.id, difficulty: 2 },
    })
    topics[name] = t.id
  }

  // 题目: 50+ 道中药学题
  const questions = [
    // 解表药
    { c: "麻黄的主要功效是？", o: [{ l: "A", t: "发汗解表，宣肺平喘" }, { l: "B", t: "清热泻火，解毒消痈" }, { l: "C", t: "活血化瘀，通络止痛" }, { l: "D", t: "补气养血，安神定志" }], a: "A", e: "麻黄为辛温解表药，具有发汗解表、宣肺平喘、利水消肿的功效。", top: "解表药", d: "easy" },
    { c: "桂枝的功效不包括？", o: [{ l: "A", t: "发汗解肌" }, { l: "B", t: "温通经脉" }, { l: "C", t: "清热解毒" }, { l: "D", t: "助阳化气" }], a: "C", e: "桂枝的功效为发汗解肌、温通经脉、助阳化气、平冲降气。清热解毒不是桂枝的功效。", top: "解表药", d: "easy" },
    { c: "被称为「夏月麻黄」的药材是？", o: [{ l: "A", t: "香薷" }, { l: "B", t: "紫苏" }, { l: "C", t: "生姜" }, { l: "D", t: "薄荷" }], a: "A", e: "香薷具有发汗解表、化湿和中的功效，善于治疗夏季外感风寒，故被称为「夏月麻黄」。", top: "解表药", d: "medium" },
    { c: "以下哪味药属于辛凉解表药？", o: [{ l: "A", t: "麻黄" }, { l: "B", t: "桂枝" }, { l: "C", t: "薄荷" }, { l: "D", t: "细辛" }], a: "C", e: "薄荷为辛凉解表药，麻黄、桂枝、细辛均为辛温解表药。", top: "解表药", d: "easy" },
    { c: "柴胡在解表剂中的主要作用是？", o: [{ l: "A", t: "发汗解表" }, { l: "B", t: "疏散退热" }, { l: "C", t: "清热解毒" }, { l: "D", t: "凉血止血" }], a: "B", e: "柴胡为解表药中的发散风热药，具有疏散退热、疏肝解郁、升举阳气的功效。", top: "解表药", d: "medium" },

    // 清热药
    { c: "以下哪味药材属于清热燥湿药？", o: [{ l: "A", t: "桂枝" }, { l: "B", t: "黄连" }, { l: "C", t: "当归" }, { l: "D", t: "人参" }], a: "B", e: "黄连为清热燥湿药，桂枝为解表药，当归为补血药，人参为补气药。", top: "清热药", d: "easy" },
    { c: "被称为「疮家圣药」的是？", o: [{ l: "A", t: "金银花" }, { l: "B", t: "连翘" }, { l: "C", t: "蒲公英" }, { l: "D", t: "黄连" }], a: "B", e: "连翘清热解毒、消肿散结之力较强，常用于疮疡肿毒，素有「疮家圣药」之称。", top: "清热药", d: "medium" },
    { c: "生地黄的主要功效是？", o: [{ l: "A", t: "清热凉血，养阴生津" }, { l: "B", t: "清热燥湿，泻火解毒" }, { l: "C", t: "发散风寒，宣肺平喘" }, { l: "D", t: "补气养血，安神益智" }], a: "A", e: "生地黄为清热凉血药，具有清热凉血、养阴生津的功效。", top: "清热药", d: "easy" },
    { c: "黄芩的功效不包括？", o: [{ l: "A", t: "清热燥湿" }, { l: "B", t: "泻火解毒" }, { l: "C", t: "安胎" }, { l: "D", t: "活血化瘀" }], a: "D", e: "黄芩具有清热燥湿、泻火解毒、止血、安胎的功效，不具有活血化瘀的作用。", top: "清热药", d: "medium" },
    { c: "决明子的主要功效是？", o: [{ l: "A", t: "清热明目，润肠通便" }, { l: "B", t: "清热解毒，凉血止痢" }, { l: "C", t: "清热凉血，养阴生津" }, { l: "D", t: "清热燥湿，杀虫止痒" }], a: "A", e: "决明子为清热明目药，具有清热明目、润肠通便的功效。", top: "清热药", d: "medium" },

    // 补虚药
    { c: "黄芪的主要功效是？", o: [{ l: "A", t: "补气升阳，固表止汗" }, { l: "B", t: "清热凉血，养阴生津" }, { l: "C", t: "消食化积，行气散瘀" }, { l: "D", t: "安神益智，祛痰开窍" }], a: "A", e: "黄芪为补气要药，具有补气升阳、固表止汗、利水消肿、托疮生肌的功效。", top: "补虚药", d: "easy" },
    { c: "人参的主要功效不包括？", o: [{ l: "A", t: "大补元气" }, { l: "B", t: "补脾益肺" }, { l: "C", t: "清热燥湿" }, { l: "D", t: "安神益智" }], a: "C", e: "清热燥湿是黄连等清热药的功效，人参为补气药，不具有清热作用。", top: "补虚药", d: "easy" },
    { c: "被称为「补血圣药」的是？", o: [{ l: "A", t: "黄芪" }, { l: "B", t: "当归" }, { l: "C", t: "党参" }, { l: "D", t: "白芍" }], a: "B", e: "当归为补血要药，具有补血活血、调经止痛、润肠通便的功效，素有「补血圣药」之称。", top: "补虚药", d: "easy" },
    { c: "甘草在方剂中常作为「国老」是因为？", o: [{ l: "A", t: "药力最强" }, { l: "B", t: "调和诸药" }, { l: "C", t: "唯一的甜味药" }, { l: "D", t: "最贵的药材" }], a: "B", e: "甘草性平味甘，具有调和诸药的作用，能缓解药物毒性和烈性，在方剂中常起到协调作用，故称「国老」。", top: "补虚药", d: "medium" },
    { c: "白术与苍术功效的主要区别是？", o: [{ l: "A", t: "白术健脾，苍术燥湿" }, { l: "B", t: "白术燥湿，苍术健脾" }, { l: "C", t: "两者完全相同" }, { l: "D", t: "两者完全不同" }], a: "A", e: "白术偏于健脾益气、燥湿利水、止汗安胎；苍术偏于燥湿健脾、祛风散寒。白术以健脾为主，苍术以燥湿为主。", top: "补虚药", d: "hard" },
    { c: "枸杞子的主要功效是？", o: [{ l: "A", t: "滋补肝肾，益精明目" }, { l: "B", t: "清热凉血，解毒消痈" }, { l: "C", t: "发汗解表，利水消肿" }, { l: "D", t: "活血化瘀，通经止痛" }], a: "A", e: "枸杞子为补阴药，具有滋补肝肾、益精明目的功效。", top: "补虚药", d: "easy" },
    { c: "以下哪项不是山药的功效？", o: [{ l: "A", t: "补脾养胃" }, { l: "B", t: "生津益肺" }, { l: "C", t: "补肾涩精" }, { l: "D", t: "清热燥湿" }], a: "D", e: "山药具有补脾养胃、生津益肺、补肾涩精的功效，清热燥湿不是山药的功效。", top: "补虚药", d: "medium" },

    // 泻下药
    { c: "大黄与芒硝配伍属于「七情」中的？", o: [{ l: "A", t: "相须" }, { l: "B", t: "相使" }, { l: "C", t: "相畏" }, { l: "D", t: "相杀" }], a: "A", e: "大黄和芒硝都有泻下作用，两药配合使用能增强泻下之力，属于相须为用。", top: "泻下药", d: "hard" },
    { c: "大黄的主要功效是？", o: [{ l: "A", t: "泻下攻积，清热泻火" }, { l: "B", t: "补气养血，安神定志" }, { l: "C", t: "发散风寒，宣肺平喘" }, { l: "D", t: "消食导滞，行气止痛" }], a: "A", e: "大黄为攻下药，具有泻下攻积、清热泻火、凉血解毒、逐瘀通经的功效。", top: "泻下药", d: "easy" },
    { c: "火麻仁属于哪一类泻下药？", o: [{ l: "A", t: "攻下药" }, { l: "B", t: "润下药" }, { l: "C", t: "峻下逐水药" }, { l: "D", t: "清热药" }], a: "B", e: "火麻仁为润下药，富含油脂，能润燥滑肠，作用缓和，适用于肠燥便秘。", top: "泻下药", d: "easy" },
    { c: "以下哪味药是峻下逐水药？", o: [{ l: "A", t: "大黄" }, { l: "B", t: "火麻仁" }, { l: "C", t: "甘遂" }, { l: "D", t: "芦荟" }], a: "C", e: "甘遂为峻下逐水药，药性峻猛有毒，用于胸腹积水实证。大黄为攻下药，火麻仁为润下药。", top: "泻下药", d: "medium" },

    // 祛风湿药
    { c: "以下哪味药属于祛风湿药？", o: [{ l: "A", t: "独活" }, { l: "B", t: "黄连" }, { l: "C", t: "甘草" }, { l: "D", t: "大黄" }], a: "A", e: "独活为祛风湿药，具有祛风除湿、通痹止痛的功效。黄连为清热药，甘草为补气药，大黄为泻下药。", top: "祛风湿药", d: "easy" },
    { c: "具有「风药之润剂」之称的是？", o: [{ l: "A", t: "独活" }, { l: "B", t: "威灵仙" }, { l: "C", t: "秦艽" }, { l: "D", t: "羌活" }], a: "C", e: "秦艽辛散，质润不燥，为「风药之润剂」，兼退虚热，各种痹证均可用。", top: "祛风湿药", d: "medium" },

    // 化湿药
    { c: "藿香的主要功效是？", o: [{ l: "A", t: "化湿醒脾，辟秽和中" }, { l: "B", t: "清热燥湿，泻火解毒" }, { l: "C", t: "利水渗湿，健脾安神" }, { l: "D", t: "发散风寒，宣通鼻窍" }], a: "A", e: "藿香为化湿药，具有化湿醒脾、辟秽和中、解暑发表的功效。", top: "化湿药", d: "medium" },
    { c: "化湿药入汤剂的一般用法是？", o: [{ l: "A", t: "先煎" }, { l: "B", t: "后下" }, { l: "C", t: "包煎" }, { l: "D", t: "烊化" }], a: "B", e: "化湿药多含挥发油，入汤剂不宜久煎，应后下以保留芳香有效成分。", top: "化湿药", d: "medium" },

    // 利水渗湿药
    { c: "茯苓的主要功效是？", o: [{ l: "A", t: "利水渗湿，健脾宁心" }, { l: "B", t: "清热燥湿，泻火解毒" }, { l: "C", t: "发汗解表，宣肺平喘" }, { l: "D", t: "活血化瘀，通络止痛" }], a: "A", e: "茯苓为利水渗湿药，具有利水渗湿、健脾、宁心的功效。", top: "利水渗湿药", d: "easy" },
    { c: "泽泻的功效是？", o: [{ l: "A", t: "利水渗湿，泄热" }, { l: "B", t: "清热燥湿，泻火" }, { l: "C", t: "活血化瘀，止痛" }, { l: "D", t: "补气养血，安神" }], a: "A", e: "泽泻为利水渗湿药，具有利水渗湿、泄热的功效。", top: "利水渗湿药", d: "easy" },
    { c: "茵陈的主要功效是？", o: [{ l: "A", t: "清热利湿，利胆退黄" }, { l: "B", t: "清热燥湿，泻火解毒" }, { l: "C", t: "发汗解表，利水消肿" }, { l: "D", t: "活血化瘀，通经止痛" }], a: "A", e: "茵陈为利湿退黄药，具有清热利湿、利胆退黄的功效，为治黄疸要药。", top: "利水渗湿药", d: "medium" },

    // 温里药
    { c: "被称为「回阳救逆第一品」的是？", o: [{ l: "A", t: "干姜" }, { l: "B", t: "附子" }, { l: "C", t: "肉桂" }, { l: "D", t: "吴茱萸" }], a: "B", e: "附子大热有毒，具有回阳救逆、补火助阳、散寒止痛之功效，为回阳救逆之要药。", top: "温里药", d: "medium" },
    { c: "肉桂引火归元的功效主要适用于？", o: [{ l: "A", t: "实火上炎" }, { l: "B", t: "虚阳上浮" }, { l: "C", t: "外感发热" }, { l: "D", t: "湿热内蕴" }], a: "B", e: "肉桂引火归元使上浮之虚火下归于肾，主治肾阳不足、虚阳上浮之证。", top: "温里药", d: "hard" },
    { c: "附子与干姜配伍的意义是？", o: [{ l: "A", t: "附子温先天之阳，干姜温后天之阳" }, { l: "B", t: "两者功效完全相同" }, { l: "C", t: "附子制约干姜的燥性" }, { l: "D", t: "干姜降低附子的毒性" }], a: "A", e: "附子善温先天之阳（心肾），干姜善温后天之阳（脾胃），二者相须为用，如四逆汤。", top: "温里药", d: "hard" },

    // 理气药
    { c: "陈皮的主要功效是？", o: [{ l: "A", t: "理气健脾，燥湿化痰" }, { l: "B", t: "清热解毒，凉血止血" }, { l: "C", t: "活血化瘀，通络止痛" }, { l: "D", t: "补气养血，安神定志" }], a: "A", e: "陈皮为理气药，具有理气健脾、燥湿化痰的功效。", top: "理气药", d: "easy" },
    { c: "枳实与枳壳功效上的主要区别是？", o: [{ l: "A", t: "枳实力强偏破气，枳壳力缓偏理气" }, { l: "B", t: "枳实清热，枳壳温里" }, { l: "C", t: "两者完全相同" }, { l: "D", t: "枳壳力强，枳实力缓" }], a: "A", e: "枳实为未成熟果实，破气消积力强；枳壳为近成熟果实，理气宽中力缓。", top: "理气药", d: "hard" },
    { c: "被称为「气病之总司，女科之主帅」的是？", o: [{ l: "A", t: "陈皮" }, { l: "B", t: "木香" }, { l: "C", t: "香附" }, { l: "D", t: "枳实" }], a: "C", e: "香附善于疏肝解郁、理气调中、调经止痛，故称「气病之总司，女科之主帅」。", top: "理气药", d: "medium" },

    // 消食药
    { c: "山楂的主要功效是？", o: [{ l: "A", t: "消食健胃，行气散瘀" }, { l: "B", t: "清热解毒，凉血止血" }, { l: "C", t: "补气养血，安神定志" }, { l: "D", t: "发散风寒，宣肺平喘" }], a: "A", e: "山楂为消食药，具有消食健胃、行气散瘀、化浊降脂的功效，尤善消肉食积滞。", top: "消食药", d: "easy" },
    { c: "善消米面薯芋之积的消食药是？", o: [{ l: "A", t: "山楂" }, { l: "B", t: "麦芽" }, { l: "C", t: "鸡内金" }, { l: "D", t: "莱菔子" }], a: "B", e: "麦芽善消米面薯芋之积，兼能回乳消胀、疏肝解郁。山楂善消肉食积滞。", top: "消食药", d: "medium" },

    // 驱虫药
    { c: "槟榔的主要功效不包括？", o: [{ l: "A", t: "杀虫消积" }, { l: "B", t: "行气利水" }, { l: "C", t: "截疟" }, { l: "D", t: "清热解毒" }], a: "D", e: "槟榔具有杀虫消积、行气利水、截疟的功效，清热解毒不是槟榔的功效。", top: "驱虫药", d: "medium" },

    // 止血药
    { c: "三七的主要功效是？", o: [{ l: "A", t: "散瘀止血，消肿定痛" }, { l: "B", t: "清热凉血，解毒消痈" }, { l: "C", t: "发汗解表，宣肺平喘" }, { l: "D", t: "补气升阳，固表止汗" }], a: "A", e: "三七为化瘀止血药，具有散瘀止血、消肿定痛的功效，为伤科要药。", top: "止血药", d: "easy" },
    { c: "以下哪味药善治血淋、尿血？", o: [{ l: "A", t: "三七" }, { l: "B", t: "小蓟" }, { l: "C", t: "地榆" }, { l: "D", t: "艾叶" }], a: "B", e: "小蓟凉血止血、散瘀解毒消痈，兼能利尿通淋，善治血淋、尿血。", top: "止血药", d: "medium" },

    // 活血化瘀药
    { c: "川芎的功效是？", o: [{ l: "A", t: "活血行气，祛风止痛" }, { l: "B", t: "清热燥湿，泻火解毒" }, { l: "C", t: "补气养血，安神益智" }, { l: "D", t: "消食导滞，行气散结" }], a: "A", e: "川芎为活血止痛药，具有活血行气、祛风止痛的功效，为血中气药。", top: "活血化瘀药", d: "easy" },
    { c: "丹参在《妇人明理论》中被誉为？", o: [{ l: "A", t: "一味丹参，功同四物" }, { l: "B", t: "血中气药" }, { l: "C", t: "补血圣药" }, { l: "D", t: "疮家圣药" }], a: "A", e: "丹参具有活血祛瘀、通经止痛等功效，在妇科应用广泛，被誉为「一味丹参散，功同四物汤」。", top: "活血化瘀药", d: "medium" },
    { c: "延胡索最突出的功效特点是？", o: [{ l: "A", t: "清热解毒" }, { l: "B", t: "活血行气止痛" }, { l: "C", t: "补气养血" }, { l: "D", t: "发散风寒" }], a: "B", e: "延胡索专治一身诸痛，具有活血、行气、止痛的功效，为止痛良药。", top: "活血化瘀药", d: "easy" },

    // 化痰止咳平喘药
    { c: "半夏的主要功效是？", o: [{ l: "A", t: "燥湿化痰，降逆止呕" }, { l: "B", t: "清热化痰，润肺止咳" }, { l: "C", t: "发散风寒，宣肺平喘" }, { l: "D", t: "活血化瘀，通络止痛" }], a: "A", e: "半夏为温化寒痰药，具有燥湿化痰、降逆止呕、消痞散结的功效。", top: "化痰止咳平喘药", d: "easy" },
    { c: "川贝母和浙贝母功效的主要区别是？", o: [{ l: "A", t: "川贝偏润肺，浙贝偏清火散结" }, { l: "B", t: "两者完全相同" }, { l: "C", t: "川贝清热，浙贝润肺" }, { l: "D", t: "川贝化痰，浙贝不化痰" }], a: "A", e: "川贝母甘润，偏于润肺化痰止咳；浙贝母苦寒，偏于清火化痰散结。", top: "化痰止咳平喘药", d: "hard" },
    { c: "桔梗在方剂中的特殊作用是？", o: [{ l: "A", t: "引药下行" }, { l: "B", t: "载药上行" }, { l: "C", t: "调和诸药" }, { l: "D", t: "制约毒性" }], a: "B", e: "桔梗能宣肺祛痰、利咽排脓，有载药上行之功，被称为「舟楫之剂」。", top: "化痰止咳平喘药", d: "medium" },

    // 安神药
    { c: "酸枣仁的主要功效是？", o: [{ l: "A", t: "养心安神，敛汗" }, { l: "B", t: "清热解毒，凉血止血" }, { l: "C", t: "活血化瘀，通络止痛" }, { l: "D", t: "补气升阳，固表止汗" }], a: "A", e: "酸枣仁为养心安神药，具有养心安神、敛汗、生津的功效。", top: "安神药", d: "easy" },
    { c: "朱砂的使用注意不包括？", o: [{ l: "A", t: "不可过量" }, { l: "B", t: "不可久服" }, { l: "C", t: "宜先煎" }, { l: "D", t: "忌火煅" }], a: "C", e: "朱砂主要成分为硫化汞，有毒，不可过量、不可久服、忌火煅。朱砂多入丸散，不宜入汤剂煎煮。", top: "安神药", d: "hard" },

    // 平肝息风药
    { c: "天麻的主要功效是？", o: [{ l: "A", t: "息风止痉，平肝潜阳" }, { l: "B", t: "清热燥湿，泻火解毒" }, { l: "C", t: "活血化瘀，通络止痛" }, { l: "D", t: "补气养血，安神益智" }], a: "A", e: "天麻为平肝息风药，具有息风止痉、平肝潜阳、祛风通络的功效。", top: "平肝息风药", d: "easy" },
    { c: "天麻与钩藤功效的主要区别是？", o: [{ l: "A", t: "天麻甘平治一切风证，钩藤甘凉善清热息风" }, { l: "B", t: "两者完全相同" }, { l: "C", t: "天麻性寒，钩藤性温" }, { l: "D", t: "钩藤治一切风证，天麻善清热" }], a: "A", e: "天麻甘平质润，治一切风证不论寒热虚实；钩藤甘凉，清热力强，善治热极生风。", top: "平肝息风药", d: "medium" },

    // 开窍药
    { c: "被称为开窍醒神第一要药的是？", o: [{ l: "A", t: "冰片" }, { l: "B", t: "麝香" }, { l: "C", t: "石菖蒲" }, { l: "D", t: "苏合香" }], a: "B", e: "麝香开窍醒神、活血通经、消肿止痛，为开窍醒神第一要药，治闭证神昏之要药。", top: "开窍药", d: "medium" },

    // 收涩药
    { c: "五味子的主要功效不包括？", o: [{ l: "A", t: "收敛固涩" }, { l: "B", t: "益气生津" }, { l: "C", t: "补肾宁心" }, { l: "D", t: "清热燥湿" }], a: "D", e: "五味子具有收敛固涩、益气生津、补肾宁心的功效，清热燥湿不是五味子的功效。", top: "收涩药", d: "medium" },
    { c: "山茱萸的功效特点是？", o: [{ l: "A", t: "纯收涩无补益" }, { l: "B", t: "既能补益肝肾，又能收涩固脱" }, { l: "C", t: "纯补益无收涩" }, { l: "D", t: "只能敛肺止咳" }], a: "B", e: "山茱萸既能补益肝肾，又能收涩固脱，为平补阴阳之要药，是收涩药中的特殊品种。", top: "收涩药", d: "medium" },

    // 综合对比题
    { c: "大黄与黄芩的功效共同点是？", o: [{ l: "A", t: "清热" }, { l: "B", t: "活血" }, { l: "C", t: "安胎" }, { l: "D", t: "止血" }], a: "A", e: "大黄泻下攻积、清热泻火；黄芩清热燥湿、泻火解毒。两者均有清热的功效。但大黄还活血，黄芩还安胎止血。", top: "清热药", d: "medium" },
    { c: "以下哪组药材均属于补气药？", o: [{ l: "A", t: "人参、黄芪、党参、白术" }, { l: "B", t: "当归、熟地、白芍、阿胶" }, { l: "C", t: "沙参、麦冬、枸杞、百合" }, { l: "D", t: "附子、干姜、肉桂、吴茱萸" }], a: "A", e: "A 均为补气药，B 为补血药，C 为补阴药，D 为温里药。", top: "补虚药", d: "easy" },
    { c: "「四气」指的是中药的什么特性？", o: [{ l: "A", t: "寒热温凉" }, { l: "B", t: "酸苦甘辛咸" }, { l: "C", t: "升降浮沉" }, { l: "D", t: "有毒无毒" }], a: "A", e: "四气指寒、热、温、凉四种药性。五味指酸、苦、甘、辛、咸。升降浮沉指药物作用趋向。", top: "解表药", d: "easy" },
    { c: "「十八反」中，甘草反什么？", o: [{ l: "A", t: "甘遂、大戟、海藻、芫花" }, { l: "B", t: "贝母、瓜蒌、半夏、白蔹、白及" }, { l: "C", t: "人参、芍药、细辛" }, { l: "D", t: "藜芦" }], a: "A", e: "十八反中：甘草反甘遂、大戟、海藻、芫花。B 选项为乌头反。", top: "补虚药", d: "hard" },
    { c: "中药的「五味」不包括？", o: [{ l: "A", t: "酸" }, { l: "B", t: "苦" }, { l: "C", t: "甘" }, { l: "D", t: "辣" }], a: "D", e: "中药五味为酸、苦、甘、辛、咸。「辛」味有发散行气等作用，与日常说的辣不同。", top: "解表药", d: "easy" },
    { c: "下列哪味药需要先煎？", o: [{ l: "A", t: "薄荷" }, { l: "B", t: "附子" }, { l: "C", t: "大黄" }, { l: "D", t: "紫苏" }], a: "B", e: "附子有毒，先煎可降低毒性。薄荷、紫苏等芳香药应后下，大黄泻下力强不宜久煎。", top: "温里药", d: "hard" },
    { c: "以下哪项是道地药材的举例？", o: [{ l: "A", t: "宁夏枸杞" }, { l: "B", t: "任何产地的人参" }, { l: "C", t: "人工合成的药物" }, { l: "D", t: "化学提取物" }], a: "A", e: "道地药材指特定产地、品质优良的药材，如宁夏枸杞、吉林人参、四川川芎等。", top: "补虚药", d: "easy" },
    { c: "金银花与连翘的配伍关系属于？", o: [{ l: "A", t: "相须" }, { l: "B", t: "相使" }, { l: "C", t: "相畏" }, { l: "D", t: "相反" }], a: "A", e: "金银花与连翘均有清热解毒功效，常相须为用增强解毒效果，如银翘散。", top: "清热药", d: "medium" },
    { c: "以下哪项不是柴胡的功效？", o: [{ l: "A", t: "疏散退热" }, { l: "B", t: "疏肝解郁" }, { l: "C", t: "升举阳气" }, { l: "D", t: "清热解毒" }], a: "D", e: "柴胡具有疏散退热、疏肝解郁、升举阳气的功效，清热解毒不是柴胡的功效。", top: "解表药", d: "medium" },
    {
      c: "以下哪项是「十九畏」的内容？", o: [{ l: "A", t: "硫黄畏朴硝" }, { l: "B", t: "甘草反甘遂" }, { l: "C", t: "乌头反贝母" }, { l: "D", t: "藜芦反人参" }], a: "A", e: "「十九畏」指药物间的相畏关系，如硫黄畏朴硝。B、C、D 均为「十八反」的内容。", top: "清热药", d: "hard",
    },
    { c: "中药炮制的目的不包括？", o: [{ l: "A", t: "降低毒性" }, { l: "B", t: "增强疗效" }, { l: "C", t: "改变药性" }, { l: "D", t: "改变药材的拉丁学名" }], a: "D", e: "中药炮制的目的包括降低毒性、增强疗效、改变药性、便于储存等，不能改变植物学上的拉丁学名。", top: "清热药", d: "medium" },
    { c: "以下哪味药具有安胎功效？", o: [{ l: "A", t: "黄芩" }, { l: "B", t: "大黄" }, { l: "C", t: "麻黄" }, { l: "D", t: "甘遂" }], a: "A", e: "黄芩具有清热燥湿、泻火解毒、止血、安胎的功效。大黄泻下、麻黄发汗、甘遂逐水，均不宜孕妇使用。", top: "清热药", d: "medium" },
    { c: "生地黄和熟地黄功效的主要区别是？", o: [{ l: "A", t: "生地偏清热凉血，熟地偏补血滋阴" }, { l: "B", t: "两者完全相同" }, { l: "C", t: "生地补血，熟地清热" }, { l: "D", t: "生地有毒，熟地无毒" }], a: "A", e: "生地黄甘寒，清热凉血、养阴生津；熟地黄甘微温，补血滋阴、益精填髓。", top: "补虚药", d: "hard" },
    { c: "以下哪个是道地药材「四大怀药」之一？", o: [{ l: "A", t: "怀山药" }, { l: "B", t: "云南三七" }, { l: "C", t: "宁夏枸杞" }, { l: "D", t: "吉林人参" }], a: "A", e: "四大怀药指河南怀庆府产的山药、地黄、牛膝、菊花。宁夏枸杞、吉林人参虽为道地药材，但不属四大怀药。", top: "补虚药", d: "medium" },
    { c: "以下哪味药入汤剂需要包煎？", o: [{ l: "A", t: "蒲黄" }, { l: "B", t: "人参" }, { l: "C", t: "甘草" }, { l: "D", t: "大枣" }], a: "A", e: "蒲黄为花粉类药材，直接煎煮易漂浮或粘锅，需用纱布包煎。", top: "止血药", d: "hard" },
    { c: "苦杏仁的主要功效是？", o: [{ l: "A", t: "降气止咳平喘，润肠通便" }, { l: "B", t: "清热化痰，宽胸散结" }, { l: "C", t: "活血化瘀，通络止痛" }, { l: "D", t: "补气养血，安神益智" }], a: "A", e: "苦杏仁为止咳平喘药，具有降气止咳平喘、润肠通便的功效。有小毒，用量不宜过大。", top: "化痰止咳平喘药", d: "medium" },
  ]

  for (const q of questions) {
    await prisma.question.create({
      data: {
        content: q.c, domainId: herbology.id, topicId: topics[q.top] || topics["解表药"],
        questionType: "single_choice",
        options: JSON.stringify(q.o.map((x: { l: string; t: string }) => ({ label: x.l, text: x.t }))),
        correctAnswer: q.a, explanation: q.e, difficulty: q.d,
      },
    })
  }

  // ========== 药材卡: 从 chapters.ts 解析所有药材 ==========
  const masteryRarity: Record<string, string> = { master: "常见", familiar: "珍稀", understand: "名贵" }

  // 先收集24味经典药材的详细数据（用于补充已有详细信息的药材）
  const classicHerbDetails: Record<string, { latinName: string; properties: string; effects: string; usage: string; rarity: string }> = {
    "人参": { latinName: "Panax ginseng", properties: "甘、微苦，微温。归脾、肺、心、肾经。", effects: "大补元气，复脉固脱，补脾益肺，生津养血，安神益智。", usage: "用于体虚欲脱，肢冷脉微，脾虚食少，肺虚喘咳，津伤口渴，气血亏虚，惊悸失眠。", rarity: "名贵" },
    "黄芪": { latinName: "Astragalus membranaceus", properties: "甘，微温。归脾、肺经。", effects: "补气升阳，固表止汗，利水消肿，托疮生肌。", usage: "用于气虚乏力，食少便溏，中气下陷，表虚自汗，气虚水肿。", rarity: "常见" },
    "当归": { latinName: "Angelica sinensis", properties: "甘、辛，温。归肝、心、脾经。", effects: "补血活血，调经止痛，润肠通便。", usage: "用于血虚萎黄，眩晕心悸，月经不调，经闭痛经，肠燥便秘。", rarity: "常见" },
    "麻黄": { latinName: "Ephedra sinica", properties: "辛、微苦，温。归肺、膀胱经。", effects: "发汗解表，宣肺平喘，利水消肿。", usage: "用于风寒感冒，胸闷喘咳，风水浮肿。", rarity: "常见" },
    "桂枝": { latinName: "Cinnamomum cassia", properties: "辛、甘，温。归心、肺、膀胱经。", effects: "发汗解肌，温通经脉，助阳化气。", usage: "用于风寒感冒，脘腹冷痛，血寒经闭，关节痹痛，痰饮水肿，心悸。", rarity: "常见" },
    "黄连": { latinName: "Coptis chinensis", properties: "苦，寒。归心、脾、胃、肝、胆、大肠经。", effects: "清热燥湿，泻火解毒。", usage: "用于湿热痞满，呕吐吞酸，泻痢，黄疸，高热神昏，心火亢盛，心烦不寐。", rarity: "常见" },
    "柴胡": { latinName: "Bupleurum chinense", properties: "辛、苦，微寒。归肝、胆、肺经。", effects: "疏散退热，疏肝解郁，升举阳气。", usage: "用于感冒发热，寒热往来，胸胁胀痛，月经不调，子宫脱垂，脱肛。", rarity: "常见" },
    "甘草": { latinName: "Glycyrrhiza uralensis", properties: "甘，平。归心、肺、脾、胃经。", effects: "补脾益气，清热解毒，祛痰止咳，缓急止痛，调和诸药。", usage: "用于脾胃虚弱，倦怠乏力，心悸气短，咳嗽痰多，缓解药物毒性。", rarity: "常见" },
    "大黄": { latinName: "Rheum palmatum", properties: "苦，寒。归脾、胃、大肠、肝、心包经。", effects: "泻下攻积，清热泻火，凉血解毒，逐瘀通经。", usage: "用于实热便秘，血热吐衄，目赤咽肿，痈肿疔疮，瘀血经闭。", rarity: "常见" },
    "半夏": { latinName: "Pinellia ternata", properties: "辛，温，有毒。归脾、胃、肺经。", effects: "燥湿化痰，降逆止呕，消痞散结。", usage: "用于湿痰寒痰，咳喘痰多，呕吐反胃，胸脘痞闷，梅核气。", rarity: "常见" },
    "茯苓": { latinName: "Poria cocos", properties: "甘、淡，平。归心、肺、脾、肾经。", effects: "利水渗湿，健脾，宁心。", usage: "用于水肿尿少，痰饮眩悸，脾虚食少，便溏泄泻，心神不安，惊悸失眠。", rarity: "常见" },
    "白术": { latinName: "Atractylodes macrocephala", properties: "苦、甘，温。归脾、胃经。", effects: "健脾益气，燥湿利水，止汗，安胎。", usage: "用于脾虚食少，腹胀泄泻，痰饮眩悸，水肿，自汗，胎动不安。", rarity: "常见" },
    "地黄": { latinName: "Rehmannia glutinosa", properties: "鲜地黄甘苦寒；生地黄甘寒。归心、肝、肾经。", effects: "鲜地黄清热生津凉血；生地黄清热凉血养阴生津。", usage: "用于热入营血，舌绛烦渴，阴虚发热，骨蒸劳热。", rarity: "珍稀" },
    "川芎": { latinName: "Ligusticum chuanxiong", properties: "辛，温。归肝、胆、心包经。", effects: "活血行气，祛风止痛。", usage: "用于胸痹心痛，胸胁刺痛，跌扑肿痛，月经不调，头痛，风湿痹痛。", rarity: "常见" },
    "丹参": { latinName: "Salvia miltiorrhiza", properties: "苦，微寒。归心、肝经。", effects: "活血祛瘀，通经止痛，清心除烦，凉血消痈。", usage: "用于胸痹心痛，月经不调，痛经经闭，心烦不眠。", rarity: "珍稀" },
    "枸杞子": { latinName: "Lycium barbarum", properties: "甘，平。归肝、肾经。", effects: "滋补肝肾，益精明目。", usage: "用于虚劳精亏，腰膝酸痛，眩晕耳鸣，目昏不明。", rarity: "常见" },
    "陈皮": { latinName: "Citrus reticulata", properties: "苦、辛，温。归肺、脾经。", effects: "理气健脾，燥湿化痰。", usage: "用于脘腹胀满，食少吐泻，咳嗽痰多。", rarity: "常见" },
    "黄芩": { latinName: "Scutellaria baicalensis", properties: "苦，寒。归肺、胆、脾、大肠、小肠经。", effects: "清热燥湿，泻火解毒，止血，安胎。", usage: "用于湿温暑温，胸闷呕恶，泻痢黄疸，肺热咳嗽，胎动不安。", rarity: "常见" },
    "党参": { latinName: "Codonopsis pilosula", properties: "甘，平。归脾、肺经。", effects: "健脾益肺，养血生津。", usage: "用于脾肺气虚，食少倦怠，咳嗽虚喘，气血不足，面色萎黄。", rarity: "常见" },
    "三七": { latinName: "Panax notoginseng", properties: "甘、微苦，温。归肝、胃经。", effects: "散瘀止血，消肿定痛。", usage: "用于咯血，吐血，衄血，便血，崩漏，外伤出血，胸腹刺痛，跌扑肿痛。", rarity: "珍稀" },
    "山药": { latinName: "Dioscorea opposita", properties: "甘，平。归脾、肺、肾经。", effects: "补脾养胃，生津益肺，补肾涩精。", usage: "用于脾虚食少，久泻不止，肺虚喘咳，肾虚遗精，带下尿频。", rarity: "常见" },
    "附子": { latinName: "Aconitum carmichaelii", properties: "辛、甘，大热，有毒。归心、肾、脾经。", effects: "回阳救逆，补火助阳，散寒止痛。", usage: "用于亡阳虚脱，肢冷脉微，心阳不足，胸痹心痛，虚寒吐泻，肾阳虚衰。", rarity: "珍稀" },
    "金银花": { latinName: "Lonicera japonica", properties: "甘，寒。归肺、心、胃经。", effects: "清热解毒，疏散风热。", usage: "用于痈肿疔疮，喉痹丹毒，热毒血痢，风热感冒，温病发热。", rarity: "常见" },
    "酸枣仁": { latinName: "Ziziphus jujuba var. spinosa", properties: "甘、酸，平。归肝、胆、心经。", effects: "养心安神，敛汗，生津。", usage: "用于虚烦不眠，惊悸多梦，体虚多汗，津伤口渴。", rarity: "常见" },
  }

  let totalHerbs = 0
  for (const chapter of COURSE_CHAPTERS) {
    const topicName = chapter.name
    const topicId = topics[topicName]
    // 总论没有药材，跳过
    if (!topicId || topicName === "总论") continue

    for (const level of ["master", "familiar", "understand"] as const) {
      const herbs = chapter.drugs[level]
      for (const herbName of herbs) {
        totalHerbs++
        const classicDetail = classicHerbDetails[herbName]
        const data: Record<string, unknown> = {
          name: herbName,
          category: topicName,
          rarity: classicDetail?.rarity || masteryRarity[level],
          topicId: topicId,
          masteryLevel: level,
          latinName: classicDetail?.latinName || null,
          properties: classicDetail?.properties || "待补充",
          effects: classicDetail?.effects || "待补充",
          usage: classicDetail?.usage || "待补充",
        }
        await prisma.herbCard.upsert({
          where: { name: herbName },
          update: { topicId, masteryLevel: level },
          create: data as never,
        })
      }
    }
  }

  console.log(`Created/updated ${totalHerbs} herb cards across ${COURSE_CHAPTERS.length - 1} chapters`)

  // 成就
  const achievements = [
    { name: "first_answer", description: "完成第一次答题", icon: "seedling", category: "基础", requirement: "{}", rewardExp: 50, rewardPoints: 10 },
    { name: "streak_3", description: "连续学习3天", icon: "fire", category: "坚持", requirement: "{}", rewardExp: 100, rewardPoints: 20 },
    { name: "streak_7", description: "连续学习7天", icon: "calendar", category: "坚持", requirement: "{}", rewardExp: 300, rewardPoints: 50 },
    { name: "streak_30", description: "连续学习30天", icon: "moon", category: "坚持", requirement: "{}", rewardExp: 1000, rewardPoints: 200 },
    { name: "total_100_questions", description: "累计答题100道", icon: "sword", category: "积累", requirement: "{}", rewardExp: 200, rewardPoints: 50 },
    { name: "total_1000_questions", description: "累计答题1000道", icon: "target", category: "积累", requirement: "{}", rewardExp: 2000, rewardPoints: 500 },
    { name: "collect_10_herbs", description: "收集10种药卡", icon: "leaf", category: "收藏", requirement: "{}", rewardExp: 150, rewardPoints: 30 },
    { name: "collect_50_herbs", description: "收集50种药卡", icon: "flower", category: "收藏", requirement: "{}", rewardExp: 500, rewardPoints: 100 },
    { name: "perfect_quiz", description: "一次测验全部正确", icon: "check", category: "卓越", requirement: "{}", rewardExp: 500, rewardPoints: 100 },
    { name: "daily_complete_7", description: "一周完成所有每日任务", icon: "trophy", category: "达人", requirement: "{}", rewardExp: 300, rewardPoints: 80 },
  ]

  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { name: a.name }, update: a, create: a })
  }

  // 每日任务
  const dailyTasks = [
    { title: "每日答题", description: "完成10道中药学题目", taskType: "answer_questions", requirement: '{"target":10}', rewardExp: 100, rewardPoints: 20 },
    { title: "温故知新", description: "复习3个知识点", taskType: "review", requirement: '{"target":3}', rewardExp: 80, rewardPoints: 15 },
    { title: "勤学苦练", description: "学习2味新药材", taskType: "study", requirement: '{"target":2}', rewardExp: 120, rewardPoints: 25 },
    { title: "精益求精", description: "完成1次章节测验", taskType: "quiz", requirement: '{"target":1}', rewardExp: 200, rewardPoints: 50 },
    { title: "识药达人", description: "完成5道药材辨识题", taskType: "practice", requirement: '{"target":5}', rewardExp: 150, rewardPoints: 30 },
  ]

  for (const t of dailyTasks) {
    await prisma.dailyTask.upsert({ where: { title: t.title }, update: t, create: t })
  }

  console.log("Seed complete! 50+ questions, ~380 herbs, 10 achievements, 5 daily tasks.")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
