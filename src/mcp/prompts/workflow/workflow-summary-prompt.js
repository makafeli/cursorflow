/**
 * Workflow Summary Prompt
 * 
 * This prompt is used to summarize the results of a workflow execution,
 * providing a comprehensive overview of what was accomplished, key decisions,
 * and any follow-up actions needed.
 */

module.exports = {
  id: 'workflowSummaryPrompt',
  name: 'Workflow Summary Prompt',
  description: 'Prompt template for summarizing workflow results',
  template: `
You are tasked with summarizing the results of a completed workflow.

# Workflow Information
Name: {{workflowName}}
ID: {{workflowId}}
Started: {{startTimestamp}}
Completed: {{endTimestamp}}
Status: {{status}}

# Workflow Description
{{workflowDescription}}

# Execution Summary
{{executionSummary}}

# Key Steps Completed
{{#each completedSteps}}
## {{this.name}}
- Time: {{this.timestamp}}
- Description: {{this.description}}
- Outcome: {{this.outcome}}
{{/each}}

# Key Decisions Made
{{#each decisions}}
## Decision Point: {{this.name}}
- Options: {{this.options}}
- Selected: {{this.selected}}
- Reasoning: {{this.reasoning}}
{{/each}}

# Workflow Outputs
{{#each outputs}}
- {{this.name}}: {{this.value}}
{{/each}}

# Issues Encountered
{{issues}}

Please provide a comprehensive but concise summary of this workflow execution. Your summary should:

1. Highlight the overall purpose and outcome of the workflow
2. Summarize the key steps that were completed and their results
3. Explain important decisions that were made and their rationale
4. Identify any significant outputs or artifacts produced
5. Note any issues encountered and how they were addressed
6. Suggest any follow-up actions or next steps

The summary should be professional and factual, focusing on the most relevant information.

SUMMARY:
`,
  /**
   * Generate the prompt with the provided parameters
   * @param {Object} params - Parameters for the prompt
   * @returns {string} - The generated prompt
   */
  generate: function(params) {
    let prompt = this.template;
    
    // Replace workflow information
    prompt = prompt.replace('{{workflowName}}', params.workflowName || 'Unnamed Workflow');
    prompt = prompt.replace('{{workflowId}}', params.workflowId || 'Unknown');
    prompt = prompt.replace('{{startTimestamp}}', params.startTimestamp || 'Unknown');
    prompt = prompt.replace('{{endTimestamp}}', params.endTimestamp || 'Unknown');
    prompt = prompt.replace('{{status}}', params.status || 'Unknown');
    
    // Replace workflow description
    prompt = prompt.replace('{{workflowDescription}}', params.workflowDescription || 'No description provided.');
    
    // Replace execution summary
    prompt = prompt.replace('{{executionSummary}}', params.executionSummary || 'No execution summary available.');
    
    // Replace completed steps
    let stepsText = '';
    if (params.completedSteps && Array.isArray(params.completedSteps) && params.completedSteps.length > 0) {
      params.completedSteps.forEach(step => {
        stepsText += `## ${step.name || 'Unnamed Step'}\n`;
        stepsText += `- Time: ${step.timestamp || 'Unknown'}\n`;
        stepsText += `- Description: ${step.description || 'No description'}\n`;
        stepsText += `- Outcome: ${step.outcome || 'Unknown outcome'}\n\n`;
      });
    } else {
      stepsText = 'No completed steps available.';
    }
    prompt = prompt.replace('{{#each completedSteps}}\n## {{this.name}}\n- Time: {{this.timestamp}}\n- Description: {{this.description}}\n- Outcome: {{this.outcome}}\n{{/each}}', stepsText);
    
    // Replace decisions
    let decisionsText = '';
    if (params.decisions && Array.isArray(params.decisions) && params.decisions.length > 0) {
      params.decisions.forEach(decision => {
        decisionsText += `## Decision Point: ${decision.name || 'Unnamed Decision'}\n`;
        decisionsText += `- Options: ${decision.options || 'No options listed'}\n`;
        decisionsText += `- Selected: ${decision.selected || 'No selection made'}\n`;
        decisionsText += `- Reasoning: ${decision.reasoning || 'No reasoning provided'}\n\n`;
      });
    } else {
      decisionsText = 'No decisions recorded.';
    }
    prompt = prompt.replace('{{#each decisions}}\n## Decision Point: {{this.name}}\n- Options: {{this.options}}\n- Selected: {{this.selected}}\n- Reasoning: {{this.reasoning}}\n{{/each}}', decisionsText);
    
    // Replace outputs
    let outputsText = '';
    if (params.outputs && Array.isArray(params.outputs) && params.outputs.length > 0) {
      params.outputs.forEach(output => {
        outputsText += `- ${output.name || 'Unnamed Output'}: ${output.value || 'No value'}\n`;
      });
    } else {
      outputsText = 'No outputs recorded.';
    }
    prompt = prompt.replace('{{#each outputs}}\n- {{this.name}}: {{this.value}}\n{{/each}}', outputsText);
    
    // Replace issues
    prompt = prompt.replace('{{issues}}', params.issues || 'No issues reported.');
    
    return prompt;
  }
}; 