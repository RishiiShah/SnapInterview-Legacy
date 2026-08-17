/**
 * Static synonym expansion dictionary and query enhancer for interview question retrieval.
 *
 * Expands common technical abbreviations, acronyms, and aliases found in job descriptions,
 * resume summaries, and candidate queries to ensure dense and sparse retrieval (BM25)
 * catch relevant questions regardless of whether the candidate typed "k8s" or "kubernetes".
 */

export const SYNONYM_MAP: Record<string, string[]> = {
  // Programming Languages & Runtimes
  js: ["javascript"],
  ts: ["typescript"],
  py: ["python"],
  rb: ["ruby"],
  golang: ["go"],
  cpp: ["c++"],
  cs: ["c#", "csharp"],

  // Frontend & UI Frameworks
  react: ["react.js", "reactjs"],
  "react.js": ["react", "reactjs"],
  reactjs: ["react", "react.js"],
  vue: ["vue.js", "vuejs"],
  "vue.js": ["vue", "vuejs"],
  vuejs: ["vue", "vue.js"],
  next: ["next.js", "nextjs"],
  "next.js": ["next", "nextjs"],
  nextjs: ["next", "next.js"],
  node: ["node.js", "nodejs"],
  "node.js": ["node", "nodejs"],
  nodejs: ["node", "node.js"],
  express: ["express.js", "expressjs"],
  "express.js": ["express", "expressjs"],
  expressjs: ["express", "express.js"],
  ui: ["user interface"],
  ux: ["user experience"],
  dom: ["document object model"],
  css: ["cascading style sheets"],
  html: ["hypertext markup language"],
  pwa: ["progressive web app"],
  spa: ["single page application"],
  ssr: ["server side rendering"],
  ssg: ["static site generation"],
  isr: ["incremental static regeneration"],
  csr: ["client side rendering"],
  wasm: ["webassembly"],
  tailwind: ["tailwindcss"],

  // Databases, Caches & Storage
  sql: ["structured query language"],
  nosql: ["non-relational database"],
  rdbms: ["relational database management system"],
  dbms: ["database management system"],
  db: ["database"],
  mongo: ["mongodb"],
  mongodb: ["mongo", "nosql"],
  postgres: ["postgresql"],
  postgresql: ["postgres"],
  redis: ["redis cache"],
  wal: ["write ahead log"],
  lsm: ["log structured merge tree"],
  mvcc: ["multi version concurrency control"],
  orm: ["object relational mapping"],

  // Cloud Providers & Infrastructure
  aws: ["amazon web services"],
  gcp: ["google cloud platform"],
  azure: ["microsoft azure"],
  k8s: ["kubernetes"],
  kubernetes: ["k8s"],
  ec2: ["elastic compute cloud"],
  s3: ["simple storage service"],
  eks: ["elastic kubernetes service"],
  rds: ["relational database service"],
  sqs: ["simple queue service"],
  sns: ["simple notification service"],
  lambda: ["aws lambda", "serverless function"],
  iac: ["infrastructure as code"],
  tf: ["terraform"],
  terraform: ["tf", "infrastructure as code"],
  vpc: ["virtual private cloud"],
  vpn: ["virtual private network"],
  nat: ["network address translation"],
  iam: ["identity and access management"],
  alb: ["application load balancer"],
  nlb: ["network load balancer"],
  elb: ["elastic load balancing"],
  hpa: ["horizontal pod autoscaler"],
  vpa: ["vertical pod autoscaler"],

  // DevOps, CI/CD & SRE
  ci: ["continuous integration"],
  cd: ["continuous deployment"],
  "ci/cd": ["continuous integration", "continuous deployment"],
  "ci-cd": ["continuous integration", "continuous deployment"],
  "ci cd": ["continuous integration", "continuous deployment"],
  devops: ["development operations"],
  sre: ["site reliability engineering"],
  sla: ["service level agreement"],
  slo: ["service level objective"],
  sli: ["service level indicator"],
  mttr: ["mean time to recovery"],
  mttd: ["mean time to detection"],
  pr: ["pull request"],
  mr: ["merge request"],

  // Networking & Protocols
  api: ["application programming interface"],
  rest: ["representational state transfer"],
  graphql: ["graph query language"],
  grpc: ["google remote procedure call"],
  rpc: ["remote procedure call"],
  http: ["hypertext transfer protocol"],
  dns: ["domain name system"],
  cdn: ["content delivery network"],
  ssl: ["secure sockets layer", "tls"],
  tls: ["transport layer security"],
  tcp: ["transmission control protocol"],
  udp: ["user datagram protocol"],
  ip: ["internet protocol"],
  ws: ["websocket", "web socket"],
  websocket: ["ws", "web socket"],
  ssh: ["secure shell"],
  ftp: ["file transfer protocol"],
  sftp: ["secure file transfer protocol"],
  smtp: ["simple mail transfer protocol"],
  bgp: ["border gateway protocol"],
  dhcp: ["dynamic host configuration protocol"],
  lan: ["local area network"],
  wan: ["wide area network"],

  // Security & Authentication
  oauth: ["oauth2", "open authorization"],
  jwt: ["json web token"],
  rbac: ["role based access control"],
  abac: ["attribute based access control"],
  sso: ["single sign on"],
  mfa: ["multi factor authentication"],
  "2fa": ["two factor authentication"],
  csrf: ["cross site request forgery"],
  xss: ["cross site scripting"],
  cors: ["cross origin resource sharing"],

  // Machine Learning & AI
  ml: ["machine learning"],
  dl: ["deep learning"],
  nlp: ["natural language processing"],
  cv: ["computer vision"],
  llm: ["large language model"],
  rag: ["retrieval augmented generation"],
  gan: ["generative adversarial network"],
  cnn: ["convolutional neural network"],
  rnn: ["recurrent neural network"],
  lstm: ["long short term memory"],
  bert: ["bidirectional encoder representations from transformers"],
  gpt: ["generative pre-trained transformer"],
  rl: ["reinforcement learning"],
  rlhf: ["reinforcement learning from human feedback"],
  svm: ["support vector machine"],
  pca: ["principal component analysis"],
  knn: ["k nearest neighbors"],

  // Software Engineering Paradigms & Architecture
  oop: ["object oriented programming"],
  fp: ["functional programming"],
  tdd: ["test driven development"],
  bdd: ["behavior driven development"],
  ddd: ["domain driven design"],
  solid: [
    "single responsibility",
    "open closed",
    "liskov substitution",
    "interface segregation",
    "dependency inversion",
  ],
  acid: ["atomicity", "consistency", "isolation", "durability"],
  cap: ["cap theorem", "consistency availability partition tolerance"],
  mvc: ["model view controller"],
  mvvm: ["model view viewmodel"],
  crud: ["create read update delete"],
  eda: ["exploratory data analysis", "event driven architecture"],
  cqrs: ["command query responsibility segregation"],
  es: ["event sourcing", "elasticsearch"],
  saga: ["saga pattern", "distributed transaction"],
  "2pc": ["two phase commit"],
  "3pc": ["three phase commit"],
  paxos: ["consensus protocol"],
  raft: ["consensus algorithm"],
  bff: ["backend for frontend"],
  pubsub: ["publish subscribe"],
  "pub/sub": ["publish subscribe"],
  kafka: ["apache kafka", "event streaming"],
  amqp: ["advanced message queuing protocol"],
  mq: ["message queue"],

  // Data Structures & Algorithms
  lru: ["least recently used"],
  fifo: ["first in first out"],
  lifo: ["last in first out"],
  dfs: ["depth first search"],
  bfs: ["breadth first search"],
  dp: ["dynamic programming"],
  bst: ["binary search tree"],
  dag: ["directed acyclic graph"],
  trie: ["prefix tree"],

  // Systems & Data Engineering
  os: ["operating system"],
  cpu: ["central processing unit"],
  gpu: ["graphics processing unit"],
  tpu: ["tensor processing unit"],
  cli: ["command line interface"],
  sdk: ["software development kit"],
  json: ["javascript object notation"],
  yaml: ["yaml"],
  yml: ["yaml"],
  ttl: ["time to live"],
  rps: ["requests per second"],
  qps: ["queries per second"],
  tps: ["transactions per second"],
  etl: ["extract transform load"],
  elt: ["extract load transform"],
  olap: ["online analytical processing"],
  oltp: ["online transaction processing"],
  saas: ["software as a service"],
  paas: ["platform as a service"],
  iaas: ["infrastructure as a service"],
};

