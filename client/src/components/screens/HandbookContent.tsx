import { useState, useRef, useEffect } from 'react';
import { 
  Book, Compass, Swords, Coins, Users, Rocket, Shield, Battery, 
  Map, Pickaxe, Hammer, Target, ChevronRight, ChevronDown, Gamepad2,
  Heart, Fuel, Star, Package, AlertTriangle, Zap, Navigation
} from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: any;
  content: JSX.Element;
}

export function HandbookContent() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const lastExpandedSection = useRef<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
        lastExpandedSection.current = null;
      } else {
        newSet.add(sectionId);
        lastExpandedSection.current = sectionId;
      }
      return newSet;
    });
  };

  // Auto-scroll to the expanded section
  useEffect(() => {
    if (lastExpandedSection.current && sectionRefs.current[lastExpandedSection.current]) {
      const section = sectionRefs.current[lastExpandedSection.current];
      setTimeout(() => {
        section?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'nearest' 
        });
      }, 100); // Small delay to allow content to expand first
    }
  }, [expandedSections]);

  const sections: Section[] = [
    {
      id: 'overview',
      title: 'Game Overview & Setting',
      icon: Book,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Welcome to Plunderverse</h4>
          <p className="text-slate-300">
            The year is <span className="text-amber-300 font-bold">2149</span>. Earth went bankrupt after centuries of corporate exploitation 
            and mismanagement. The solar system is now a lawless frontier where survival means breaking the rules. 
            Megacorporations control the inner planets, independent colonies struggle for freedom, 
            and outlaws rule the outer reaches.
          </p>
          <h5 className="text-amber-300">Your Journey</h5>
          <p className="text-slate-300">
            You are a space outlaw, navigating this dangerous universe in your customizable ship. 
            Trade goods, smuggle contraband, mine resources, complete missions, and build your reputation 
            among the three major factions. Every choice matters, and your actions will shape your destiny.
          </p>
          <h5 className="text-amber-300">Three Factions, Three Paths</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-cyan-400">Corporations:</span> The remnants of Earth's megacorps, controlling trade and law enforcement</li>
            <li><span className="text-green-400">Independents:</span> Free colonies and traders seeking autonomy and fair commerce</li>
            <li><span className="text-red-400">Outlaws:</span> Pirates, smugglers, and rebels living outside the law</li>
          </ul>
        </div>
      )
    },
    {
      id: 'controls',
      title: 'Basic Controls',
      icon: Gamepad2,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Desktop Controls</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h5 className="text-amber-300 mb-2">Movement</h5>
              <div className="space-y-1">
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-300">Forward/Back</span>
                  <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">W/S or ↑/↓</kbd>
                </div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-300">Strafe Left/Right</span>
                  <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">A/D or ←/→</kbd>
                </div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-300">Ascend/Descend</span>
                  <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">Q/E</kbd>
                </div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-300">Boost</span>
                  <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">Shift</kbd>
                </div>
              </div>
            </div>
            <div>
              <h5 className="text-amber-300 mb-2">Actions</h5>
              <div className="space-y-1">
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-300">Fire Weapons</span>
                  <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">Space or Click</kbd>
                </div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-300">Land/Dock</span>
                  <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">L</kbd>
                </div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-300">Fast Travel</span>
                  <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">T</kbd>
                </div>
                <div className="flex justify-between bg-slate-800/50 p-2 rounded">
                  <span className="text-slate-300">Mine Resources</span>
                  <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">M</kbd>
                </div>
              </div>
            </div>
          </div>
          
          <h5 className="text-amber-300">UI Panels</h5>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300 block">Missions</span>
              <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">F1</kbd>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300 block">Inventory</span>
              <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">F2</kbd>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300 block">Trading</span>
              <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">F3</kbd>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300 block">Crew</span>
              <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">F4</kbd>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300 block">Story</span>
              <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">F5</kbd>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <span className="text-slate-300 block">Crypto</span>
              <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">F6</kbd>
            </div>
          </div>
          
          <h4 className="text-amber-400 mt-4">Mobile Controls</h4>
          <p className="text-slate-300">
            On mobile devices, the game features touch-optimized controls:
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• <span className="text-amber-300">Virtual Joystick:</span> Drag on left side of screen for movement</li>
            <li>• <span className="text-amber-300">Look Around:</span> Swipe on right side to control camera</li>
            <li>• <span className="text-amber-300">Action Buttons:</span> On-screen buttons for shooting, landing, etc.</li>
            <li>• <span className="text-amber-300">Gyroscope:</span> Tilt your device for intuitive ship control (if available)</li>
            <li>• <span className="text-amber-300">Panel Access:</span> Swipe from edges to open UI panels</li>
          </ul>
        </div>
      )
    },
    {
      id: 'navigation',
      title: 'Navigation & Space Travel',
      icon: Navigation,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Navigating the Solar System</h4>
          <p className="text-slate-300">
            The solar system is vast and dangerous. Efficient navigation is key to survival and profit.
          </p>
          
          <h5 className="text-amber-300">Manual Flight</h5>
          <ul className="text-slate-300 space-y-1">
            <li>• Use WASD/Arrow keys for basic movement</li>
            <li>• Hold Shift for boost (consumes more fuel)</li>
            <li>• Watch your fuel gauge - running out leaves you stranded</li>
            <li>• Avoid asteroid fields and hostile territory</li>
          </ul>
          
          <h5 className="text-amber-300">Autopilot System</h5>
          <ol className="text-slate-300 space-y-2">
            <li><span className="text-amber-300">1.</span> Open the minimap (bottom-left corner)</li>
            <li><span className="text-amber-300">2.</span> Click on your destination planet</li>
            <li><span className="text-amber-300">3.</span> Click "Engage Autopilot"</li>
            <li><span className="text-amber-300">4.</span> Your ship will automatically navigate to the target</li>
          </ol>
          <p className="text-slate-300">
            <span className="text-yellow-400">⚠️ Note:</span> Autopilot consumes fuel based on distance. 
            Always check you have enough fuel for the journey!
          </p>
          
          <h5 className="text-amber-300">Fast Travel (Warp Drive)</h5>
          <p className="text-slate-300">
            Press <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">T</kbd> to open the fast travel menu.
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• Instantly travel to any discovered location</li>
            <li>• Costs credits based on distance</li>
            <li>• Requires minimum reputation with controlling faction</li>
            <li>• Cannot be used when heat level is high</li>
          </ul>
          
          <h5 className="text-amber-300">Landing on Planets</h5>
          <ol className="text-slate-300 space-y-2">
            <li><span className="text-amber-300">1.</span> Approach the planet (get within landing range)</li>
            <li><span className="text-amber-300">2.</span> Slow down your ship</li>
            <li><span className="text-amber-300">3.</span> Press <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">L</kbd> to initiate landing</li>
            <li><span className="text-amber-300">4.</span> Wait for landing sequence to complete</li>
          </ol>
        </div>
      )
    },
    {
      id: 'trading',
      title: 'Trading System & Economy',
      icon: Coins,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Economic System</h4>
          <p className="text-slate-300">
            Each planet has its own economy with supply and demand. Buy low, sell high, and watch for market fluctuations.
          </p>
          
          <h5 className="text-amber-300">Trade Goods Categories</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-blue-400">Raw Materials:</span> Ore, minerals, water - Basic resources with stable prices</li>
            <li><span className="text-green-400">Industrial:</span> Electronics, machinery - Higher profit margins</li>
            <li><span className="text-purple-400">Luxury:</span> Art, entertainment - High risk, high reward</li>
            <li><span className="text-red-400">Contraband:</span> Weapons, illegal substances - Massive profits but increases heat</li>
          </ul>
          
          <h5 className="text-amber-300">Trading Strategy</h5>
          <ol className="text-slate-300 space-y-2">
            <li><span className="text-amber-300">1.</span> Check market prices at different stations</li>
            <li><span className="text-amber-300">2.</span> Note supply/demand indicators</li>
            <li><span className="text-amber-300">3.</span> Plan trade routes between complementary economies</li>
            <li><span className="text-amber-300">4.</span> Factor in fuel costs and travel time</li>
            <li><span className="text-amber-300">5.</span> Consider faction relationships for better prices</li>
          </ol>
          
          <h5 className="text-amber-300">Market Factors</h5>
          <ul className="text-slate-300 space-y-1">
            <li>• <span className="text-green-400">High Demand:</span> Prices increase by 20-50%</li>
            <li>• <span className="text-red-400">Oversupply:</span> Prices decrease by 20-50%</li>
            <li>• <span className="text-yellow-400">Events:</span> Wars, disasters affect prices dramatically</li>
            <li>• <span className="text-cyan-400">Reputation:</span> Better faction standing = better prices</li>
          </ul>
          
          <h5 className="text-amber-300">Cryptocurrency Trading</h5>
          <p className="text-slate-300">
            Access crypto markets by pressing <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">F6</kbd>
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• Mine crypto while extracting resources</li>
            <li>• Trade between different cryptocurrencies</li>
            <li>• Use crypto for anonymous transactions</li>
            <li>• Reduced heat when using crypto for illegal trades</li>
          </ul>
        </div>
      )
    },
    {
      id: 'combat',
      title: 'Combat Mechanics',
      icon: Swords,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Space Combat</h4>
          <p className="text-slate-300">
            Combat is inevitable in the lawless solar system. Master your weapons and tactics to survive.
          </p>
          
          <h5 className="text-amber-300">Weapon Systems</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-red-400">Lasers:</span> Fast, accurate, low damage - Good for fighters</li>
            <li><span className="text-blue-400">Plasma:</span> Slower, high damage - Effective against shields</li>
            <li><span className="text-yellow-400">Missiles:</span> Homing, devastating - Limited ammo</li>
            <li><span className="text-purple-400">Railgun:</span> Extreme range, piercing - Requires charging</li>
          </ul>
          
          <h5 className="text-amber-300">Combat Tips</h5>
          <ol className="text-slate-300 space-y-2">
            <li><span className="text-amber-300">1.</span> Keep moving - stationary ships are easy targets</li>
            <li><span className="text-amber-300">2.</span> Manage your shields - let them recharge between fights</li>
            <li><span className="text-amber-300">3.</span> Target subsystems - engines, weapons, shields</li>
            <li><span className="text-amber-300">4.</span> Use asteroids for cover</li>
            <li><span className="text-amber-300">5.</span> Know when to run - not every fight is winnable</li>
          </ol>
          
          <h5 className="text-amber-300">Enemy Types</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-gray-400">Police:</span> Light weapons, call for backup</li>
            <li><span className="text-orange-400">Pirates:</span> Aggressive, unpredictable</li>
            <li><span className="text-cyan-400">Corporate Security:</span> Heavy shields, advanced weapons</li>
            <li><span className="text-red-400">Bounty Hunters:</span> Relentless, skilled pilots</li>
          </ul>
          
          <h5 className="text-amber-300">Heat & Wanted System</h5>
          <p className="text-slate-300">
            Your actions generate "heat" - attention from law enforcement:
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• <span className="text-green-400">0-25%:</span> Minor infractions, occasional scans</li>
            <li>• <span className="text-yellow-400">26-50%:</span> Active pursuit, increased patrols</li>
            <li>• <span className="text-orange-400">51-75%:</span> Shoot on sight, bounty hunters</li>
            <li>• <span className="text-red-400">76-100%:</span> Maximum threat, elite forces deployed</li>
          </ul>
        </div>
      )
    },
    {
      id: 'missions',
      title: 'Mission System',
      icon: Target,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Mission Types</h4>
          <p className="text-slate-300">
            Missions are your primary source of income and reputation. Choose wisely based on your skills and goals.
          </p>
          
          <h5 className="text-amber-300">Mission Categories</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-blue-400">Delivery:</span> Transport cargo between stations - Low risk, steady pay</li>
            <li><span className="text-green-400">Escort:</span> Protect ships during travel - Combat skills required</li>
            <li><span className="text-orange-400">Bounty:</span> Hunt down criminals - High risk, high reward</li>
            <li><span className="text-purple-400">Smuggling:</span> Move illegal goods - Increases heat significantly</li>
            <li><span className="text-red-400">Assassination:</span> Eliminate targets - Affects faction relations</li>
            <li><span className="text-yellow-400">Mining:</span> Extract specific resources - Time-consuming but safe</li>
            <li><span className="text-cyan-400">Exploration:</span> Discover new locations - Bonus rewards for first discovery</li>
          </ul>
          
          <h5 className="text-amber-300">Mission Difficulty</h5>
          <ul className="text-slate-300 space-y-1">
            <li>• <span className="text-green-400">Easy:</span> Suitable for beginners, low pay</li>
            <li>• <span className="text-yellow-400">Medium:</span> Balanced risk/reward</li>
            <li>• <span className="text-orange-400">Hard:</span> Challenging, requires good equipment</li>
            <li>• <span className="text-red-400">Legendary:</span> Extreme difficulty, massive rewards</li>
          </ul>
          
          <h5 className="text-amber-300">Mission Chains</h5>
          <p className="text-slate-300">
            Some missions lead to story chains with multiple parts:
          </p>
          <ol className="text-slate-300 space-y-1">
            <li><span className="text-amber-300">1.</span> Complete initial mission to unlock chain</li>
            <li><span className="text-amber-300">2.</span> Follow the story through multiple objectives</li>
            <li><span className="text-amber-300">3.</span> Make choices that affect outcomes</li>
            <li><span className="text-amber-300">4.</span> Earn unique rewards and story progression</li>
          </ol>
          
          <h5 className="text-amber-300">Dynamic Events</h5>
          <p className="text-slate-300">
            Random missions appear based on your location and reputation:
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• Distress signals from damaged ships</li>
            <li>• Pirate ambushes with bonus loot</li>
            <li>• Time-limited trade opportunities</li>
            <li>• Faction war participation requests</li>
          </ul>
        </div>
      )
    },
    {
      id: 'crew',
      title: 'Crew Management',
      icon: Users,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Building Your Crew</h4>
          <p className="text-slate-300">
            A skilled crew is essential for success. Each crew member brings unique abilities and bonuses.
          </p>
          
          <h5 className="text-amber-300">Crew Roles</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-blue-400">Pilot:</span> Improves maneuverability and fuel efficiency</li>
            <li><span className="text-green-400">Engineer:</span> Faster repairs, better ship performance</li>
            <li><span className="text-orange-400">Gunner:</span> Increased weapon accuracy and damage</li>
            <li><span className="text-purple-400">Navigator:</span> Reveals hidden locations, faster travel</li>
            <li><span className="text-red-400">Medic:</span> Crew health management, survival bonuses</li>
            <li><span className="text-yellow-400">Trader:</span> Better market prices, finds rare deals</li>
            <li><span className="text-cyan-400">Hacker:</span> Bypasses security, reduces heat gain</li>
          </ul>
          
          <h5 className="text-amber-300">Crew Recruitment</h5>
          <ol className="text-slate-300 space-y-2">
            <li><span className="text-amber-300">1.</span> Visit space stations and settlements</li>
            <li><span className="text-amber-300">2.</span> Check cantinas and recruitment offices</li>
            <li><span className="text-amber-300">3.</span> Review candidate skills and salary requirements</li>
            <li><span className="text-amber-300">4.</span> Hire based on your needs and budget</li>
          </ol>
          
          <h5 className="text-amber-300">Crew Loyalty</h5>
          <p className="text-slate-300">
            Keep your crew happy to maintain their loyalty:
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• Pay salaries on time</li>
            <li>• Share mission bonuses</li>
            <li>• Avoid suicidal missions</li>
            <li>• Upgrade living quarters</li>
            <li>• Complete personal crew quests</li>
          </ul>
          
          <h5 className="text-amber-300">Crew Synergies</h5>
          <p className="text-slate-300">
            Certain crew combinations provide bonus effects:
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• <span className="text-green-400">Tech Team:</span> Engineer + Hacker = System override abilities</li>
            <li>• <span className="text-red-400">Combat Squad:</span> Gunner + Pilot = Evasive combat maneuvers</li>
            <li>• <span className="text-blue-400">Trade Masters:</span> Trader + Navigator = Secret market access</li>
          </ul>
        </div>
      )
    },
    {
      id: 'upgrades',
      title: 'Ship Upgrades & Customization',
      icon: Rocket,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Ship Systems</h4>
          <p className="text-slate-300">
            Your ship is your home and lifeline. Upgrade and customize it to match your playstyle.
          </p>
          
          <h5 className="text-amber-300">Core Systems</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-blue-400">Hull:</span> Ship health and armor rating</li>
            <li><span className="text-green-400">Shields:</span> Energy barriers that regenerate</li>
            <li><span className="text-orange-400">Engine:</span> Speed, maneuverability, fuel efficiency</li>
            <li><span className="text-purple-400">Reactor:</span> Powers all ship systems</li>
            <li><span className="text-red-400">Weapons:</span> Offensive capabilities</li>
            <li><span className="text-yellow-400">Cargo Bay:</span> Storage capacity for goods</li>
            <li><span className="text-cyan-400">Sensors:</span> Detection range and scanning</li>
          </ul>
          
          <h5 className="text-amber-300">Upgrade Tiers</h5>
          <ol className="text-slate-300 space-y-1">
            <li><span className="text-gray-400">Mk I:</span> Basic equipment, affordable</li>
            <li><span className="text-green-400">Mk II:</span> Standard improvements, balanced</li>
            <li><span className="text-blue-400">Mk III:</span> Advanced technology, expensive</li>
            <li><span className="text-purple-400">Mk IV:</span> Military grade, faction restricted</li>
            <li><span className="text-orange-400">Mk V:</span> Experimental tech, rare finds</li>
          </ol>
          
          <h5 className="text-amber-300">Special Equipment</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-yellow-400">Cloaking Device:</span> Temporary invisibility</li>
            <li><span className="text-cyan-400">Jump Drive:</span> Emergency teleportation</li>
            <li><span className="text-red-400">EMP Generator:</span> Disables enemy systems</li>
            <li><span className="text-green-400">Mining Laser:</span> Extract resources efficiently</li>
            <li><span className="text-purple-400">Tractor Beam:</span> Pull in loot and salvage</li>
            <li><span className="text-orange-400">Afterburner:</span> Extreme speed boost</li>
          </ul>
          
          <h5 className="text-amber-300">Customization Options</h5>
          <ul className="text-slate-300 space-y-1">
            <li>• Paint jobs and decals</li>
            <li>• Engine trails and effects</li>
            <li>• Weapon colors and sounds</li>
            <li>• Interior decorations</li>
            <li>• Custom ship names and IDs</li>
          </ul>
        </div>
      )
    },
    {
      id: 'factions',
      title: 'Faction Reputation System',
      icon: Star,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">The Three Factions</h4>
          <p className="text-slate-300">
            Your reputation with each faction determines your opportunities, prices, and treatment throughout the solar system.
          </p>
          
          <h5 className="text-amber-300">Corporations</h5>
          <div className="bg-slate-800/50 p-3 rounded-lg mb-3">
            <p className="text-cyan-400 font-bold">The Corporate Collective</p>
            <p className="text-slate-300 text-sm">
              Remnants of Earth's megacorporations. They control trade routes, enforce laws, and maintain order through force.
            </p>
            <p className="text-slate-300 text-sm mt-2"><span className="text-amber-300">Benefits:</span></p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Access to high-tech equipment</li>
              <li>• Legal trading privileges</li>
              <li>• Protection from pirates</li>
              <li>• Corporate station docking rights</li>
            </ul>
          </div>
          
          <h5 className="text-amber-300">Independents</h5>
          <div className="bg-slate-800/50 p-3 rounded-lg mb-3">
            <p className="text-green-400 font-bold">The Free Colonies</p>
            <p className="text-slate-300 text-sm">
              Self-governing colonies seeking freedom from corporate control. They value fair trade and personal liberty.
            </p>
            <p className="text-slate-300 text-sm mt-2"><span className="text-amber-300">Benefits:</span></p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Balanced prices and opportunities</li>
              <li>• Neutral territory safe havens</li>
              <li>• Unique ship modifications</li>
              <li>• Information broker access</li>
            </ul>
          </div>
          
          <h5 className="text-amber-300">Outlaws</h5>
          <div className="bg-slate-800/50 p-3 rounded-lg mb-3">
            <p className="text-red-400 font-bold">The Pirate Brotherhood</p>
            <p className="text-slate-300 text-sm">
              Pirates, smugglers, and rebels. They live outside the law and thrive in chaos.
            </p>
            <p className="text-slate-300 text-sm mt-2"><span className="text-amber-300">Benefits:</span></p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Black market access</li>
              <li>• Contraband trading</li>
              <li>• Pirate base sanctuary</li>
              <li>• Illegal weapon modifications</li>
            </ul>
          </div>
          
          <h5 className="text-amber-300">Reputation Mechanics</h5>
          <ul className="text-slate-300 space-y-2">
            <li>• <span className="text-green-400">+100 to +50:</span> Allied - Best prices, exclusive missions</li>
            <li>• <span className="text-blue-400">+49 to +10:</span> Friendly - Good relations, standard benefits</li>
            <li>• <span className="text-yellow-400">+9 to -9:</span> Neutral - No special treatment</li>
            <li>• <span className="text-orange-400">-10 to -49:</span> Hostile - Higher prices, denied services</li>
            <li>• <span className="text-red-400">-50 to -100:</span> Enemy - Shot on sight, bounties placed</li>
          </ul>
          
          <h5 className="text-amber-300">Reputation Changes</h5>
          <p className="text-slate-300">
            Your actions affect faction standings:
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• Completing missions for a faction improves reputation</li>
            <li>• Attacking faction ships decreases reputation</li>
            <li>• Trading increases reputation slightly</li>
            <li>• Some actions affect multiple factions differently</li>
          </ul>
        </div>
      )
    },
    {
      id: 'survival',
      title: 'Survival Mechanics',
      icon: Heart,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Essential Resources</h4>
          <p className="text-slate-300">
            Space is hostile. Manage your resources carefully or face death in the void.
          </p>
          
          <h5 className="text-amber-300">Fuel Management</h5>
          <div className="bg-slate-800/50 p-3 rounded-lg mb-3">
            <p className="text-yellow-400 font-bold">⛽ Fuel</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Required for all movement and systems</li>
              <li>• Consumed based on distance and speed</li>
              <li>• Boosting uses 3x normal consumption</li>
              <li>• Running out leaves you stranded</li>
              <li>• Refuel at stations or use fuel pods</li>
            </ul>
            <p className="text-amber-300 text-sm mt-2">Emergency Options:</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Distress beacon (costs credits)</li>
              <li>• Solar panels (slow recharge)</li>
              <li>• Salvage from derelicts</li>
            </ul>
          </div>
          
          <h5 className="text-amber-300">Life Support</h5>
          <div className="bg-slate-800/50 p-3 rounded-lg mb-3">
            <p className="text-cyan-400 font-bold">💨 Oxygen</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Depletes slowly over time</li>
              <li>• Hull breaches increase consumption</li>
              <li>• Can be recycled with proper equipment</li>
              <li>• Emergency tanks provide backup</li>
              <li>• Stations automatically replenish</li>
            </ul>
          </div>
          
          <h5 className="text-amber-300">Hull Integrity</h5>
          <div className="bg-slate-800/50 p-3 rounded-lg mb-3">
            <p className="text-red-400 font-bold">🛡️ Hull & Shields</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Hull damage is permanent until repaired</li>
              <li>• Shields regenerate but drain power</li>
              <li>• Micrometeorites cause gradual damage</li>
              <li>• Critical damage affects ship systems</li>
              <li>• 0% hull = ship destruction</li>
            </ul>
            <p className="text-amber-300 text-sm mt-2">Repair Options:</p>
            <ul className="text-slate-300 text-sm space-y-1">
              <li>• Station repair bays (costs credits)</li>
              <li>• Repair drones (limited uses)</li>
              <li>• Crew engineer (slow but free)</li>
            </ul>
          </div>
          
          <h5 className="text-amber-300">Daily Costs</h5>
          <p className="text-slate-300">
            Running a ship isn't free. Daily expenses include:
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• Crew salaries (varies by skill)</li>
            <li>• Ship maintenance (based on class)</li>
            <li>• Docking fees (location dependent)</li>
            <li>• Life support systems</li>
            <li>• Equipment degradation</li>
          </ul>
        </div>
      )
    },
    {
      id: 'mining',
      title: 'Mining & Resource Gathering',
      icon: Pickaxe,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Resource Extraction</h4>
          <p className="text-slate-300">
            Mining is a reliable way to earn credits and gather materials for crafting and trading.
          </p>
          
          <h5 className="text-amber-300">Mining Process</h5>
          <ol className="text-slate-300 space-y-2">
            <li><span className="text-amber-300">1.</span> Land on a planet or approach an asteroid</li>
            <li><span className="text-amber-300">2.</span> Scan for resource deposits (better sensors = better finds)</li>
            <li><span className="text-amber-300">3.</span> Position your ship near the deposit</li>
            <li><span className="text-amber-300">4.</span> Press <kbd className="text-amber-400 bg-slate-700 px-2 py-1 rounded text-xs">M</kbd> to activate mining laser</li>
            <li><span className="text-amber-300">5.</span> Wait for extraction to complete</li>
            <li><span className="text-amber-300">6.</span> Resources are automatically stored in cargo</li>
          </ol>
          
          <h5 className="text-amber-300">Resource Types</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-gray-400">Common:</span> Iron, Silicon, Carbon - Found everywhere</li>
            <li><span className="text-green-400">Uncommon:</span> Titanium, Gold, Uranium - Specific locations</li>
            <li><span className="text-blue-400">Rare:</span> Platinum, Diamonds - Deep space or dangerous zones</li>
            <li><span className="text-purple-400">Exotic:</span> Antimatter, Dark Matter - Special equipment required</li>
          </ul>
          
          <h5 className="text-amber-300">Planet Resources</h5>
          <ul className="text-slate-300 space-y-1">
            <li>• <span className="text-blue-400">Earth:</span> Balanced resources, heavily guarded</li>
            <li>• <span className="text-red-400">Mars:</span> Rich in iron and minerals</li>
            <li>• <span className="text-yellow-400">Venus:</span> Exotic gases, extreme conditions</li>
            <li>• <span className="text-orange-400">Jupiter Moons:</span> Ice and rare elements</li>
            <li>• <span className="text-cyan-400">Saturn Rings:</span> Water ice and organics</li>
            <li>• <span className="text-gray-400">Asteroid Belt:</span> Pure metals, no atmosphere</li>
          </ul>
          
          <h5 className="text-amber-300">Mining Equipment</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-green-400">Basic Drill:</span> Slow but reliable</li>
            <li><span className="text-blue-400">Laser Cutter:</span> Faster extraction, more power</li>
            <li><span className="text-purple-400">Plasma Bore:</span> Cuts through anything</li>
            <li><span className="text-orange-400">Quantum Extractor:</span> Maximizes yield</li>
          </ul>
          
          <h5 className="text-amber-300">Mining Tips</h5>
          <ul className="text-slate-300 space-y-1">
            <li>• Upgrade scanners to find better deposits</li>
            <li>• Some resources only appear at certain times</li>
            <li>• Mining generates heat - watch for patrols</li>
            <li>• Form mining contracts for guaranteed income</li>
            <li>• Illegal mining in restricted zones pays more</li>
          </ul>
        </div>
      )
    },
    {
      id: 'crafting',
      title: 'Crafting System',
      icon: Hammer,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Manufacturing & Crafting</h4>
          <p className="text-slate-300">
            Transform raw materials into valuable equipment, ammunition, and trade goods.
          </p>
          
          <h5 className="text-amber-300">Crafting Basics</h5>
          <ol className="text-slate-300 space-y-2">
            <li><span className="text-amber-300">1.</span> Gather raw materials through mining or trading</li>
            <li><span className="text-amber-300">2.</span> Access crafting station (ship workshop or station)</li>
            <li><span className="text-amber-300">3.</span> Select blueprint/recipe</li>
            <li><span className="text-amber-300">4.</span> Provide required materials</li>
            <li><span className="text-amber-300">5.</span> Wait for crafting to complete</li>
          </ol>
          
          <h5 className="text-amber-300">Craftable Items</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-blue-400">Ammunition:</span> Missiles, energy cells, railgun slugs</li>
            <li><span className="text-green-400">Ship Parts:</span> Hull plates, shield generators, engine components</li>
            <li><span className="text-purple-400">Equipment:</span> Mining tools, scanners, repair kits</li>
            <li><span className="text-yellow-400">Trade Goods:</span> Electronics, luxury items, processed materials</li>
            <li><span className="text-red-400">Illegal Items:</span> Weapons, drugs, hacking tools (increases heat)</li>
          </ul>
          
          <h5 className="text-amber-300">Blueprint System</h5>
          <p className="text-slate-300">
            Blueprints unlock new crafting recipes:
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• Purchase from traders and faction vendors</li>
            <li>• Find in derelict ships and stations</li>
            <li>• Reward for completing mission chains</li>
            <li>• Reverse-engineer from existing items</li>
            <li>• Trade with other players</li>
          </ul>
          
          <h5 className="text-amber-300">Crafting Stations</h5>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-gray-400">Ship Workshop:</span> Basic items, limited capacity</li>
            <li><span className="text-green-400">Station Factory:</span> Mass production, better efficiency</li>
            <li><span className="text-blue-400">Specialized Facilities:</span> Unique items, faction-specific</li>
            <li><span className="text-purple-400">Black Market Labs:</span> Illegal items, hidden locations</li>
          </ul>
          
          <h5 className="text-amber-300">Quality Levels</h5>
          <p className="text-slate-300">
            Crafted items have quality tiers affecting performance:
          </p>
          <ul className="text-slate-300 space-y-1">
            <li>• <span className="text-gray-400">Poor:</span> 75% effectiveness</li>
            <li>• <span className="text-white">Standard:</span> 100% effectiveness</li>
            <li>• <span className="text-green-400">Superior:</span> 125% effectiveness</li>
            <li>• <span className="text-blue-400">Masterwork:</span> 150% effectiveness</li>
            <li>• <span className="text-purple-400">Legendary:</span> 200% effectiveness + special effects</li>
          </ul>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'Tips for New Players',
      icon: AlertTriangle,
      content: (
        <div className="prose prose-sm prose-invert prose-amber max-w-none">
          <h4 className="text-amber-400">Getting Started</h4>
          
          <h5 className="text-amber-300">Early Game Strategy</h5>
          <ol className="text-slate-300 space-y-2">
            <li><span className="text-amber-300">1.</span> Start with easy delivery missions to build capital</li>
            <li><span className="text-amber-300">2.</span> Stay in safe sectors until you upgrade your ship</li>
            <li><span className="text-amber-300">3.</span> Focus on one faction initially for better rewards</li>
            <li><span className="text-amber-300">4.</span> Upgrade shields and engines before weapons</li>
            <li><span className="text-amber-300">5.</span> Always keep emergency fuel reserves</li>
          </ol>
          
          <h5 className="text-amber-300">Money-Making Tips</h5>
          <ul className="text-slate-300 space-y-2">
            <li>• <span className="text-green-400">Trade Routes:</span> Buy low at production planets, sell high at consumers</li>
            <li>• <span className="text-blue-400">Mission Stacking:</span> Accept multiple missions going same direction</li>
            <li>• <span className="text-yellow-400">Salvaging:</span> Scan for derelicts and abandoned cargo</li>
            <li>• <span className="text-purple-400">Mining Contracts:</span> Steady income with minimal risk</li>
            <li>• <span className="text-orange-400">Event Trading:</span> Buy goods before price spikes from events</li>
          </ul>
          
          <h5 className="text-amber-300">Combat Survival</h5>
          <ul className="text-slate-300 space-y-2">
            <li>• Never fight when outnumbered unless necessary</li>
            <li>• Keep shields above 25% to prevent hull damage</li>
            <li>• Use asteroid fields for cover and ambushes</li>
            <li>• Disable engines first to prevent escape</li>
            <li>• Always have an escape route planned</li>
          </ul>
          
          <h5 className="text-amber-300">Common Mistakes to Avoid</h5>
          <ul className="text-slate-300 space-y-2">
            <li>• <span className="text-red-400">❌</span> Ignoring fuel levels until too late</li>
            <li>• <span className="text-red-400">❌</span> Attacking ships near stations (instant wanted level)</li>
            <li>• <span className="text-red-400">❌</span> Carrying contraband through checkpoints</li>
            <li>• <span className="text-red-400">❌</span> Neglecting crew morale and salaries</li>
            <li>• <span className="text-red-400">❌</span> Overloading cargo bay (reduces speed/maneuverability)</li>
          </ul>
          
          <h5 className="text-amber-300">Advanced Tips</h5>
          <ul className="text-slate-300 space-y-2">
            <li>• <span className="text-cyan-400">Market Manipulation:</span> Buy all of a resource to spike prices</li>
            <li>• <span className="text-purple-400">Faction Playing:</span> Maintain neutral with all for flexibility</li>
            <li>• <span className="text-green-400">Hidden Locations:</span> Explore off-map for secret bases</li>
            <li>• <span className="text-yellow-400">Time Management:</span> Some missions have better rewards at night</li>
            <li>• <span className="text-orange-400">Crew Combos:</span> Specific crew combinations unlock special abilities</li>
          </ul>
          
          <h5 className="text-amber-300">Hotkeys Reference</h5>
          <div className="bg-slate-800/50 p-3 rounded-lg">
            <p className="text-amber-300 font-bold mb-2">Essential Shortcuts</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-slate-300 text-sm">
                <span className="text-amber-400">H</span> - This Handbook
              </div>
              <div className="text-slate-300 text-sm">
                <span className="text-amber-400">ESC</span> - Pause Menu
              </div>
              <div className="text-slate-300 text-sm">
                <span className="text-amber-400">Tab</span> - Target Lock
              </div>
              <div className="text-slate-300 text-sm">
                <span className="text-amber-400">R</span> - Radar Toggle
              </div>
              <div className="text-slate-300 text-sm">
                <span className="text-amber-400">C</span> - Cargo View
              </div>
              <div className="text-slate-300 text-sm">
                <span className="text-amber-400">V</span> - Camera Mode
              </div>
            </div>
          </div>
          
          <h5 className="text-amber-300">Final Advice</h5>
          <div className="bg-amber-900/30 border border-amber-400/50 p-4 rounded-lg">
            <p className="text-amber-300 font-bold mb-2">Remember, Space Outlaw:</p>
            <p className="text-slate-300 italic">
              "In the Plunderverse, there are no heroes or villains - only survivors. 
              Trust no one completely, always have a backup plan, and never fly anything you can't afford to lose. 
              The void doesn't forgive mistakes, but it rewards the bold."
            </p>
            <p className="text-amber-400 font-bold mt-3 text-right">
              - Captain Rex "Voidwalker" Morgan, Legendary Outlaw
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <p className="text-slate-400 text-sm">
          Everything you need to survive in the lawless solar system of 2149
        </p>
      </div>

      {/* Table of Contents / Sections - No overflow here since parent handles scrolling */}
      <div className="space-y-2">
        {sections.map((section) => (
          <div 
            key={section.id} 
            ref={el => sectionRefs.current[section.id] = el}
            className="border border-amber-400/20 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 bg-slate-800/50 hover:bg-slate-800/70 transition-colors 
                       flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <section.icon className="w-5 h-5 text-amber-400" />
                <span className="text-amber-300 font-semibold">{section.title}</span>
              </div>
              {expandedSections.has(section.id) ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-amber-400" />
              )}
            </button>
            
            {expandedSections.has(section.id) && (
              <div className="px-4 py-4 bg-slate-900/30">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Reference */}
      <div className="mt-4 pt-4 border-t border-amber-400/20">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Press <kbd className="text-amber-400 bg-slate-700 px-1 py-0.5 rounded text-xs">H</kbd> anytime to open this handbook</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Version 2149.10.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}