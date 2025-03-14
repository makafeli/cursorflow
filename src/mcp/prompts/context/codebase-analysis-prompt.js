/**
 * Codebase Analysis Prompt
 * 
 * This prompt is used to guide the analysis of a codebase, identifying patterns,
 * architecture, code quality, and providing insights and recommendations.
 */

module.exports = {
  id: 'codebaseAnalysisPrompt',
  name: 'Codebase Analysis Prompt',
  description: 'Prompt template for analyzing a codebase',
  template: `
You are an expert software architect tasked with analyzing a codebase.
Your goal is to understand the architecture, code quality, patterns, and provide valuable insights and recommendations.

# Project Overview
{{projectOverview}}

# Codebase Structure
{{codebaseStructure}}

# Key Files and Components
{{keyFiles}}

# Dependency Information
{{dependencyInfo}}

# Code Metrics
{{codeMetrics}}

# Architectural Patterns
{{architecturalPatterns}}

# Known Issues
{{knownIssues}}

# Recent Changes
{{recentChanges}}

Based on the provided information, please perform a comprehensive analysis of the codebase with the following structure:

1. **Architecture Overview**
   - High-level architecture diagram or description
   - Key components and their relationships
   - Design patterns identified
   - Architectural strengths and weaknesses

2. **Code Quality Assessment**
   - Overall code quality evaluation
   - Adherence to best practices
   - Consistency in style and patterns
   - Areas for improvement

3. **Technical Debt Analysis**
   - Identified technical debt
   - Potential refactoring opportunities
   - Performance bottlenecks
   - Security concerns

4. **Dependency Analysis**
   - Key dependencies and their usage
   - Dependency management practices
   - Outdated or problematic dependencies
   - Recommendations for dependency optimization

5. **Scalability and Maintainability**
   - Evaluation of codebase scalability
   - Maintainability assessment
   - Documentation quality
   - Testing coverage and quality

6. **Recommendations**
   - Immediate improvement opportunities
   - Long-term architectural recommendations
   - Specific refactoring suggestions
   - Best practices to adopt

Your analysis should be thorough, balanced, and actionable. Focus on providing valuable insights that can help improve the codebase while acknowledging its strengths.

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
    
    // Replace codebase structure
    prompt = prompt.replace('{{codebaseStructure}}', params.codebaseStructure || 'No codebase structure information available.');
    
    // Replace key files
    prompt = prompt.replace('{{keyFiles}}', params.keyFiles || 'No information about key files available.');
    
    // Replace dependency information
    prompt = prompt.replace('{{dependencyInfo}}', params.dependencyInfo || 'No dependency information available.');
    
    // Replace code metrics
    prompt = prompt.replace('{{codeMetrics}}', params.codeMetrics || 'No code metrics available.');
    
    // Replace architectural patterns
    prompt = prompt.replace('{{architecturalPatterns}}', params.architecturalPatterns || 'No information about architectural patterns available.');
    
    // Replace known issues
    prompt = prompt.replace('{{knownIssues}}', params.knownIssues || 'No known issues reported.');
    
    // Replace recent changes
    prompt = prompt.replace('{{recentChanges}}', params.recentChanges || 'No information about recent changes available.');
    
    return prompt;
  }
}; 