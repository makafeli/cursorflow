/**
 * Context Analysis Prompt
 * 
 * This prompt is used to guide the analysis and summarization of the project context,
 * providing insights about the project's structure, goals, and current state.
 */

module.exports = {
  id: 'contextAnalysisPrompt',
  name: 'Context Analysis Prompt',
  description: 'Prompt template for analyzing and summarizing project context',
  template: `
You are an expert project analyst tasked with analyzing the context of a software project.
Your goal is to understand the project's structure, goals, current state, and provide valuable insights.

# Project Overview
{{projectOverview}}

# Memory Bank Contents
{{memoryBankContents}}

# Repository Information
{{repositoryInfo}}

# File Structure
{{fileStructure}}

# Recent Changes
{{recentChanges}}

# Team Information
{{teamInfo}}

# Current Challenges
{{currentChallenges}}

Based on the provided information, please perform a comprehensive analysis of the project context with the following structure:

1. **Project Summary**
   - Brief description of the project and its goals
   - Key technologies and frameworks used
   - Overall project state and health

2. **Architecture Analysis**
   - High-level architecture overview
   - Component relationships and dependencies
   - Technical design patterns used
   - Areas for architectural improvement

3. **Current Development Focus**
   - Active development areas
   - Current sprint or milestone objectives
   - Outstanding issues or blockers
   - Implementation progress

4. **Technical Debt Assessment**
   - Identified technical debt
   - Code quality metrics
   - Performance concerns
   - Suggested improvements

5. **Project Roadmap Analysis**
   - Upcoming features and milestones
   - Long-term project vision
   - Dependencies and critical path
   - Risks and mitigation strategies

6. **Recommendations**
   - Immediate actionable recommendations
   - Medium-term strategic suggestions
   - Documentation improvements
   - Process optimization opportunities

Your analysis should be insightful, balanced, and actionable. Focus on providing a holistic view of the project context while highlighting the most relevant aspects for current and upcoming development work.

ANALYSIS:
`,
  /**
   * Generate the prompt with the provided parameters
   * @param {Object} params - Parameters for the prompt
   * @returns {string} - The generated prompt
   */
  generate: function(params) {
    let prompt = this.template;
    
    // Replace project overview
    prompt = prompt.replace('{{projectOverview}}', params.projectOverview || 'No project overview provided.');
    
    // Replace memory bank contents
    prompt = prompt.replace('{{memoryBankContents}}', params.memoryBankContents || 'No memory bank contents available.');
    
    // Replace repository information
    prompt = prompt.replace('{{repositoryInfo}}', params.repositoryInfo || 'No repository information available.');
    
    // Replace file structure
    prompt = prompt.replace('{{fileStructure}}', params.fileStructure || 'No file structure information available.');
    
    // Replace recent changes
    prompt = prompt.replace('{{recentChanges}}', params.recentChanges || 'No information about recent changes available.');
    
    // Replace team information
    prompt = prompt.replace('{{teamInfo}}', params.teamInfo || 'No team information available.');
    
    // Replace current challenges
    prompt = prompt.replace('{{currentChallenges}}', params.currentChallenges || 'No information about current challenges available.');
    
    return prompt;
  }
}; 