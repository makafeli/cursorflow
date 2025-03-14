/**
 * Memory Bank Analysis Prompt
 * 
 * This prompt is used to guide the analysis of Memory Bank contents,
 * identifying patterns, relationships, and insights from the stored information.
 */

module.exports = {
  id: 'memoryBankAnalysisPrompt',
  name: 'Memory Bank Analysis Prompt',
  description: 'Prompt template for analyzing Memory Bank contents',
  template: `
You are an expert analyst tasked with analyzing the contents of a CursorFlow Memory Bank.
Your goal is to extract valuable insights, identify patterns, and make recommendations based on the data.

# Memory Bank Overview
{{memoryBankOverview}}

# Components
{{#each components}}
## {{this.name}}
{{this.summary}}
{{/each}}

# Analysis Focus
{{analysisFocus}}

# Analysis Depth
{{analysisDepth}}

# Historical Context
{{historicalContext}}

# Integration Points
{{integrationPoints}}

Based on the provided Memory Bank contents, please perform a comprehensive analysis with the following structure:

1. **Executive Summary**
   - Provide a high-level overview of the most important findings
   - Summarize key insights and patterns
   - Highlight critical areas that require attention

2. **Component Analysis**
   - For each Memory Bank component:
     - Evaluate the quality and completeness of information
     - Identify recurring themes and patterns
     - Note any inconsistencies or gaps

3. **Cross-Component Relationships**
   - Identify relationships between different components
   - Highlight complementary or contradictory information
   - Find potential integration points or dependencies

4. **Historical Trends**
   - Analyze how information has evolved over time
   - Identify patterns of change or development
   - Note any significant shifts in focus or priorities

5. **Gaps and Opportunities**
   - Identify missing information that would enhance understanding
   - Suggest areas where additional detail would be beneficial
   - Recommend potential additions to the Memory Bank

6. **Recommendations**
   - Provide specific actionable recommendations
   - Suggest optimizations for the Memory Bank structure
   - Recommend focus areas for future development

Your analysis should be comprehensive, insightful, and actionable. Focus on extracting meaningful patterns rather than merely summarizing content.

ANALYSIS:
`,
  /**
   * Generate the prompt with the provided parameters
   * @param {Object} params - Parameters for the prompt
   * @returns {string} - The generated prompt
   */
  generate: function(params) {
    let prompt = this.template;
    
    // Replace memory bank overview
    prompt = prompt.replace('{{memoryBankOverview}}', params.memoryBankOverview || 'No overview provided.');
    
    // Replace components
    let componentsText = '';
    if (params.components && Array.isArray(params.components) && params.components.length > 0) {
      params.components.forEach(component => {
        componentsText += `## ${component.name || 'Unnamed Component'}\n`;
        componentsText += `${component.summary || 'No summary available.'}\n\n`;
      });
    } else {
      componentsText = 'No components available for analysis.';
    }
    prompt = prompt.replace('{{#each components}}\n## {{this.name}}\n{{this.summary}}\n{{/each}}', componentsText);
    
    // Replace analysis focus
    prompt = prompt.replace('{{analysisFocus}}', params.analysisFocus || 'General analysis of Memory Bank contents.');
    
    // Replace analysis depth
    prompt = prompt.replace('{{analysisDepth}}', params.analysisDepth || 'Standard depth analysis.');
    
    // Replace historical context
    prompt = prompt.replace('{{historicalContext}}', params.historicalContext || 'No historical context provided.');
    
    // Replace integration points
    prompt = prompt.replace('{{integrationPoints}}', params.integrationPoints || 'No specific integration points identified.');
    
    return prompt;
  }
}; 