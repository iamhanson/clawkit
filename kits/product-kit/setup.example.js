#!/usr/bin/env node
/**
 * Example setup script for product-kit
 *
 * This script demonstrates how to configure agent models and skills
 * after deployment. Copy this to setup.js and customize as needed.
 */

const fs = require('fs');
const path = require('path');

const configDir = process.argv[2];
const context = JSON.parse(process.argv[3]);

console.log(`\nConfiguring ${context.targetName} agents...`);

// Read current openclaw.json
const configPath = path.join(configDir, 'openclaw.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Configure models and skills for each agent
for (const agent of config.agents.list) {
  if (agent.id === `${context.targetName}-pm`) {
    agent.model = 'opus';
    agent.skills = ['planning', 'requirement-analysis'];
    console.log(`  Configured PM: model=opus`);
  } else if (agent.id === `${context.targetName}-dev`) {
    agent.model = 'sonnet';
    agent.skills = ['coding', 'code-review'];
    console.log(`  Configured Dev: model=sonnet`);
  } else if (agent.id === `${context.targetName}-qa`) {
    agent.model = 'haiku';
    agent.skills = ['testing'];
    console.log(`  Configured QA: model=haiku`);
  }
}

// Write back
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

console.log('\nSetup complete\n');
