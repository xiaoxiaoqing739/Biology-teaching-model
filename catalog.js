/*
 * 破壳 BIRDCANFLY · 资源索引(catalog.js)
 * ---------------------------------------------------------------
 * 新增资源的完整流程:
 *   1. 把做好的资源文件夹放进 apps/<资源名>/(入口为 index.html,自包含)
 *   2. 封面图放进 assets/covers/,文件名与 cover 字段对应
 *   3. 在下方 SITE_CATALOG 数组按格式追加一条记录,保存刷新即可
 *
 * 字段说明:
 *   id        唯一标识(与 apps/ 下的文件夹名保持一致)
 *   title     资源名称(卡片标题)
 *   node      所属小节的节点 id(见下方 SITE_BOOKS 目录树)
 *             —— 章内各小节 id 为"章 id-序号",如 7x-10-2 表示
 *                七年级下册第10章第2节"感受器和感觉器官"
 *   desc      一句话介绍
 *   url       资源入口(相对本文件所在目录,仅上线资源需要)
 *   cover     封面图路径(可省略,省略时不显示图片)
 *   type      资源类型:3D 模型 / 虚拟实验 / 互动游戏 / 课堂游戏 …
 *   status    "online" 已上线(可点击)| "soon" 孵化中(仅展示)
 *   featured  true 时在首页"精选推荐"优先展示
 */
window.SITE_CATALOG = [
  {
    id: "diffuse-lab",
    title: "细胞大小与物质扩散实验台",
    node: "7s-3-1",
    desc: "三个烧杯里泡着 3/2/1cm 的琼脂块:计时、切面、测量扩散深度,自动汇总数据并绘制图表,直观呈现“细胞为什么这么小”。",
    url: "diffuse-lab/index.html",
    cover: "assets/covers/diffuse-lab.jpg",
    type: "虚拟实验",
    status: "online",
    featured: true
  },
  {
    id: "cell-division",
    title: "细胞分裂演示台",
    node: "7s-3-1",
    desc: "动物、植物细胞并排演示“一分为二”：遗传物质先复制加倍再平均分配，画风对齐教材图3-1；可关掉解说，让学生先独立观察思考。",
    url: "cell-division/index.html",
    cover: "assets/covers/cell-division.jpg",
    type: "动画演示",
    status: "online",
    featured: true
  },
  {
    id: "microbe-museum",
    title: "微生物探究馆",
    node: "8s-12-1",
    desc: "把 24 种常见微生物拖进正确的家：区分细菌、真菌、病毒三大类，识破“名字陷阱”（乳酸菌、酵母菌、噬菌体），再用配对挑战巩固“病毒无细胞结构、细菌原核、真菌真核”。",
    url: "microbe-museum/index.html",
    cover: "assets/covers/microbe-museum.jpg",
    type: "互动游戏",
    status: "online",
    featured: true
  },
  {
    id: "bio-judge",
    title: "判断生物与非生物",
    node: "7s-1-1",
    desc: "拖动 18 张图进入“生物/非生物”两区，识破生石花是植物、珊瑚礁无生命、病毒按教材口径算生物等易错点，全部判对即可进入逐项讲评。",
    url: "bio-judge/index.html",
    cover: "assets/covers/bio-judge.jpg",
    type: "互动游戏",
    status: "online",
    featured: true
  },
  {
    id: "microscope-lab",
    title: "显微镜3D操作台",
    node: "7s-2-1",
    desc: "双目电光源显微镜 3D 模拟：先点击部件认识 20 个结构，再进入实验完成对光、装片、调焦全流程；虹膜光圈叶片开合、光路明暗随操作实时联动，可换物镜目镜观察人血涂片等 6 种标本。",
    url: "microscope-lab/index.html",
    cover: "assets/covers/microscope-lab.jpg",
    type: "虚拟实验",
    status: "online",
    featured: true
  },
  {
    id: "photosynthesis-hybrid-3d-lab-scene",
    title: "绿叶在光下合成淀粉实验",
    node: "7s-4-1",
    desc: "在3D实验台中完成暗处理、叶片遮光、光照、隔水加热脱色、漂洗与滴加\u7898液，观察叶片显色现象并验证光合作用产生淀粉。",
    url: "photosynthesis-hybrid-3d-lab-scene/index.html",
    cover: "assets/covers/photosynthesis-hybrid-3d-lab-scene.png",
    type: "虚拟实验",
    status: "online",
    featured: true
  },
  {
    id: "chlorophyll-lab",
    title: "验证植物进行光合作用需要叶绿素",
    node: "7s-4-1",
    desc: "以银边天竺葵完成暗处理、光照、水浴脱色、漂洗和碘液染色，对比叶片原绿色与银白色区域的显色结果。支持离线打开。",
    url: "chlorophyll-lab/index.html",
    cover: "assets/covers/chlorophyll-lab-scene.png",
    type: "虚拟实验",
    status: "online",
    featured: true
  },
  {
    id: "photosynthesis-co2-lab",
    title: "验证光合作用需要二氧化碳",
    node: "7s-4-1",
    desc: "设置清水对照组和25%氢氧化钠实验组，同步完成暗处理、密封、光照、叶片脱色与碘液染色，观察两组显色差异并验证光合作用需要二氧化碳。支持离线打开。",
    url: "photosynthesis-co2-lab/index.html",
    cover: "assets/covers/photosynthesis-co2-lab.png",
    type: "虚拟实验",
    status: "online",
    featured: true
  },
  {
    id: "leaf-structure-builder",
    title: "叶片结构模型搭建",
    node: "7s-4-1",
    desc: "自主设置上下表皮、气孔、叶脉及叶肉细胞参数，逐层搭建叶片三维结构，并观察气孔气体交换和叶脉运输。支持离线打开。",
    url: "叶片结构模型搭建/index.html",
    cover: "assets/covers/leaf-structure-builder.png",
    type: "3D 模型",
    status: "online",
    featured: true
  },
  {
    id: "cell-explore",
    title: "细胞结构探险",
    node: "7s-2-1",
    desc: "把细胞“拆开”:点击细胞膜、细胞核、线粒体、叶绿体等结构,逐一认识它们的形态与功能。",
    type: "3D 模型",
    status: "soon"
  },
  {
    id: "seed-lab",
    title: "种子萌发实验台",
    node: "7s-5-1",
    desc: "控制水分、温度、空气等变量,观察菜豆种子能否萌发,亲手验证种子萌发所需的条件。",
    type: "虚拟实验",
    status: "soon"
  },
  {
    id: "eye-3d",
    title: "3D 眼球模型",
    node: "7x-10-2",
    desc: "可旋转、可剖面的眼球模型:点击角膜、晶状体、视网膜等结构查看对应知识点,联动跨学科实践“制作可调节的成像模型模拟眼球成像”。",
    type: "3D 模型",
    status: "soon"
  },
  {
    id: "blood-loop",
    title: "血液循环之旅",
    node: "7x-7-2",
    desc: "化身一枚红细胞,沿体循环与肺循环完整跑一圈,途中辨认心脏四腔与动脉、静脉、毛细血管。",
    type: "互动游戏",
    status: "soon"
  },
  {
    id: "gene-dice",
    title: "遗传规律模拟器",
    node: "8s-16-3",
    desc: "用显隐性性状卡片模拟亲本生殖与结合,快速“生出”成百上千个后代,亲眼见证 3:1 的分离比。",
    type: "课堂游戏",
    status: "soon"
  },
  {
    id: "eco-bottle",
    title: "生态瓶模拟器",
    node: "8x-20-4",
    desc: "调节水草、小鱼、微生物的种类与数量,观察封闭生态系统稳定性的建立、打破与恢复。",
    type: "虚拟实验",
    status: "soon"
  }
];

