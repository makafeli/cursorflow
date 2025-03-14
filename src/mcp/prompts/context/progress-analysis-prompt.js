/**
 * Progress Analysis Prompt
 * 
 * This prompt is used to guide the analysis of project progress, identifying
 * completed work, current status, blockers, and providing recommendations.
 */

module.exports = {
  id: 'progressAnalysisPrompt',
  name: 'Progress Analysis Prompt',
  description: 'Prompt template for analyzing project progress',
  template: `
You are an expert project manager tasked with analyzing the progress of a software project.
Your goal is to assess completed work, current status, identify blockers, and provide actionable recommendations.

# Project Overview
{{projectOverview}}

# Project Timeline
{{projectTimeline}}

# Milestones
{{milestones}}

# Completed Tasks
{{completedTasks}}

# In-Progress Tasks
{{inProgressTasks}}

# Upcoming Tasks
{{upcomingTasks}}

# Blockers and Issues
{{blockers}}

# Team Velocity
{{teamVelocity}}

Based on the provided information, please perform a comprehensive analysis of the project progress with the following structure:

1. **Progress Summary**
   - Overall project completion percentage
   - Current phase or sprint status
   - Key achievements since last review
   - General health assessment

2. **Milestone Analysis**
   - Status of each milestone (on track, at risk, delayed)
   - Dependencies between milestones
   - Critical path assessment
   - Recommendations for milestone adjustments

3. **Task Completion Analysis**
   - Completed tasks assessment
   - In-progress tasks status
   - Upcoming tasks readiness
   - Task prioritization recommendations

4. **Blocker Assessment**
   - Analysis of current blockers
   - Impact of blockers on timeline
   - Suggested resolutions
   - Preventative measures for similar issues

5. **Velocity and Productivity**
   - Team velocity trends
   - Productivity patterns
   - Resource allocation assessment
   - Efficiency improvement opportunities

6. **Risk Analysis**
   - Identified project risks
   - Potential timeline impacts
   - Mitigation strategies
   - Contingency recommendations

7. **Recommendations**
   - Immediate actions to improve progress
   - Process improvement suggestions
   - Resource allocation recommendations
   - Communication or collaboration enhancements

Your analysis should be data-driven, balanced, and actionable. Focus on providing insights that can help improve project progress while acknowledging achievements.

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
    
    // Replace project timeline
    prompt = prompt.replace('{{projectTimeline}}', params.projectTimeline || 'No project timeline information available.');
    
    // Replace milestones
    prompt = prompt.replace('{{milestones}}', params.milestones || 'No milestone information available.');
    
    // Replace completed tasks
    prompt = prompt.replace('{{completedTasks}}', params.completedTasks || 'No information about completed tasks available.');
    
    // Replace in-progress tasks
    prompt = prompt.replace('{{inProgressTasks}}', params.inProgressTasks || 'No information about in-progress tasks available.');
    
    // Replace upcoming tasks
    prompt = prompt.replace('{{upcomingTasks}}', params.upcomingTasks || 'No information about upcoming tasks available.');
    
    // Replace blockers
    prompt = prompt.replace('{{blockers}}', params.blockers || 'No blockers reported.');
    
    // Replace team velocity
    prompt = prompt.replace('{{teamVelocity}}', params.teamVelocity || 'No team velocity information available.');
    
    return prompt;
  }
}; 