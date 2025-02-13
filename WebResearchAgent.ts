import axios from 'axios';
import { OpenAI } from 'openai';
import { SearchResult, ResearchStep } from './interfaces';
import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import { 
    reportTypePrompts, 
    SYNTHESIS_PROMPT, 
    FOLLOW_UP_QUERIES_PROMPT,
    REPORT_FORMATTING_REQUIREMENTS,
    RESEARCH_ASSISTANT_SYSTEM_PROMPT,
    RESEARCH_PAPER_WRITER_SYSTEM_PROMPT,
    QUERY_GENERATOR_SYSTEM_PROMPT
} from './prompts';

class WebResearchAgent {
    private openai: OpenAI;
    private searchApiKey: string;
    private searchApiHost: string;
    private firecrawl: FirecrawlApp;
    private model: string;


    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        const searchApiKey = process.env.RAPIDAPI_KEY;
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        const aiModel = process.env.AI_MODEL;

        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }

        if (!searchApiKey) {
            throw new Error('RAPIDAPI_KEY environment variable is not set');
        }
        if (!firecrawlApiKey) {
            throw new Error('FIRECRAWL_API_KEY environment variable is not set');
        }
        this.openai = new OpenAI({
            apiKey: apiKey
        });
        this.searchApiKey = searchApiKey;
        this.searchApiHost = 'affordable-google-search-api.p.rapidapi.com';
        this.firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
        this.model = aiModel || "gpt-4o";

    }

    private async crawlWebContent(urls: string[]): Promise<Map<string, string>> {
        console.log(`🔍 Crawling ${urls.length} URLs for content...`);
        const contentMap = new Map<string, string>();

        for (const url of urls) {
            try {
                console.log(`  Crawling: ${url}`);
                const scrapeResult = await this.firecrawl.scrapeUrl(url, { formats: ['markdown'] }) as ScrapeResponse;
                if (!scrapeResult.markdown) {
                    console.error(`  ❌ No content found for ${url}`);
                    continue;
                }
                contentMap.set(url, scrapeResult.markdown);
                console.log(`  ✅ Successfully crawled ${url}`);
            } catch (error) {
                console.error(`  ❌ Error crawling ${url}:`, error);
            }
        }

        return contentMap;
    }

    private async searchWeb(query: string): Promise<SearchResult[]> {
        console.log(`🔎 Searching web for: "${query}"`);
        try {
            const response = await axios.post(
                'https://affordable-google-search-api.p.rapidapi.com/api/google/search',
                {
                    query,
                    country: process.env.SEARCH_COUNTRY || 'us',
                    lang: process.env.SEARCH_LANG || 'en',
                    dateRange: process.env.SEARCH_DATE_RANGE || 'lastYear',
                },
                {
                    headers: {
                        'x-rapidapi-key': this.searchApiKey,
                        'x-rapidapi-host': this.searchApiHost,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            console.log(`✅ Found ${response.data.serp.length} search results`);
            return response.data.serp
                .slice(0, 3) // Take only first 3 results
                .map((result: any) => ({
                    title: result.title,
                    link: result.link,
                    snippet: result.snippet,
                    date: result.date
                }));
        } catch (error) {
            console.error('❌ Search API error:', error);
            return [];
        }
    }

    private async synthesizeResults(
        topic: string,
        results: SearchResult[],
        previousFindings: string
    ): Promise<string> {
        console.log(`🤔 Synthesizing ${results.length} search results...`);

        // Crawl content from search result URLs
        const urls = results.map(r => r.link);
        const pageContents = await this.crawlWebContent(urls);

        console.log('💭 Analyzing content with AI...');
        const prompt = `
            Topic: ${topic}
            Previous findings: ${previousFindings}
            
            New search results:
            ${results.map(r => `
                Content: ${pageContents.get(r.link) || 'Content unavailable'}
                ---
            `).join('\n')}
            
            ${SYNTHESIS_PROMPT}
        `;
        const completion = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                { role: "system", content: RESEARCH_ASSISTANT_SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            temperature: 0
        });

        console.log('✅ Synthesis complete');
        return completion.choices[0].message.content || '';
    }

    private async generateFollowUpQueries(
        topic: string,
        currentFindings: string
    ): Promise<string[]> {
        console.log('🔄 Generating follow-up queries...');
        const prompt = `
            Based on our research about "${topic}" and our current findings:
            ${currentFindings}
            
            ${FOLLOW_UP_QUERIES_PROMPT}
        `;

        const completion = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                { role: "system", content: QUERY_GENERATOR_SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            function_call: { name: "get_search_queries" },
            functions: [
                {
                    name: "get_search_queries",
                    description: "Get three follow-up search queries",
                    parameters: {
                        type: "object",
                        properties: {
                            queries: {
                                type: "array",
                                items: {
                                    type: "string",
                                    description: "A search query containing only alphanumeric characters, spaces, and basic punctuation"
                                },
                                minItems: 3,
                                maxItems: 3
                            }
                        },
                        required: ["queries"]
                    }
                }
            ],
            temperature: 0
        });

        const responseContent = completion.choices[0].message.function_call?.arguments;
        if (!responseContent) {
            console.warn('⚠️ No queries generated, using fallback');
            return [`${topic} latest research`];
        }

        try {
            const { queries } = JSON.parse(responseContent) as { queries: string[] };
            console.log(`✅ Generated ${queries.length} follow-up queries`);
            // Sanitize queries to ensure they're search-safe
            return queries.map((query: string) => query.replace(/[^\w\s.,?-]/g, '').trim());
        } catch (error) {
            console.error('❌ Error parsing queries:', error);
            return [`${topic} latest research`];
        }
    }

    public async researchTopic(topic: string, maxSteps: number = 3): Promise<ResearchStep[]> {
        console.log(`\n🚀 Starting research on: "${topic}" (${maxSteps} steps)`);
        const steps: ResearchStep[] = [];
        let currentQuery = topic;
        let allFindings = '';

        for (let i = 0; i < maxSteps; i++) {
            console.log(`\n📚 Research Step ${i + 1}/${maxSteps}`);
            console.log(`Current query: "${currentQuery}"`);

            // Perform search
            const results = await this.searchWeb(currentQuery);

            // Synthesize findings
            const synthesis = await this.synthesizeResults(topic, results, allFindings);
            allFindings += '\n' + synthesis;

            // Store this research step
            steps.push({
                query: currentQuery,
                results,
                synthesis
            });

            // Generate follow-up queries
            if (i < maxSteps - 1) {
                const followUpQueries = await this.generateFollowUpQueries(topic, allFindings);
                currentQuery = followUpQueries[0]; // Use the first suggested query
            }
        }

        console.log('\n✅ Research complete!');
        return steps;
    }

    public async generateReport(steps: ResearchStep[], reportType: string = 'comprehensive'): Promise<string> {
        console.log('\n📝 Generating report...');

        // Create a list of all unique sources
        const sources = new Set<string>();
        steps.forEach(step => {
            step.results.forEach(result => {
                sources.add(result.link);
            });
        });

        const researchSummary = steps.map(step => `
            Query: ${step.query}
            Sources: ${step.results.map(r => r.link).join(', ')}
            Findings: ${step.synthesis}
        `).join('\n\n');

        const prompt = `
            Based on the following research:
            ${researchSummary}
            
            ${reportTypePrompts[reportType] || reportTypePrompts['comprehensive']}
            
            ${REPORT_FORMATTING_REQUIREMENTS}
            
            Additional requirements:
            - When presenting numerical data, trends, or relationships, use Mermaid charts
            - Convert any tables with trends or relationships into visual charts
            - Each chart must have a clear title and description
            
            Available sources:
            ${Array.from(sources).map((url, index) => `[${index + 1}] ${url}`).join('\n')}
        `;

        const completion = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: RESEARCH_PAPER_WRITER_SYSTEM_PROMPT
                },
                { role: "user", content: prompt }
            ],
            temperature: 0
        });

        const paper = completion.choices[0].message.content || '';
        return paper;

    }
}

export { WebResearchAgent, ResearchStep, SearchResult };