/*
 * 教材目录树(北师大版义务教育教科书·生物学,2024 年新课标修订版,共四册)
 * 结构:册(SITE_BOOKS) → units 单元 → chapters 章 → sections 节
 * 章的 id 即节点 id;小节 id 在运行时按"章 id-序号"生成,如 7s-1-1。
 */
window.SITE_BOOKS = [
  {
    id: "7s", label: "七年级上册", short: "七上", stage: "初中",
    units: [
      { label: "开篇", chapters: [
        { id: "7s-0", label: "走进生命世界", sections: [] }
      ]},
      { label: "第1单元 探索生命奥秘", chapters: [
        { id: "7s-1", label: "第1章 认识生物和生物学", sections: ["形形色色的生物", "生物学是探索生命的科学", "生物学研究的基本方法"] }
      ]},
      { label: "第2单元 生物体的结构", chapters: [
        { id: "7s-2", label: "第2章 细胞", sections: ["细胞的基本结构和功能", "细胞是生命活动的单位"] },
        { id: "7s-3", label: "第3章 生物体的结构层次", sections: ["细胞通过分裂而增殖", "细胞分化形成组织", "生物体的器官、系统"] }
      ]},
      { label: "第3单元 植物的生活", chapters: [
        { id: "7s-4", label: "第4章 绿色开花植物的生活方式", sections: ["光合作用", "呼吸作用", "吸收作用", "运输作用", "蒸腾作用", "植物在生物圈中的作用"] },
        { id: "7s-5", label: "第5章 绿色开花植物的生活史", sections: ["种子萌发形成幼苗", "营养器官的生长", "生殖器官的生长"] }
      ]},
      { label: "跨学科实践活动", chapters: [
        { id: "7s-p1", label: "活动一 栽培番茄,观察并描绘其一生的变化", sections: [] },
        { id: "7s-p2", label: "活动二 无土栽培一种植物", sections: [] }
      ]}
    ]
  },
  {
    id: "7x", label: "七年级下册", short: "七下", stage: "初中",
    units: [
      { label: "第4单元 人体的结构与生理", chapters: [
        { id: "7x-6", label: "第6章 人体的营养", sections: ["人类的食物", "食物的消化和营养物质的吸收", "合理膳食与食品安全"] },
        { id: "7x-7", label: "第7章 人体的物质运输", sections: ["血液", "血液循环"] },
        { id: "7x-8", label: "第8章 人体的能量供应", sections: ["食物中能量的释放", "人体细胞获得氧气的过程"] },
        { id: "7x-9", label: "第9章 人体代谢废物的排出", sections: ["人体产生的代谢废物", "尿的形成与排出", "皮肤与汗液分泌"] },
        { id: "7x-10", label: "第10章 人体的自我调节", sections: ["神经系统与神经调节", "感受器和感觉器官", "激素调节"] },
        { id: "7x-11", label: "第11章 人体的运动", sections: ["人体的骨骼", "人体的骨骼肌", "运动的形成"] }
      ]},
      { label: "跨学科实践活动", chapters: [
        { id: "7x-p1", label: "活动一 自制实验装置,认识吸烟有害健康", sections: [] },
        { id: "7x-p2", label: "活动二 制作可调节的成像模型模拟眼球成像", sections: [] }
      ]}
    ]
  },
  {
    id: "8s", label: "八年级上册", short: "八上", stage: "初中",
    units: [
      { label: "第5单元 健康地生活", chapters: [
        { id: "8s-12", label: "第12章 微生物与人的生活", sections: ["微生物的特点和主要类型", "微生物与人类的关系"] },
        { id: "8s-13", label: "第13章 传染病及其预防", sections: ["预防传染病", "人体免疫"] },
        { id: "8s-14", label: "第14章 健康的生活方式", sections: ["健康及其条件", "当代主要疾病和预防"] }
      ]},
      { label: "第6单元 生命的延续", chapters: [
        { id: "8s-15", label: "第15章 生物的生殖和发育", sections: ["人的生殖和发育", "动物的生殖和发育", "植物的生殖方式"] },
        { id: "8s-16", label: "第16章 生物的遗传和变异", sections: ["遗传和变异现象", "性状遗传的物质基础", "性状遗传有一定的规律性", "性别和性别决定", "遗传与转基因技术", "遗传病与人类健康"] }
      ]},
      { label: "跨学科实践活动", chapters: [
        { id: "8s-p1", label: "活动一 制作泡菜并检测亚硝酸盐含量的变化", sections: [] },
        { id: "8s-p2", label: "活动二 自制人工孵化箱孵化鸡卵", sections: [] }
      ]}
    ]
  },
  {
    id: "8x", label: "八年级下册", short: "八下", stage: "初中",
    units: [
      { label: "第7单元 生命的进化与生物的多样性", chapters: [
        { id: "8x-17", label: "第17章 生命的发生和发展", sections: ["生命的起源", "生物的进化", "人类的起源与进化"] },
        { id: "8x-18", label: "第18章 生物的多样性", sections: ["生物的分类", "原生生物的主要类群", "植物的主要类群", "动物的主要类群"] },
        { id: "8x-19", label: "第19章 动植物资源保护", sections: ["我国的动物资源及保护", "我国的植物资源及保护", "我国的绿色生态工程"] }
      ]},
      { label: "第8单元 生物与环境", chapters: [
        { id: "8x-20", label: "第20章 生态系统及其稳定性", sections: ["生物的生存依赖一定的环境", "生态系统的组成", "生态系统的结构和功能", "生态系统的稳定性"] },
        { id: "8x-21", label: "第21章 人与环境", sections: ["人居环境与健康", "人类活动对生物圈的影响"] }
      ]},
      { label: "跨学科实践活动", chapters: [
        { id: "8x-p1", label: "活动一 制作水族箱,饲养热带鱼", sections: [] },
        { id: "8x-p2", label: "活动二 设计并制作生态瓶,观察其稳定性", sections: [] }
      ]}
    ]
  }
];
