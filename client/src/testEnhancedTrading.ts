// Test for enhanced trading system with planet-specific economies
import { 
  MARKET_ITEMS,
  generatePlanetMarketConditions,
  calculateFinalPrice,
  getSupplyDemandIndicator,
  recordPurchase,
  recordSale,
  findProfitableRoutes
} from './lib/stores/economy/enhancedMarketData';

export function testEnhancedTrading() {
  console.log('=== Testing Enhanced Trading System ===\n');
  
  // Test 1: Planet Economy Generation
  console.log('1. Testing Planet Economy Generation:');
  const earthMarket = generatePlanetMarketConditions('Earth');
  console.log(`   Earth Economy Type: ${earthMarket.economyType}`);
  console.log(`   Description: ${earthMarket.description}`);
  console.log(`   Available Items: ${earthMarket.available.length}`);
  console.log(`   Special Deals: ${earthMarket.specialDeals.length}`);
  console.log(`   Trade Routes: ${earthMarket.tradeRoutes.length}\n`);
  
  // Test 2: Planet-Specific Pricing
  console.log('2. Testing Planet-Specific Pricing:');
  const testItems = ['electronics_consumer', 'terraform_equipment', 'helium3', 'luxury_goods'];
  
  testItems.forEach(itemId => {
    const item = MARKET_ITEMS.find(i => i.id === itemId);
    if (item) {
      const earthPrice = calculateFinalPrice(item, 'Earth', 'corporations', 1.0, true);
      const marsPrice = calculateFinalPrice(item, 'Mars', 'corporations', 1.0, true);
      const jupiterPrice = calculateFinalPrice(item, 'Jupiter', 'corporations', 1.0, true);
      
      console.log(`   ${item.name}:`);
      console.log(`     Earth: ${earthPrice}c`);
      console.log(`     Mars: ${marsPrice}c`);
      console.log(`     Jupiter: ${jupiterPrice}c`);
      console.log(`     Price variance: ${Math.round((Math.max(earthPrice, marsPrice, jupiterPrice) / Math.min(earthPrice, marsPrice, jupiterPrice) - 1) * 100)}%`);
    }
  });
  console.log('');
  
  // Test 3: Supply/Demand Dynamics
  console.log('3. Testing Supply/Demand Dynamics:');
  const testItemId = 'solar_panels';
  const testItem = MARKET_ITEMS.find(i => i.id === testItemId);
  
  if (testItem) {
    // Initial price at Mercury (where solar panels are exported)
    const initialPrice = calculateFinalPrice(testItem, 'Mercury', 'corporations', 1.0, true);
    console.log(`   Solar Panels at Mercury - Initial Price: ${initialPrice}c`);
    
    // Simulate multiple purchases
    for (let i = 0; i < 5; i++) {
      recordPurchase('Mercury', testItemId, 10, initialPrice);
    }
    
    const afterPurchasePrice = calculateFinalPrice(testItem, 'Mercury', 'corporations', 1.0, true);
    const supplyStatus = getSupplyDemandIndicator('Mercury', testItemId);
    console.log(`   After 5 purchases - New Price: ${afterPurchasePrice}c`);
    console.log(`   Supply Status: ${supplyStatus}`);
    console.log(`   Price increase: ${Math.round((afterPurchasePrice / initialPrice - 1) * 100)}%\n`);
    
    // Simulate sales to restore balance
    for (let i = 0; i < 5; i++) {
      recordSale('Mercury', testItemId, 10, afterPurchasePrice);
    }
  }
  
  // Test 4: Profitable Trade Routes
  console.log('4. Testing Trade Route Recommendations:');
  const routes = findProfitableRoutes('Earth', 10000, 100);
  
  console.log(`   Top 3 Trade Routes from Earth:`);
  routes.slice(0, 3).forEach((route, i) => {
    console.log(`   ${i + 1}. ${route.from} → ${route.to}`);
    console.log(`      Item: ${route.item}`);
    console.log(`      Buy: ${route.buyPrice}c, Sell: ${route.sellPrice}c`);
    console.log(`      Profit: ${route.profit}c (${route.profitMargin}%)`);
    console.log(`      Risk Level: ${route.risk}`);
  });
  console.log('');
  
  // Test 5: Special Locations
  console.log('5. Testing Special Location Economies:');
  const specialLocations = ['Outlaw Station', 'Corporate Station', 'Military Outpost'];
  
  specialLocations.forEach(location => {
    const market = generatePlanetMarketConditions(location);
    const contrabandItem = MARKET_ITEMS.find(i => i.id === 'contra_drugs');
    
    if (contrabandItem && market.available.includes('contra_drugs')) {
      const price = calculateFinalPrice(contrabandItem, location, 'independents', 1.0, true);
      console.log(`   ${location}:`);
      console.log(`     Economy: ${market.economyType}`);
      console.log(`     Contraband Price: ${price}c`);
      console.log(`     Black Market Activity: ${Math.round((market.available.filter(id => id.includes('contra')).length / market.available.length) * 100)}%`);
    }
  });
  console.log('');
  
  // Test 6: Cargo Categories
  console.log('6. Testing Expanded Cargo Categories:');
  const categories = ['fuel', 'food', 'medicine', 'electronics', 'weapons', 'contraband', 'materials', 'equipment', 'luxury', 'research', 'survival'];
  
  categories.forEach(cat => {
    const items = MARKET_ITEMS.filter(i => i.category === cat as any);
    console.log(`   ${cat}: ${items.length} items`);
  });
  
  console.log('\n=== Test Complete ===');
  
  return {
    success: true,
    totalItems: MARKET_ITEMS.length,
    categories: categories.length,
    planetsWithEconomy: Object.keys(earthMarket).length > 0
  };
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEnhancedTrading();
}