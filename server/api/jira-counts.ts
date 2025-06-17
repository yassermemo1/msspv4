import { Router } from 'express';
import fetch from 'node-fetch';
import https from 'https';

const router = Router();

const JIRA_URL = process.env.JIRA_URL || 'https://sd.sic.sitco.sa';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

// Create HTTPS agent that ignores SSL certificates
const agent = new https.Agent({
  rejectUnauthorized: false
});

interface JiraProjectCount {
  project: string;
  count: number;
  description: string;
  lastUpdated: string;
}

const PROJECTS = [
  {
    key: 'DEP',
    name: 'Development & Planning',
    query: 'project = "DEP"'
  },
  {
    key: 'MD', 
    name: 'Managed Detection & Response',
    query: 'project = "MD"'
  }
];

// GET /api/jira-counts - Get project issue counts
router.get('/', async (req: any, res: any) => {
  try {
    console.log('🎫 Fetching Jira project counts...');
    
    const results: JiraProjectCount[] = await Promise.all(
      PROJECTS.map(async (project) => {
        try {
          const encodedQuery = encodeURIComponent(project.query);
          const url = `${JIRA_URL}/rest/api/2/search?jql=${encodedQuery}&maxResults=0`;
          
          console.log(`🔍 Fetching ${project.key}: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${JIRA_API_TOKEN}`,
              'Accept': 'application/json',
              'User-Agent': 'MSSP-Portal/1.0'
            },
            agent: agent,
            timeout: 10000
          });

          if (!response.ok) {
            console.error(`❌ ${project.key} fetch failed: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          const count = data.total || 0;
          
          console.log(`✅ ${project.key}: ${count} issues`);
          
          return {
            project: project.key,
            count: count,
            description: project.name,
            lastUpdated: new Date().toISOString()
          };
        } catch (error) {
          console.error(`❌ Error fetching ${project.key}:`, error instanceof Error ? error.message : String(error));
          return {
            project: project.key,
            count: 0,
            description: project.name,
            lastUpdated: new Date().toISOString()
          };
        }
      })
    );

    const totalCount = results.reduce((sum, project) => sum + project.count, 0);
    
    console.log(`🎯 Total issues across all projects: ${totalCount}`);
    
    res.json({
      success: true,
      data: results,
      summary: {
        totalProjects: results.length,
        totalIssues: totalCount,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Jira counts API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Jira project counts',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 