import * as dotenv from 'dotenv';
import path from 'path';
import { WebResearchAgent } from "./WebResearchAgent";
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
    const agent = new WebResearchAgent();

    // read the topic from cli
    const topic = process.argv[2];
    if (!topic) {
        console.error('Please provide a search topic to research');
        return;
    }
    console.log(`Starting research on: ${topic}`);

    const MAX_RESEARCH_STEPS = process.env.MAX_RESEARCH_STEPS ? parseInt(process.env.MAX_RESEARCH_STEPS) : 5;
    // Perform multi-turn research
    const researchSteps = await agent.researchTopic(topic, MAX_RESEARCH_STEPS);
    // Generate final paper
    const paper = await agent.generateReport(researchSteps);
    console.log("saving the report to file");
    // save the paper to a file in /reasarch folder
    const dir = './research';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(`${dir}/${topic.replace(/ /g, '_')}.md`, paper);
    console.log("Research:");
    console.log(paper);
}

(async () => {
    await main();
})();