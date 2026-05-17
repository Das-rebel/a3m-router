#!/usr/bin/env node
/**
 * NPM Stats Badge Updater
 * 
 * Updates README.md with current NPM download statistics
 * Run: node scripts/update-npm-badges.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'adaptive-memory-multi-model-router';

function fetchNPMStats(period) {
  return new Promise((resolve, reject) => {
    const url = `https://api.npmjs.org/downloads/point/${period}/${PACKAGE_NAME}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function generateBadge(label, value, color) {
  // Use shields.io for dynamic badges
  const encodedLabel = encodeURIComponent(label);
  const encodedValue = encodeURIComponent(value.toString());
  return `https://img.shields.io/badge/${encodedLabel}-${encodedValue}-${color}?logo=npm`;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

async function updateBadges() {
  console.log('📊 Fetching NPM Statistics...\n');
  
  try {
    // Fetch stats
    const [day, week, month] = await Promise.all([
      fetchNPMStats('last-day'),
      fetchNPMStats('last-week'),
      fetchNPMStats('last-month'),
    ]);
    
    console.log('Current Statistics:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Daily:   ${day.downloads.toLocaleString().padStart(6)} downloads`);
    console.log(`  Weekly:  ${week.downloads.toLocaleString().padStart(6)} downloads`);
    console.log(`  Monthly: ${month.downloads.toLocaleString().padStart(6)} downloads`);
    console.log();
    
    // Generate badge URLs
    const badges = {
      daily: generateBadge('downloads/day', formatNumber(day.downloads), 'blue'),
      weekly: generateBadge('downloads/week', formatNumber(week.downloads), 'green'),
      monthly: generateBadge('downloads/month', formatNumber(month.downloads), 'orange'),
      version: `https://img.shields.io/npm/v/${PACKAGE_NAME}?logo=npm`,
      license: `https://img.shields.io/npm/l/${PACKAGE_NAME}?color=blue`,
      tests: `https://img.shields.io/badge/tests-33%20passing-brightgreen`,
    };
    
    // Read README
    const readmePath = path.join(__dirname, '..', 'README.md');
    let readme = fs.readFileSync(readmePath, 'utf8');
    
    // Update badges section
    const badgeSection = `<!-- BADGES_START -->
<p align="center">
  <a href="https://www.npmjs.com/package/${PACKAGE_NAME}">
    <img src="${badges.version}" alt="NPM Version">
  </a>
  <a href="https://www.npmjs.com/package/${PACKAGE_NAME}">
    <img src="${badges.daily}" alt="Daily Downloads">
  </a>
  <a href="https://www.npmjs.com/package/${PACKAGE_NAME}">
    <img src="${badges.weekly}" alt="Weekly Downloads">
  </a>
  <a href="https://www.npmjs.com/package/${PACKAGE_NAME}">
    <img src="${badges.monthly}" alt="Monthly Downloads">
  </a>
  <a href="https://github.com/Das-rebel/${PACKAGE_NAME}/blob/main/LICENSE">
    <img src="${badges.license}" alt="License">
  </a>
  <img src="${badges.tests}" alt="Tests">
</p>
<!-- BADGES_END -->`;
    
    // Replace existing badge section or add at top
    if (readme.includes('<!-- BADGES_START -->')) {
      readme = readme.replace(
        /<!-- BADGES_START -->[\s\S]*?<!-- BADGES_END -->/,
        badgeSection
      );
    } else {
      // Add after title
      readme = readme.replace(
        /^(# .*$)/m,
        `$1\n\n${badgeSection}`
      );
    }
    
    // Update stats section in README
    const statsSection = `<!-- STATS_START -->
## 📊 Download Statistics

| Period | Downloads | Trend |
|--------|-----------|-------|
| Daily | ${day.downloads.toLocaleString()} | 📈 |
| Weekly | ${week.downloads.toLocaleString()} | 📈 |
| Monthly | ${month.downloads.toLocaleString()} | 📈 |

*Last updated: ${new Date().toISOString().split('T')[0]}*
<!-- STATS_END -->`;
    
    if (readme.includes('<!-- STATS_START -->')) {
      readme = readme.replace(
        /<!-- STATS_START -->[\s\S]*?<!-- STATS_END -->/,
        statsSection
      );
    }
    
    // Write updated README
    fs.writeFileSync(readmePath, readme);
    
    console.log('✅ README badges updated successfully!');
    console.log();
    console.log('Generated Badges:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Version: ${badges.version}`);
    console.log(`  Daily:   ${badges.daily}`);
    console.log(`  Weekly:  ${badges.weekly}`);
    console.log(`  Monthly: ${badges.monthly}`);
    console.log();
    
  } catch (error) {
    console.error('❌ Error updating badges:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateBadges();
}

module.exports = { updateBadges, fetchNPMStats };
