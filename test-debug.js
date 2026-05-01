// Load the compiled module
const Helper = require("D:/open_source_project/6.5_utilities/json-escape-helper/out/src/json-helper").default;
const h = new Helper();

console.log("=== Valid JSON ===");
console.log(h.validate('{"name": "Andy", "age": 21}'));

console.log("\n=== Missing closing brace ===");
console.log(h.validate('{"name": "Andy"'));

console.log("\n=== Trailing comma ===");
console.log(h.validate('{"name": "Andy",}'));

console.log("\n=== Unterminated string ===");
console.log(h.validate('{"name": "Andy}'));

console.log("\n=== Multiline with error ===");
const multi = `{
  "name": "Andy",
  "items": [1, 2, 3
}`;
console.log(h.validate(multi));

console.log("\n=== Single-quoted valid ===");
console.log(h.validate("{'name': 'Andy'}"));

console.log("\n=== Single-quoted invalid ===");
console.log(h.validate("{'name': 'Andy',}"));
