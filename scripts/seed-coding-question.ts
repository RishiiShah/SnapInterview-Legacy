import { prisma } from "../src/lib/prisma";

const TWO_SUM = {
  slug: "two-sum",
  text: "Two Sum",
  category: "coding",
  difficulty: "easy",
  estimatedTime: "15 min",
  tags: ["Array", "Hash Table"],
  hint: "Try using a hash map to store values you've seen and their indices.",
  type: "coding",
  description: `Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.

You may assume that each input has exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
  constraints: `2 <= nums.length <= 10^4
-10^9 <= nums[i] <= 10^9
-10^9 <= target <= 10^9`,
  starterCode: {
    javascript: `const lines = input.trim().split("\\n");
const nums = JSON.parse(lines[0]);
const target = Number(lines[1]);

function twoSum(nums, target) {
  // TODO: implement
}

console.log(JSON.stringify(twoSum(nums, target)));`,
    python: `import json

nums = json.loads(input())
target = int(input())

def two_sum(nums, target):
    # TODO: implement
    pass

print(json.dumps(two_sum(nums, target)))`,
    cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // Read nums array and target
    // TODO: implement two sum
    // Print result as [i, j]
    return 0;
}`,
  },
  testCases: [
    { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]", isHidden: false },
    { input: "[3,2,4]\n6", expectedOutput: "[1,2]", isHidden: false },
    { input: "[3,3]\n6", expectedOutput: "[0,1]", isHidden: true },
  ],
  solutionCode: {
    javascript: `const lines = input.trim().split("\\n");
const nums = JSON.parse(lines[0]);
const target = Number(lines[1]);

function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
}

console.log(JSON.stringify(twoSum(nums, target)));`,
    python: `import json

nums = json.loads(input())
target = int(input())

def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i

print(json.dumps(two_sum(nums, target)))`,
    cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
#include <string>
using namespace std;

int main() {
    // simplified for JSCPP subset
    return 0;
}`,
  },
};

async function main() {
  const existing = await prisma.practiceQuestion.findUnique({
    where: { slug: TWO_SUM.slug },
  });

  if (existing) {
    console.log(`Question "${TWO_SUM.slug}" already exists (id: ${existing.id}), skipping.`);
    return;
  }

  const q = await prisma.practiceQuestion.create({ data: TWO_SUM });
  console.log(`Created coding question "${q.slug}" with id ${q.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
