import { describe, expect, it } from "vitest";
import { SYNONYM_MAP, expandSynonyms } from "./synonyms";

describe("SYNONYM_MAP", () => {
  it("contains all required synonym mappings", () => {
    expect(SYNONYM_MAP["k8s"]).toEqual(["kubernetes"]);
    expect(SYNONYM_MAP["js"]).toEqual(["javascript"]);
    expect(SYNONYM_MAP["ts"]).toEqual(["typescript"]);
    expect(SYNONYM_MAP["py"]).toEqual(["python"]);
    expect(SYNONYM_MAP["rb"]).toEqual(["ruby"]);
    expect(SYNONYM_MAP["ci/cd"]).toEqual([
      "continuous integration",
      "continuous deployment",
    ]);
    expect(SYNONYM_MAP["ci"]).toEqual(["continuous integration"]);
    expect(SYNONYM_MAP["cd"]).toEqual(["continuous deployment"]);
    expect(SYNONYM_MAP["react"]).toEqual(["react.js", "reactjs"]);
    expect(SYNONYM_MAP["vue"]).toEqual(["vue.js", "vuejs"]);
    expect(SYNONYM_MAP["next"]).toEqual(["next.js", "nextjs"]);
    expect(SYNONYM_MAP["node"]).toEqual(["node.js", "nodejs"]);
    expect(SYNONYM_MAP["express"]).toEqual(["express.js", "expressjs"]);
    expect(SYNONYM_MAP["mongo"]).toEqual(["mongodb"]);
    expect(SYNONYM_MAP["postgres"]).toEqual(["postgresql"]);
    expect(SYNONYM_MAP["redis"]).toEqual(["redis cache"]);
    expect(SYNONYM_MAP["aws"]).toEqual(["amazon web services"]);
    expect(SYNONYM_MAP["gcp"]).toEqual(["google cloud platform"]);
    expect(SYNONYM_MAP["azure"]).toEqual(["microsoft azure"]);
    expect(SYNONYM_MAP["ml"]).toEqual(["machine learning"]);
    expect(SYNONYM_MAP["dl"]).toEqual(["deep learning"]);
    expect(SYNONYM_MAP["nlp"]).toEqual(["natural language processing"]);
    expect(SYNONYM_MAP["cv"]).toEqual(["computer vision"]);
    expect(SYNONYM_MAP["oauth"]).toEqual(["oauth2", "open authorization"]);
    expect(SYNONYM_MAP["jwt"]).toEqual(["json web token"]);
    expect(SYNONYM_MAP["api"]).toEqual(["application programming interface"]);
    expect(SYNONYM_MAP["rest"]).toEqual(["representational state transfer"]);
    expect(SYNONYM_MAP["graphql"]).toEqual(["graph query language"]);
    expect(SYNONYM_MAP["sql"]).toEqual(["structured query language"]);
    expect(SYNONYM_MAP["nosql"]).toEqual(["non-relational database"]);
    expect(SYNONYM_MAP["oop"]).toEqual(["object oriented programming"]);
    expect(SYNONYM_MAP["fp"]).toEqual(["functional programming"]);
    expect(SYNONYM_MAP["tdd"]).toEqual(["test driven development"]);
    expect(SYNONYM_MAP["bdd"]).toEqual(["behavior driven development"]);
    expect(SYNONYM_MAP["ddd"]).toEqual(["domain driven design"]);
    expect(SYNONYM_MAP["solid"]).toEqual([
      "single responsibility",
      "open closed",
      "liskov substitution",
      "interface segregation",
      "dependency inversion",
    ]);
    expect(SYNONYM_MAP["acid"]).toEqual([
      "atomicity",
      "consistency",
      "isolation",
      "durability",
    ]);
    expect(SYNONYM_MAP["cap"]).toEqual([
      "cap theorem",
      "consistency availability partition tolerance",
    ]);
    expect(SYNONYM_MAP["dns"]).toEqual(["domain name system"]);
    expect(SYNONYM_MAP["cdn"]).toEqual(["content delivery network"]);
    expect(SYNONYM_MAP["ssl"]).toEqual(["secure sockets layer", "tls"]);
    expect(SYNONYM_MAP["tls"]).toEqual(["transport layer security"]);
    expect(SYNONYM_MAP["http"]).toEqual(["hypertext transfer protocol"]);
    expect(SYNONYM_MAP["grpc"]).toEqual(["google remote procedure call"]);
    expect(SYNONYM_MAP["rpc"]).toEqual(["remote procedure call"]);
    expect(SYNONYM_MAP["lru"]).toEqual(["least recently used"]);
    expect(SYNONYM_MAP["fifo"]).toEqual(["first in first out"]);
    expect(SYNONYM_MAP["lifo"]).toEqual(["last in first out"]);
    expect(SYNONYM_MAP["dfs"]).toEqual(["depth first search"]);
    expect(SYNONYM_MAP["bfs"]).toEqual(["breadth first search"]);
    expect(SYNONYM_MAP["dp"]).toEqual(["dynamic programming"]);
    expect(SYNONYM_MAP["ui"]).toEqual(["user interface"]);
    expect(SYNONYM_MAP["ux"]).toEqual(["user experience"]);
    expect(SYNONYM_MAP["sre"]).toEqual(["site reliability engineering"]);
    expect(SYNONYM_MAP["devops"]).toEqual(["development operations"]);
    expect(SYNONYM_MAP["iac"]).toEqual(["infrastructure as code"]);
    expect(SYNONYM_MAP["tf"]).toEqual(["terraform"]);
    expect(SYNONYM_MAP["ec2"]).toEqual(["elastic compute cloud"]);
    expect(SYNONYM_MAP["s3"]).toEqual(["simple storage service"]);
    expect(SYNONYM_MAP["eks"]).toEqual(["elastic kubernetes service"]);
    expect(SYNONYM_MAP["rds"]).toEqual(["relational database service"]);
    expect(SYNONYM_MAP["sqs"]).toEqual(["simple queue service"]);
    expect(SYNONYM_MAP["sns"]).toEqual(["simple notification service"]);
    expect(SYNONYM_MAP["lambda"]).toEqual(["aws lambda", "serverless function"]);
  });
});

