import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log("Entire process.env:", process.env);
console.log("DATABASE_URL:", process.env.DATABASE_URL);

import { WebResearchAgent } from "./WebResearchAgent";
// log the environment variables
console.log(process.env.OPENAI_API_KEY);
console.log(process.env.RAPIDAPI_KEY);

async function main() {
    const agent = new WebResearchAgent();
    
    const topic = "Recent advances in quantum computing";
    console.log(`Starting research on: ${topic}`);
    
    // Perform multi-turn research
    const researchSteps = await agent.researchTopic(topic, 3);
    
    // Generate final paper
    const paper = await agent.generateResearchPaper(researchSteps);
    
    console.log("Research Paper:");
    console.log(paper);
}

(async () => {
    await main();
})();