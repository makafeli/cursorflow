/**
 * Workflow Decision Prompt
 * 
 * This prompt is used at decision points in workflows to guide the model
 * in making appropriate decisions based on the current workflow context.
 */

module.exports = {
  id: 'workflowDecisionPrompt',
  name: 'Workflow Decision Prompt',
  description: 'Prompt template for workflow decision points',
  template: `
You are assisting with a workflow that requires a decision at this point.

# Current Workflow Context
{{workflowContext}}

# Decision Required
{{decisionDescription}}

# Available Options
{{#each options}}
- {{this.id}}: {{this.name}} - {{this.description}}
{{/each}}

# Decision Criteria
{{decisionCriteria}}

# Relevant Information
{{relevantInformation}}

# Recent Steps
{{recentSteps}}

Based on the above information, make a decision by selecting one of the available options.
Provide your reasoning by analyzing the context, criteria, and available information.
Consider the implications of your decision for the rest of the workflow.

Your response should include:
1. The selected option ID
2. A detailed explanation of your reasoning
3. Any assumptions or conditions that influenced your decision
4. Potential implications or follow-up actions that should be considered

DECISION: 
`,
  /**
   * Generate the prompt with the provided parameters
   * @param {Object} params - Parameters for the prompt
   * @returns {string} - The generated prompt
   */
  generate: function(params) {
    let prompt = this.template;
    
    // Replace workflow context
    prompt = prompt.replace('{{workflowContext}}', params.workflowContext || 'No workflow context provided.');
    
    // Replace decision description
    prompt = prompt.replace('{{decisionDescription}}', params.decisionDescription || 'No decision description provided.');
    
    // Replace options
    let optionsText = '';
    if (params.options && Array.isArray(params.options) && params.options.length > 0) {
      params.options.forEach(option => {
        optionsText += `- ${option.id}: ${option.name} - ${option.description}\n`;
      });
    } else {
      optionsText = 'No options provided.';
    }
    prompt = prompt.replace('{{#each options}}\n- {{this.id}}: {{this.name}} - {{this.description}}\n{{/each}}', optionsText);
    
    // Replace decision criteria
    prompt = prompt.replace('{{decisionCriteria}}', params.decisionCriteria || 'No decision criteria provided.');
    
    // Replace relevant information
    prompt = prompt.replace('{{relevantInformation}}', params.relevantInformation || 'No additional information provided.');
    
    // Replace recent steps
    prompt = prompt.replace('{{recentSteps}}', params.recentSteps || 'No recent steps available.');
    
    return prompt;
  }
}; 