import axios from 'axios';
import { OpenAI } from 'openai';

interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    date?: string;
}

interface ResearchStep {
    query: string;
    results: SearchResult[];
    synthesis: string;
}

class WebResearchAgent {
    private openai: OpenAI;
    private searchApiKey: string;
    private searchApiHost: string;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        const searchApiKey = process.env.RAPIDAPI_KEY;

        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }

        if (!searchApiKey) {
            throw new Error('RAPIDAPI_KEY environment variable is not set');
        }

        this.openai = new OpenAI({
            apiKey: apiKey
        });
        this.searchApiKey = searchApiKey;
        this.searchApiHost = 'affordable-google-search-api.p.rapidapi.com';
    }

    private async searchWeb(query: string): Promise<SearchResult[]> {
        try {
            const response = await axios.post(
                'https://affordable-google-search-api.p.rapidapi.com/api/google/search',
                {
                    query,
                    country: 'us',
                    lang: 'en',
                    dateRange: 'lastYear'
                },
                {
                    headers: {
                        'x-rapidapi-key': this.searchApiKey,
                        'x-rapidapi-host': this.searchApiHost,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return response.data.serp.map((result: any) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
                date: result.date
            }));
        } catch (error) {
            console.error('Search API error:', error);
            return [];
        }
    }

    private async synthesizeResults(
        topic: string,
        results: SearchResult[],
        previousFindings: string
    ): Promise<string> {
        const prompt = `
            Topic: ${topic}
            Previous findings: ${previousFindings}
            
            New search results:
            ${results.map(r => `
                Title: ${r.title}
                Snippet: ${r.snippet}
                Date: ${r.date || 'N/A'}
                ---
            `).join('\n')}
            
            Please analyze these search results and:
            1. Extract key information relevant to the topic
            2. Identify any gaps that need further research
            3. Suggest follow-up questions or areas to explore
            4. Synthesize the findings with previous research
            
            Provide your analysis in a detailed but concise format.
        `;

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a research assistant helping to gather and analyze information from web searches." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        });

        return completion.choices[0].message.content || '';
    }

    private async generateFollowUpQueries(
        topic: string,
        currentFindings: string
    ): Promise<string[]> {
        const prompt = `
            Based on our research about "${topic}" and our current findings:
            ${currentFindings}
            
            Generate 3 specific follow-up search queries that would help:
            1. Fill gaps in our current knowledge
            2. Verify important claims
            3. Explore related aspects we haven't covered
            
            Format each query as a specific search term or phrase.
        `;

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a research assistant helping to generate effective follow-up search queries." },
                { role: "user", content: prompt }
            ],
            temperature: 0.8
        });

        const queries = completion.choices[0].message.content?.split('\n')
            .filter(q => q.trim().length > 0)
            .slice(0, 3) || [];

        return queries;
    }

    public async researchTopic(topic: string, maxSteps: number = 3): Promise<ResearchStep[]> {
        const steps: ResearchStep[] = [];
        let currentQuery = topic;
        let allFindings = '';

        for (let i = 0; i < maxSteps; i++) {
            console.log(`Research step ${i + 1}: ${currentQuery}`);

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

        return steps;
    }

    public async generateResearchPaper(steps: ResearchStep[]): Promise<string> {
        const researchSummary = steps.map(step => `
            Query: ${step.query}
            Findings: ${step.synthesis}
        `).join('\n\n');

        const prompt = `
            Based on the following research:
            ${researchSummary}
            
            Generate a well-structured research paper that:
            1. Introduces the topic and its significance
            2. Presents the main findings and supporting evidence
            3. Discusses implications and connections between different aspects
            4. Identifies limitations and areas for future research
            5. Concludes with key takeaways
            
            Format the paper with appropriate sections and citations to the search results.
        `;

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a research paper writer synthesizing findings from web research." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        });

        return completion.choices[0].message.content || '';
    }
}

export { WebResearchAgent, ResearchStep, SearchResult };