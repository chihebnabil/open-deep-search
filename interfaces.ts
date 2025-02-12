export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    date?: string;
    content?: string;
}

interface ResearchStep {
    query: string;
    results: SearchResult[];
    synthesis: string;
}

export { SearchResult, ResearchStep };