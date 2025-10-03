import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { toast } from 'sonner';

// Icons
import { 
  Activity,
  Cpu,
  Timer,
  Camera,
  Sun,
  TestTube,
  Package,
  X,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  Trash2,
  Download,
  RefreshCw,
  Zap,
  Gauge,
  Database,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  Globe,
  Rocket
} from 'lucide-react';

// Store imports
import { useDebugTools } from '../../lib/stores/debug/useDebugTools';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useSurfaceLighting, TIME_OF_DAY_PRESETS } from '../../lib/stores/surface/useSurfaceLighting';
import { planets } from '../../lib/planetData';

// Utils
import { MemoryProfiler } from '../../lib/utils/MemoryProfiler';
import { ResourceManager } from '../../lib/utils/ResourceManager';

// Test imports
import { testMissionSystem } from '../../testMissionSystem';
import { PanelTestSuite } from '../../lib/tests/panel-tests/testPanelFunctionality';
import { testObjectiveTriggers } from '../../lib/tests/objectiveTriggerTest';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed';
  message: string;
  timestamp: number;
}

interface MemoryData {
  timestamp: number;
  used: number;
  total: number;
  percentage: number;
}

// FPS Counter Hook
function useFPS(): number {
  const [fps, setFps] = useState(0);
  const frameRef = useRef({ count: 0, lastTime: performance.now() });

  useEffect(() => {
    const updateFPS = () => {
      frameRef.current.count++;
      const currentTime = performance.now();
      const delta = currentTime - frameRef.current.lastTime;

      if (delta >= 1000) {
        setFps(Math.round((frameRef.current.count * 1000) / delta));
        frameRef.current.count = 0;
        frameRef.current.lastTime = currentTime;
      }

      requestAnimationFrame(updateFPS);
    };

    const animationId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return fps;
}

export function UnifiedDebugPanel() {
  // Stores
  const { 
    isVisible, 
    timeScale, 
    showCollisionBoxes, 
    showWireframes,
    toggleVisibility,
    setTimeScale,
    toggleCollisionBoxes,
    toggleWireframes
  } = useDebugTools();

  const { 
    time, 
    setTime, 
    cameraPosition, 
    setCameraPosition, 
    setSelectedPlanet,
    getUniverseTime 
  } = useSolarSystem();

  const { landedPlanet, setLanded } = useLandedState();
  const surfaceLighting = useSurfaceLighting();

  // Component state
  const [activeTab, setActiveTab] = useState('memory');
  const [memoryHistory, setMemoryHistory] = useState<MemoryData[]>([]);
  const [resourceStats, setResourceStats] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedPlanet, setSelectedTravelPlanet] = useState<string>('');
  const [posX, setPosX] = useState(cameraPosition.x.toFixed(2));
  const [posY, setPosY] = useState(cameraPosition.y.toFixed(2));
  const [posZ, setPosZ] = useState(cameraPosition.z.toFixed(2));
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['memory', 'fps']));

  // Performance metrics
  const fps = useFPS();
  const memoryProfiler = MemoryProfiler.getInstance();
  const resourceManager = ResourceManager.getInstance();

  // Only render in dev mode
  if (!import.meta.env.DEV || !isVisible) {
    return null;
  }

  // Update memory history
  useEffect(() => {
    const updateMemory = () => {
      const stats = memoryProfiler.getStats();
      if (stats.current > 0) {
        const newData: MemoryData = {
          timestamp: Date.now(),
          used: stats.current,
          total: stats.limit,
          percentage: stats.usage * 100
        };
        
        setMemoryHistory(prev => {
          const updated = [...prev, newData];
          // Keep only last 30 data points
          return updated.slice(-30);
        });
      }
    };

    updateMemory();
    const interval = setInterval(updateMemory, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update resource stats
  useEffect(() => {
    const updateResources = () => {
      const stats = resourceManager.getStats();
      setResourceStats(stats);
    };

    updateResources();
    const interval = setInterval(updateResources, 3000);
    return () => clearInterval(interval);
  }, []);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Format memory value
  const formatMemory = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600) % 24;
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Handle time controls
  const handlePauseToggle = () => {
    setTimeScale(timeScale === 0 ? 1 : 0);
  };

  const handleSpeedChange = (delta: number) => {
    setTimeScale(Math.max(0, Math.min(10, timeScale + delta)));
  };

  // Handle camera position update
  const handlePositionUpdate = () => {
    const x = parseFloat(posX) || 0;
    const y = parseFloat(posY) || 0;
    const z = parseFloat(posZ) || 0;
    setCameraPosition(new THREE.Vector3(x, y, z));
    toast.success(`Camera position set to (${x}, ${y}, ${z})`);
  };

  // Handle planet travel
  const handleTravelToPlanet = () => {
    if (selectedPlanet) {
      const planet = planets.find(p => p.name === selectedPlanet);
      if (planet) {
        const angle = planet.orbitalSpeed * time;
        const planetPos = new THREE.Vector3(
          Math.cos(angle) * planet.distance,
          0,
          Math.sin(angle) * planet.distance
        );
        
        setSelectedPlanet(selectedPlanet);
        const viewDistance = planet.size * 3 + 15;
        const directionFromSun = planetPos.clone().normalize();
        const cameraPos = planetPos.clone().add(
          directionFromSun.clone().multiplyScalar(viewDistance)
        );
        cameraPos.y += 10;
        
        setCameraPosition(cameraPos);
        setLanded(selectedPlanet);
        
        toast.success(`Traveled to ${selectedPlanet}`);
      }
    }
  };

  // Run test suites
  const runPanelTests = async () => {
    setIsRunningTests(true);
    const result: TestResult = {
      name: 'Panel Tests',
      status: 'running',
      message: 'Running panel functionality tests...',
      timestamp: Date.now()
    };
    setTestResults(prev => [...prev, result]);

    try {
      const testSuite = new PanelTestSuite();
      await testSuite.runAllTests();
      
      result.status = 'passed';
      result.message = 'All panel tests completed successfully';
    } catch (error) {
      result.status = 'failed';
      result.message = `Test failed: ${error}`;
    }
    
    setTestResults(prev => prev.map(r => r.name === 'Panel Tests' ? result : r));
    setIsRunningTests(false);
  };

  const runMissionTests = async () => {
    setIsRunningTests(true);
    const result: TestResult = {
      name: 'Mission Tests',
      status: 'running',
      message: 'Running mission system tests...',
      timestamp: Date.now()
    };
    setTestResults(prev => [...prev, result]);

    try {
      const testResult = await testMissionSystem();
      
      result.status = testResult.success ? 'passed' : 'failed';
      result.message = testResult.success 
        ? 'Mission system tests completed successfully'
        : 'Some mission tests failed';
    } catch (error) {
      result.status = 'failed';
      result.message = `Test failed: ${error}`;
    }
    
    setTestResults(prev => prev.map(r => r.name === 'Mission Tests' ? result : r));
    setIsRunningTests(false);
  };

  const runObjectiveTests = async () => {
    setIsRunningTests(true);
    const result: TestResult = {
      name: 'Objective Tests',
      status: 'running',
      message: 'Running objective trigger tests...',
      timestamp: Date.now()
    };
    setTestResults(prev => [...prev, result]);

    try {
      await testObjectiveTriggers();
      
      result.status = 'passed';
      result.message = 'Objective trigger tests completed successfully';
    } catch (error) {
      result.status = 'failed';
      result.message = `Test failed: ${error}`;
    }
    
    setTestResults(prev => prev.map(r => r.name === 'Objective Tests' ? result : r));
    setIsRunningTests(false);
  };

  // Resource management functions
  const cleanupByTag = (tag: string) => {
    const count = resourceManager.disposeByTag(tag);
    toast.success(`Cleaned up ${count} resources with tag: ${tag}`);
  };

  const exportResourceData = () => {
    const stats = resourceManager.getStats();
    const tags = resourceManager.getAllTags();
    const data = {
      stats,
      tags: Array.from(tags),
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resource-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Resource data exported');
  };

  const forceGarbageCollection = () => {
    if ((window as any).gc) {
      (window as any).gc();
      toast.success('Garbage collection triggered');
    } else {
      toast.warning('Garbage collection not available (requires --expose-gc flag)');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed top-4 right-4 w-[500px] max-h-[90vh] z-50"
    >
      <Card className="bg-black/90 backdrop-blur-xl border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
        {/* Header */}
        <CardHeader className="pb-3 border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Unified Debug Panel
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs mt-1">
                Development Mode • FPS: <span className={fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}>{fps}</span>
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleVisibility}
              className="text-cyan-400 hover:text-cyan-300"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Tabs */}
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-black/50 border-b border-cyan-500/20 rounded-none">
              <TabsTrigger value="memory" className="data-[state=active]:bg-cyan-500/20">
                <Activity className="w-3 h-3 mr-1" />
                Memory
              </TabsTrigger>
              <TabsTrigger value="time" className="data-[state=active]:bg-cyan-500/20">
                <Timer className="w-3 h-3 mr-1" />
                Time
              </TabsTrigger>
              {landedPlanet && (
                <TabsTrigger value="lighting" className="data-[state=active]:bg-cyan-500/20">
                  <Sun className="w-3 h-3 mr-1" />
                  Lighting
                </TabsTrigger>
              )}
              <TabsTrigger value="tests" className="data-[state=active]:bg-cyan-500/20">
                <TestTube className="w-3 h-3 mr-1" />
                Tests
              </TabsTrigger>
              <TabsTrigger value="resources" className="data-[state=active]:bg-cyan-500/20">
                <Package className="w-3 h-3 mr-1" />
                Resources
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[500px] p-4">
              {/* Memory & Performance Tab */}
              <TabsContent value="memory" className="mt-0 space-y-4">
                {/* FPS Monitor */}
                <Collapsible open={expandedSections.has('fps')}>
                  <CollapsibleTrigger
                    onClick={() => toggleSection('fps')}
                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 w-full"
                  >
                    {expandedSections.has('fps') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Gauge className="w-4 h-4" />
                    Performance Metrics
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-900/50 p-2 rounded">
                        <p className="text-xs text-gray-400">FPS</p>
                        <p className={`text-2xl font-bold ${fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {fps}
                        </p>
                      </div>
                      <div className="bg-gray-900/50 p-2 rounded">
                        <p className="text-xs text-gray-400">Frame Time</p>
                        <p className="text-2xl font-bold text-cyan-400">
                          {fps > 0 ? (1000 / fps).toFixed(1) : '0'}ms
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Memory Usage */}
                <Collapsible open={expandedSections.has('memory')}>
                  <CollapsibleTrigger
                    onClick={() => toggleSection('memory')}
                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 w-full"
                  >
                    {expandedSections.has('memory') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Database className="w-4 h-4" />
                    Memory Usage
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    {memoryHistory.length > 0 && (
                      <>
                        <div className="bg-gray-900/50 p-3 rounded space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Memory Usage</span>
                            <span className="text-cyan-400">
                              {memoryHistory[memoryHistory.length - 1]?.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress 
                            value={memoryHistory[memoryHistory.length - 1]?.percentage || 0} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{formatMemory(memoryHistory[memoryHistory.length - 1]?.used || 0)}</span>
                            <span>{formatMemory(memoryHistory[memoryHistory.length - 1]?.total || 0)}</span>
                          </div>
                        </div>

                        {/* Memory Trend Chart (Simplified) */}
                        <div className="bg-gray-900/50 p-3 rounded">
                          <p className="text-xs text-gray-400 mb-2">Memory Trend (Last 30 samples)</p>
                          <div className="h-20 flex items-end gap-1">
                            {memoryHistory.map((data, index) => (
                              <div
                                key={index}
                                className="flex-1 bg-cyan-500/50"
                                style={{
                                  height: `${(data.percentage / 100) * 80}px`,
                                  backgroundColor: data.percentage > 90 ? '#ef4444' : data.percentage > 70 ? '#f59e0b' : '#06b6d4'
                                }}
                                title={`${data.percentage.toFixed(1)}%`}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => memoryProfiler.takeSnapshot('manual')}
                        className="flex-1 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        Snapshot
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => memoryProfiler.clearSnapshots()}
                        className="flex-1 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Resource Counts */}
                <Collapsible open={expandedSections.has('resources-count')}>
                  <CollapsibleTrigger
                    onClick={() => toggleSection('resources-count')}
                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 w-full"
                  >
                    {expandedSections.has('resources-count') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Package className="w-4 h-4" />
                    Resource Counts
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    {resourceStats && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-gray-900/50 p-2 rounded">
                          <p className="text-gray-400">Geometries</p>
                          <p className="text-cyan-400 font-bold">{resourceStats.geometries}</p>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded">
                          <p className="text-gray-400">Materials</p>
                          <p className="text-cyan-400 font-bold">{resourceStats.materials}</p>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded">
                          <p className="text-gray-400">Textures</p>
                          <p className="text-cyan-400 font-bold">{resourceStats.textures}</p>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded">
                          <p className="text-gray-400">Meshes</p>
                          <p className="text-cyan-400 font-bold">{resourceStats.meshes}</p>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded">
                          <p className="text-gray-400">Audio</p>
                          <p className="text-cyan-400 font-bold">{resourceStats.audio}</p>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded">
                          <p className="text-gray-400">Est. Memory</p>
                          <p className="text-cyan-400 font-bold">{formatMemory(resourceStats.totalMemoryEstimate)}</p>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>

              {/* Time & Camera Tab */}
              <TabsContent value="time" className="mt-0 space-y-4">
                {/* Time Controls */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Controls
                  </h3>
                  
                  <div className="bg-gray-900/50 p-3 rounded space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400">Universe Time</Label>
                      <span className="text-cyan-400 font-mono">{formatTime(getUniverseTime())}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePauseToggle}
                        className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                      >
                        {timeScale === 0 ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSpeedChange(-0.5)}
                        className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                      >
                        -0.5x
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSpeedChange(0.5)}
                        className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                      >
                        +0.5x
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSpeedChange(1)}
                        className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                      >
                        +1x
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-gray-400">Time Scale</Label>
                        <span className="text-cyan-400 font-mono">{timeScale.toFixed(1)}x</span>
                      </div>
                      <Slider
                        value={[timeScale]}
                        onValueChange={([value]) => setTimeScale(value)}
                        min={0}
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Camera Controls */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Camera Position
                  </h3>
                  
                  <div className="bg-gray-900/50 p-3 rounded space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-gray-400">X</Label>
                        <Input
                          type="number"
                          value={posX}
                          onChange={(e) => setPosX(e.target.value)}
                          className="h-8 bg-black/50 border-cyan-500/20 text-cyan-400"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Y</Label>
                        <Input
                          type="number"
                          value={posY}
                          onChange={(e) => setPosY(e.target.value)}
                          className="h-8 bg-black/50 border-cyan-500/20 text-cyan-400"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Z</Label>
                        <Input
                          type="number"
                          value={posZ}
                          onChange={(e) => setPosZ(e.target.value)}
                          className="h-8 bg-black/50 border-cyan-500/20 text-cyan-400"
                        />
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={handlePositionUpdate}
                      className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    >
                      Update Position
                    </Button>
                  </div>
                </div>

                {/* Quick Travel */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <Rocket className="w-4 h-4" />
                    Quick Travel
                  </h3>
                  
                  <div className="bg-gray-900/50 p-3 rounded space-y-3">
                    <Select value={selectedPlanet} onValueChange={setSelectedTravelPlanet}>
                      <SelectTrigger className="bg-black/50 border-cyan-500/20 text-cyan-400">
                        <SelectValue placeholder="Select a planet..." />
                      </SelectTrigger>
                      <SelectContent>
                        {planets.map((planet) => (
                          <SelectItem key={planet.name} value={planet.name}>
                            {planet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      size="sm"
                      onClick={handleTravelToPlanet}
                      disabled={!selectedPlanet}
                      className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
                    >
                      <Globe className="w-3 h-3 mr-2" />
                      Travel to Planet
                    </Button>
                  </div>
                </div>

                {/* Debug Options */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400">Debug Options</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                      <Label className="text-gray-400">Show Collision Boxes</Label>
                      <Switch
                        checked={showCollisionBoxes}
                        onCheckedChange={toggleCollisionBoxes}
                      />
                    </div>
                    <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                      <Label className="text-gray-400">Show Wireframes</Label>
                      <Switch
                        checked={showWireframes}
                        onCheckedChange={toggleWireframes}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Lighting Controls Tab (only when landed) */}
              {landedPlanet && (
                <TabsContent value="lighting" className="mt-0 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                      <Label className="text-gray-400">Manual Override</Label>
                      <Switch
                        checked={surfaceLighting.manualOverride}
                        onCheckedChange={surfaceLighting.setManualOverride}
                      />
                    </div>

                    {surfaceLighting.manualOverride && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-gray-400">Sun Azimuth: {surfaceLighting.sunAzimuth}°</Label>
                          <Slider
                            value={[surfaceLighting.sunAzimuth]}
                            onValueChange={([value]) => surfaceLighting.setSunAzimuth(value)}
                            min={0}
                            max={360}
                            step={1}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-400">Sun Elevation: {surfaceLighting.sunElevation}°</Label>
                          <Slider
                            value={[surfaceLighting.sunElevation]}
                            onValueChange={([value]) => surfaceLighting.setSunElevation(value)}
                            min={-90}
                            max={90}
                            step={1}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-400">Sun Intensity: {surfaceLighting.sunIntensity.toFixed(1)}</Label>
                          <Slider
                            value={[surfaceLighting.sunIntensity]}
                            onValueChange={([value]) => surfaceLighting.setSunIntensity(value)}
                            min={0}
                            max={5}
                            step={0.1}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-400">Ambient Intensity: {surfaceLighting.ambientIntensity.toFixed(2)}</Label>
                          <Slider
                            value={[surfaceLighting.ambientIntensity]}
                            onValueChange={([value]) => surfaceLighting.setAmbientIntensity(value)}
                            min={0}
                            max={1}
                            step={0.01}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-400">Sun Color</Label>
                          <Input
                            type="color"
                            value={surfaceLighting.sunColor}
                            onChange={(e) => surfaceLighting.setSunColor(e.target.value)}
                            className="h-10 w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-400">Time of Day Presets</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {TIME_OF_DAY_PRESETS.map((preset) => (
                              <Button
                                key={preset.name}
                                size="sm"
                                variant="outline"
                                onClick={() => surfaceLighting.applyPreset(preset)}
                                className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                              >
                                {preset.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {!surfaceLighting.manualOverride && (
                      <div className="bg-gray-900/50 p-3 rounded">
                        <p className="text-sm text-gray-400">
                          Lighting is automatically calculated based on planet rotation and universe time.
                        </p>
                        <p className="text-xs text-cyan-400 mt-2">
                          Current: {surfaceLighting.currentTimeOfDay}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Test Suites Tab */}
              <TabsContent value="tests" className="mt-0 space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    Test Suites
                  </h3>

                  <div className="space-y-2">
                    <Button
                      size="sm"
                      onClick={runPanelTests}
                      disabled={isRunningTests}
                      className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
                    >
                      Run Panel Tests
                    </Button>
                    <Button
                      size="sm"
                      onClick={runMissionTests}
                      disabled={isRunningTests}
                      className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
                    >
                      Run Mission Tests
                    </Button>
                    <Button
                      size="sm"
                      onClick={runObjectiveTests}
                      disabled={isRunningTests}
                      className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
                    >
                      Run Objective Tests
                    </Button>
                  </div>

                  {testResults.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase">Test Results</h4>
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {testResults.map((result, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-gray-900/50 p-2 rounded text-xs"
                          >
                            {result.status === 'running' && <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />}
                            {result.status === 'passed' && <CheckCircle className="w-3 h-3 text-green-400" />}
                            {result.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-400" />}
                            <div className="flex-1">
                              <p className="text-gray-300">{result.name}</p>
                              <p className="text-gray-500">{result.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTestResults([])}
                        className="w-full text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                      >
                        Clear Results
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Resource Management Tab */}
              <TabsContent value="resources" className="mt-0 space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Resource Management
                  </h3>

                  <div className="bg-gray-900/50 p-3 rounded space-y-2">
                    <p className="text-xs text-gray-400 uppercase">Resource Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {resourceManager.getAllTags && Array.from(resourceManager.getAllTags()).slice(0, 10).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-cyan-400 border-cyan-500/30 cursor-pointer hover:bg-cyan-500/10"
                          onClick={() => cleanupByTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {resourceManager.getAllTags && resourceManager.getAllTags().size > 10 && (
                      <p className="text-xs text-gray-500">
                        ...and {resourceManager.getAllTags().size - 10} more tags
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Button
                      size="sm"
                      onClick={exportResourceData}
                      className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    >
                      <Download className="w-3 h-3 mr-2" />
                      Export Resource Data
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        resourceManager.disposeAll();
                        toast.success('All resources cleaned up');
                      }}
                      variant="destructive"
                      className="w-full"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Clear All Resources
                    </Button>
                    <Button
                      size="sm"
                      onClick={forceGarbageCollection}
                      className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    >
                      <Zap className="w-3 h-3 mr-2" />
                      Force Garbage Collection
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        resourceManager.logMemoryStatus();
                        toast.success('Memory status logged to console');
                      }}
                      className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    >
                      <Info className="w-3 h-3 mr-2" />
                      Log Memory Status
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Export singleton instance for memory profiler
export const memoryProfiler = MemoryProfiler.getInstance();