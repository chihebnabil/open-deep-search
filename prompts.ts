export const reportTypePrompts: { [key: string]: string } = {
    comprehensive: `
        Generate a comprehensive report that:
        1. Provides an executive summary
        2. Outlines key findings and insights
        3. Presents detailed analysis with supporting evidence
        4. Includes relevant statistics and data
        5. Discusses market/industry implications
        6. Highlights best practices and recommendations
        7. Addresses challenges and limitations
        8. Suggests next steps or areas for further investigation
    `,
    technical: `
        Generate a technical analysis report that:
        1. Focuses on technical specifications and capabilities
        2. Provides detailed architectural or system information
        3. Compares technical approaches and solutions
        4. Analyzes performance metrics and benchmarks
        5. Discusses implementation considerations
        6. Addresses technical challenges and limitations
        7. Includes code examples or technical diagrams where relevant
    `,
    market: `
        Generate a market analysis report that:
        1. Analyzes market trends and dynamics
        2. Examines competitive landscape
        3. Identifies market opportunities and challenges
        4. Provides relevant market statistics
        5. Discusses economic factors and implications
        6. Includes customer/user insights
        7. Offers market forecasts and predictions
    `,
    summary: `
        Generate a concise summary report that:
        1. Highlights the most important findings
        2. Presents key conclusions
        3. Outlines critical insights
        4. Provides essential recommendations
        5. Lists main action items
    `
};

export const RESEARCH_ASSISTANT_SYSTEM_PROMPT = "You are a research assistant helping to gather and analyze information from web searches.";

export const RESEARCH_PAPER_WRITER_SYSTEM_PROMPT = "You are a research paper writer synthesizing findings from web research. Use Markdown formatting and include proper citations.";

export const QUERY_GENERATOR_SYSTEM_PROMPT = "You are a research assistant helping to generate effective follow-up search queries.";

export const SYNTHESIS_PROMPT = `
    Please analyze these search results and their full content to provide:
    1. Key facts and data points
    2. Expert opinions and perspectives
    3. Recent developments or trends
    4. Contrasting viewpoints or contradictions
    5. Industry-specific insights
    6. Statistical information when available
    7. Practical applications or real-world examples
    8. Technical details or specifications
    9. Potential limitations or challenges
    10. Market or domain context
    
    Structure your analysis to:
    - Highlight the most significant and reliable information
    - Note the credibility and relevance of sources
    - Identify any potential biases or limitations in the data
    - Connect new information with previous findings
    - Flag areas that need verification or deeper investigation
    
    Provide your analysis in a detailed but concise format.
`;

export const FOLLOW_UP_QUERIES_PROMPT = `
    Generate 3 specific follow-up search queries that would help:
    1. Fill gaps in our current knowledge
    2. Verify important claims
    3. Explore related aspects we haven't covered
    
    Return ONLY search queries that are clear and contain no special characters.
`;

export const REPORT_FORMATTING_REQUIREMENTS = `
    Formatting requirements:
    - Use Markdown formatting for clear structure
    - Include citations using [1], [2], etc.
    - Add a References section listing all sources
    - Use tables for comparing data where appropriate
    - Use bullet points for lists
    - Include relevant quotes when they add value
    - Break down complex information into digestible sections
`;