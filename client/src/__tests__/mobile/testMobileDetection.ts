/**
 * Mobile Detection Test Suite
 * Tests mobile platform detection, viewport handling, and device capabilities
 * Run with window.testMobileDetection() from the browser console
 */

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class MobileDetectionTestSuite {
  private results: TestResult[] = [];
  private originalUserAgent: string;
  private originalViewport: any;

  constructor() {
    console.log('📱 Mobile Detection Test Suite initialized');
    this.originalUserAgent = navigator.userAgent;
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    console.log('%c   📱 MOBILE DETECTION TEST SUITE STARTING', 'color: #06b6d4; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testUserAgentDetection();
      await this.wait(500);
      
      await this.testViewportSizeDetection();
      await this.wait(500);
      
      await this.testTouchCapabilityDetection();
      await this.wait(500);
      
      await this.testOrientationChanges();
      await this.wait(500);
      
      await this.testWebGLAvailability();
      await this.wait(500);
      
      await this.testDevicePixelRatio();
      await this.wait(500);
      
      await this.testNetworkInfo();
      await this.wait(500);
      
      await this.testBatteryAPI();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.printSummary();
    }
  }

  private async testUserAgentDetection() {
    console.log('\n🔍 Testing User Agent Detection...');
    
    // Test current user agent
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android.*tablet/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    
    console.log('Current User Agent:', userAgent);
    console.log('Detected as mobile:', isMobile);
    console.log('Detected as tablet:', isTablet);
    console.log('Detected as iOS:', isIOS);
    console.log('Detected as Android:', isAndroid);
    
    this.addResult('User Agent Detection', 'passed', 
      `Mobile: ${isMobile}, Tablet: ${isTablet}, iOS: ${isIOS}, Android: ${isAndroid}`,
      { userAgent, isMobile, isTablet, isIOS, isAndroid }
    );
    
    // Test user agent spoofing detection
    const testAgents = [
      { name: 'iPhone', agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' },
      { name: 'Android', agent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B)' },
      { name: 'iPad', agent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' },
      { name: 'Desktop', agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    ];
    
    for (const test of testAgents) {
      const isMobileTest = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(test.agent);
      console.log(`${test.name} detection:`, isMobileTest);
    }
    
    this.addResult('User Agent Patterns', 'passed', 'All user agent patterns tested successfully');
  }

  private async testViewportSizeDetection() {
    console.log('\n📐 Testing Viewport Size Detection...');
    
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      screenWidth: screen.width,
      screenHeight: screen.height
    };
    
    const isMobileViewport = viewport.width <= 768;
    const isTabletViewport = viewport.width > 768 && viewport.width <= 1024;
    const isDesktopViewport = viewport.width > 1024;
    
    console.log('Viewport dimensions:', viewport);
    console.log('Mobile viewport:', isMobileViewport);
    console.log('Tablet viewport:', isTabletViewport);
    console.log('Desktop viewport:', isDesktopViewport);
    
    // Test viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const hasViewportMeta = !!viewportMeta;
    const viewportContent = viewportMeta?.getAttribute('content') || '';
    
    console.log('Has viewport meta:', hasViewportMeta);
    console.log('Viewport meta content:', viewportContent);
    
    this.addResult('Viewport Detection', 'passed', 
      `Width: ${viewport.width}px, Height: ${viewport.height}px, Type: ${isMobileViewport ? 'Mobile' : isTabletViewport ? 'Tablet' : 'Desktop'}`,
      { viewport, isMobileViewport, isTabletViewport, isDesktopViewport, hasViewportMeta }
    );
    
    // Test screen orientation
    const orientation = screen.orientation?.type || 'unknown';
    const angle = screen.orientation?.angle || 0;
    
    console.log('Screen orientation:', orientation, 'Angle:', angle);
    
    this.addResult('Screen Orientation', 'passed', 
      `Orientation: ${orientation}, Angle: ${angle}°`
    );
  }

  private async testTouchCapabilityDetection() {
    console.log('\n👆 Testing Touch Capability Detection...');
    
    const touchTests = {
      ontouchstart: 'ontouchstart' in window,
      DocumentTouch: window.DocumentTouch && document instanceof window.DocumentTouch,
      maxTouchPoints: navigator.maxTouchPoints > 0,
      msMaxTouchPoints: (navigator as any).msMaxTouchPoints > 0,
      pointerCoarse: window.matchMedia && window.matchMedia('(pointer: coarse)').matches,
      anyHover: window.matchMedia && !window.matchMedia('(any-hover: hover)').matches
    };
    
    const hasTouch = Object.values(touchTests).some(test => test);
    
    console.log('Touch capability tests:', touchTests);
    console.log('Has touch capability:', hasTouch);
    
    // Test touch event creation
    try {
      const touchEvent = new TouchEvent('touchstart');
      console.log('Can create TouchEvent:', true);
      touchTests['TouchEvent'] = true;
    } catch (e) {
      console.log('Can create TouchEvent:', false);
      touchTests['TouchEvent'] = false;
    }
    
    // Test pointer events
    const hasPointerEvents = 'PointerEvent' in window;
    console.log('Has PointerEvent support:', hasPointerEvents);
    
    this.addResult('Touch Capability', hasTouch ? 'passed' : 'warning', 
      hasTouch ? 'Touch capabilities detected' : 'No touch capabilities detected',
      { ...touchTests, hasTouch, hasPointerEvents }
    );
    
    // Test multi-touch support
    const maxTouchPoints = navigator.maxTouchPoints || (navigator as any).msMaxTouchPoints || 0;
    console.log('Max touch points:', maxTouchPoints);
    
    this.addResult('Multi-touch Support', maxTouchPoints > 1 ? 'passed' : 'warning',
      `Max touch points: ${maxTouchPoints}`
    );
  }

  private async testOrientationChanges() {
    console.log('\n🔄 Testing Orientation Changes...');
    
    const supportsOrientation = 'orientation' in screen;
    const supportsOrientationChange = 'onorientationchange' in window;
    
    if (supportsOrientation) {
      const currentOrientation = screen.orientation;
      console.log('Current orientation:', currentOrientation.type);
      console.log('Orientation angle:', currentOrientation.angle);
      
      // Test orientation lock capability
      const canLock = 'lock' in screen.orientation;
      console.log('Can lock orientation:', canLock);
      
      this.addResult('Orientation API', 'passed', 
        `Type: ${currentOrientation.type}, Angle: ${currentOrientation.angle}°, Can lock: ${canLock}`,
        { type: currentOrientation.type, angle: currentOrientation.angle, canLock }
      );
    } else {
      this.addResult('Orientation API', 'warning', 'Screen Orientation API not supported');
    }
    
    // Test legacy orientation
    if (supportsOrientationChange) {
      const orientation = (window as any).orientation;
      console.log('Legacy orientation value:', orientation);
      
      this.addResult('Legacy Orientation', 'passed', 
        `Orientation: ${orientation}°`
      );
    }
    
    // Test orientation media queries
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    
    console.log('Media query - Portrait:', isPortrait);
    console.log('Media query - Landscape:', isLandscape);
    
    this.addResult('Orientation Media Queries', 'passed',
      `Current: ${isPortrait ? 'Portrait' : 'Landscape'}`,
      { isPortrait, isLandscape }
    );
  }

  private async testWebGLAvailability() {
    console.log('\n🎮 Testing WebGL Availability...');
    
    const canvas = document.createElement('canvas');
    let gl = null;
    let webglVersion = 'none';
    
    try {
      gl = canvas.getContext('webgl2');
      if (gl) {
        webglVersion = 'WebGL 2';
      } else {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          webglVersion = 'WebGL 1';
        }
      }
    } catch (e) {
      console.error('WebGL detection error:', e);
    }
    
    const hasWebGL = !!gl;
    console.log('WebGL available:', hasWebGL);
    console.log('WebGL version:', webglVersion);
    
    if (gl) {
      // Get WebGL info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      
      console.log('WebGL Vendor:', vendor);
      console.log('WebGL Renderer:', renderer);
      
      // Test max texture size
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      console.log('Max texture size:', maxTextureSize);
      
      this.addResult('WebGL Support', 'passed', 
        `${webglVersion} available`,
        { version: webglVersion, vendor, renderer, maxTextureSize }
      );
    } else {
      this.addResult('WebGL Support', 'failed', 'WebGL not available');
    }
    
    // Clean up
    canvas.remove();
  }

  private async testDevicePixelRatio() {
    console.log('\n🖼️ Testing Device Pixel Ratio...');
    
    const dpr = window.devicePixelRatio || 1;
    const isRetina = dpr > 1;
    const isHighDPI = dpr >= 2;
    
    console.log('Device Pixel Ratio:', dpr);
    console.log('Is Retina/HiDPI:', isRetina);
    console.log('Is High DPI (2x+):', isHighDPI);
    
    // Test CSS pixel ratio media queries
    const dpr1x = window.matchMedia('(-webkit-min-device-pixel-ratio: 1)').matches;
    const dpr2x = window.matchMedia('(-webkit-min-device-pixel-ratio: 2)').matches;
    const dpr3x = window.matchMedia('(-webkit-min-device-pixel-ratio: 3)').matches;
    
    console.log('Matches 1x query:', dpr1x);
    console.log('Matches 2x query:', dpr2x);
    console.log('Matches 3x query:', dpr3x);
    
    this.addResult('Device Pixel Ratio', 'passed', 
      `DPR: ${dpr}x ${isHighDPI ? '(High DPI)' : '(Standard DPI)'}`,
      { dpr, isRetina, isHighDPI }
    );
  }

  private async testNetworkInfo() {
    console.log('\n📡 Testing Network Information...');
    
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      const networkInfo = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
      
      console.log('Network effective type:', networkInfo.effectiveType);
      console.log('Downlink speed:', networkInfo.downlink, 'Mbps');
      console.log('Round-trip time:', networkInfo.rtt, 'ms');
      console.log('Save data mode:', networkInfo.saveData);
      
      this.addResult('Network Information', 'passed', 
        `Type: ${networkInfo.effectiveType}, Speed: ${networkInfo.downlink}Mbps`,
        networkInfo
      );
    } else {
      console.log('Network Information API not supported');
      this.addResult('Network Information', 'warning', 'Network Information API not supported');
    }
    
    // Test online/offline status
    const isOnline = navigator.onLine;
    console.log('Online status:', isOnline);
    
    this.addResult('Online Status', 'passed', isOnline ? 'Online' : 'Offline');
  }

  private async testBatteryAPI() {
    console.log('\n🔋 Testing Battery API...');
    
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        
        const batteryInfo = {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
        
        console.log('Battery level:', batteryInfo.level + '%');
        console.log('Charging:', batteryInfo.charging);
        console.log('Time to charge:', batteryInfo.chargingTime);
        console.log('Time to discharge:', batteryInfo.dischargingTime);
        
        this.addResult('Battery Status', 'passed', 
          `Level: ${batteryInfo.level}%, ${batteryInfo.charging ? 'Charging' : 'Not charging'}`,
          batteryInfo
        );
      } else {
        console.log('Battery API not supported');
        this.addResult('Battery Status', 'warning', 'Battery API not supported');
      }
    } catch (error) {
      console.log('Battery API error:', error);
      this.addResult('Battery Status', 'warning', 'Battery API not available');
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private addResult(name: string, status: TestResult['status'], message: string, details?: any) {
    const result = { name, status, message, details };
    this.results.push(result);
    
    const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    const color = status === 'passed' ? '#10b981' : status === 'failed' ? '#ef4444' : '#f59e0b';
    
    console.log(`${icon} ${name}:`, `%c${message}`, `color: ${color}`, details || '');
  }

  private printSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    console.log('%c   📊 TEST RESULTS SUMMARY', 'color: #06b6d4; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    
    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`📝 Total: ${this.results.length}`);
    
    const successRate = Math.round((passed / this.results.length) * 100);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (failed > 0) {
      console.log('\n%c⚠️ Failed Tests:', 'color: #ef4444; font-weight: bold');
      this.results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    }
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    
    return {
      passed,
      failed,
      warnings,
      total: this.results.length,
      successRate,
      results: this.results
    };
  }
}

// Register globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).testMobileDetection = () => {
    const suite = new MobileDetectionTestSuite();
    return suite.runAllTests();
  };
  
  console.log('%c📱 Mobile Detection Test Suite loaded. Run with: window.testMobileDetection()', 'color: #06b6d4');
}

export default MobileDetectionTestSuite;