describe("expandSynonyms", () => {
  it("returns the original text when no abbreviations are found", () => {
    expect(expandSynonyms("Explain microservices architecture")).toBe(
      "Explain microservices architecture"
    );
  });

  it("handles empty or whitespace strings", () => {
    expect(expandSynonyms("")).toBe("");
    expect(expandSynonyms("   ")).toBe("   ");
  });

  it("expands a single abbreviation preserving case in original text", () => {
    expect(expandSynonyms("What is K8s?")).toBe("What is K8s? kubernetes");
  });

  it("expands multiple abbreviations without duplication", () => {
    const result = expandSynonyms("Deploy React and Node on AWS with Docker and K8s");
    expect(result).toBe(
      "Deploy React and Node on AWS with Docker and K8s react.js reactjs node.js nodejs amazon web services kubernetes"
    );
  });

  it("expands compound terms like CI/CD", () => {
    expect(expandSynonyms("Set up CI/CD pipeline")).toBe(
      "Set up CI/CD pipeline continuous integration continuous deployment"
    );
  });

  it("handles spaced compound terms like 'ci / cd' and 'ci cd'", () => {
    expect(expandSynonyms("Setup ci / cd pipeline")).toBe(
      "Setup ci / cd pipeline continuous integration continuous deployment"
    );
    expect(expandSynonyms("Setup ci cd pipeline")).toBe(
      "Setup ci cd pipeline continuous integration continuous deployment"
    );
  });

  it("handles complex acronyms like SOLID and ACID", () => {
    expect(expandSynonyms("Explain SOLID and ACID")).toBe(
      "Explain SOLID and ACID single responsibility open closed liskov substitution interface segregation dependency inversion atomicity consistency isolation durability"
    );
  });
});
