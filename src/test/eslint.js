
import { CLIEngine } from "eslint";
import assert from "assert";

const engine = new CLIEngine({
  envs: ['node', 'mocha'],
  useEslintrc: true,
});

const results = engine.executeOnFiles(['./src/causality.js']).results;

describe('ESLint', function() {
  results.forEach((result) => generateTest(result));
});

function generateTest(result) {
  const { filePath, messages } = result;

  // it(`validates ${filePath}`, function() {
  //   if (messages.length > 0) {
  //     assert.fail(formatMessages(messages));
  //   }
  // });
}

function formatMessages(messages) {
  const errors = messages.map((message) => {
    return `${message.line}:${message.column} ${message.message.slice(0, -1)} - ${message.ruleId}\n`;
  });

  return `\n${errors.join('')}`;
}
