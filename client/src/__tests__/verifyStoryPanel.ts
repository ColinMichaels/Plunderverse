// Quick verification test for StoryProgressionPanel
export async function verifyStoryPanel() {
  console.log('🔍 Verifying Story Progression Panel...');
  
  // Check if GameFacade is available
  const { GameFacade } = await import('../lib/plunderverse/gameFacade');
  const gameFacade = GameFacade.getInstance();
  
  console.log('📊 Testing GameFacade methods:');
  
  try {
    // Test getStoryProgressionState
    const storyState = gameFacade.getStoryProgressionState();
    console.log('✅ Story State:', storyState);
    
    // Test getCurrentAct
    const currentAct = await gameFacade.getCurrentAct();
    console.log('✅ Current Act:', currentAct);
    
    // Test checkRankProgression
    const rankProgress = await gameFacade.checkRankProgression();
    console.log('✅ Rank Progress:', rankProgress);
    
    // Test getAvailableEndings if in Act 4
    if (storyState.currentAct === 4) {
      const endings = await gameFacade.getAvailableEndings();
      console.log('✅ Available Endings:', endings);
    }
    
    console.log('\n📋 Story Panel Data Available:');
    console.log('- Current Act:', storyState.currentAct);
    console.log('- Morality:', storyState.moralityAlignment);
    console.log('- Completed Missions:', storyState.completedMissions);
    console.log('- Next Milestone:', storyState.nextMilestone);
    
    console.log('\n✨ Story Panel should work! Press F5 or click the 📖 Story button to open it.');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing story panel:', error);
    return false;
  }
}

// Register test function
if (typeof window !== 'undefined') {
  (window as any).verifyStoryPanel = verifyStoryPanel;
  console.log('Story panel verification test loaded. Run with: window.verifyStoryPanel()');
}