/**
 * Expands abbreviations and aliases in the input text with their canonical synonym forms.
 *
 * Splits text into words, checks each word (and compound pairs like "ci/cd" or "ci cd")
 * against {@link SYNONYM_MAP} case-insensitively, and appends any newly discovered
 * synonym expansions to the end of the text while preserving the original input format.
 *
 * @param text - The raw input query, job description excerpt, or resume text.
 * @returns The original text with deduplicated synonym expansions appended.
 */
export function expandSynonyms(text: string): string {
  if (!text || typeof text !== "string" || !text.trim()) {
    return text;
  }

  // Split input into whitespace-delimited tokens
  const rawWords = text.trim().split(/\s+/);
  if (rawWords.length === 0) {
    return text;
  }

  // Clean tokens by stripping outer punctuation while keeping valid technical characters (+, #, /, -)
  const cleanTokens = rawWords.map((word) =>
    word.replace(/^[^\w#+/-]+|[^\w#+/-]+$/g, "").toLowerCase()
  );

  const expansions: string[] = [];
  const seenExpansions = new Set<string>();

  const appendMatch = (key: string): void => {
    const matched = SYNONYM_MAP[key];
    if (!matched) return;
    for (const exp of matched) {
      const normalized = exp.trim().toLowerCase();
      if (normalized && !seenExpansions.has(normalized)) {
        seenExpansions.add(normalized);
        expansions.push(exp.trim());
      }
    }
  };

  for (let i = 0; i < cleanTokens.length; i++) {
    const token = cleanTokens[i];
    if (!token) continue;

    // 1. Direct single-token lookup
    appendMatch(token);

    // 2. Sub-token check for slash or hyphen delimited compounds (e.g. "ci/cd" -> "ci", "cd")
    if (token.includes("/") || token.includes("-")) {
      const parts = token.split(/[/_-]+/).filter(Boolean);
      for (const part of parts) {
        appendMatch(part);
      }
    }

    // 3. Adjacent pair lookups (e.g. "ci cd", "ci/cd", "ci-cd")
    if (i < cleanTokens.length - 1) {
      const nextToken = cleanTokens[i + 1];
      if (nextToken) {
        appendMatch(`${token} ${nextToken}`);
        appendMatch(`${token}/${nextToken}`);
        appendMatch(`${token}-${nextToken}`);
      }
    }

    // 4. Pair lookups where the separator is its own token (e.g. ["ci", "/", "cd"])
    if (
      i < cleanTokens.length - 2 &&
      (cleanTokens[i + 1] === "/" || cleanTokens[i + 1] === "-")
    ) {
      const afterSep = cleanTokens[i + 2];
      if (afterSep) {
        appendMatch(`${token}/${afterSep}`);
        appendMatch(`${token}-${afterSep}`);
      }
    }
  }

  if (expansions.length === 0) {
    return text;
  }

  return `${text} ${expansions.join(" ")}`;
}
