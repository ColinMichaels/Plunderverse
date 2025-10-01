import React, { useState } from 'react';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';
import { useCreditsData } from '../../domain/economy/selectors';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Alert, AlertDescription } from './alert';
import { Eye, EyeOff, CreditCard, Clock, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';

export const LayLowInterface: React.FC = () => {
  const { 
    currentHeat, 
    wantedLevel,
    isLayingLow,
    layingLowLocation,
    layingLowDaysRemaining,
    fakeIdAvailable,
    startLayingLow,
    stopLayingLow,
    purchaseFakeId,
    getHeatDecayRate
  } = useHeatSystem();
  
  const { credits } = useCreditsData();
  const { isLanded, landedPlanet } = useLandedState();
  const [showConfirmFakeId, setShowConfirmFakeId] = useState(false);

  // Only show when landed and has heat
  if (!isLanded || currentHeat < 5) return null;

  const canLayLow = credits >= 100 && !isLayingLow;
  const canBuyFakeId = credits >= 1000 && fakeIdAvailable && !isLayingLow;
  
  const handleLayLow = () => {
    if (landedPlanet) {
      startLayingLow(landedPlanet);
    }
  };

  const handleFakeId = () => {
    if (purchaseFakeId()) {
      setShowConfirmFakeId(false);
    }
  };

  return (
    <Card className="bg-slate-900/90 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            {isLayingLow ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            <span>Heat Management</span>
          </span>
          <span className="text-sm font-mono text-gray-400">
            Heat: {Math.round(currentHeat)}
          </span>
        </CardTitle>
        <CardDescription>
          {isLayingLow 
            ? `Currently laying low at ${layingLowLocation}`
            : "Manage your criminal heat level"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Status */}
        {isLayingLow ? (
          <Alert className="border-blue-500 bg-blue-900/20">
            <EyeOff className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Laying Low Active</p>
                <p className="text-sm text-gray-400">
                  Heat decay rate: <span className="text-green-400">5 points/day</span>
                </p>
                <p className="text-sm text-gray-400">
                  Days remaining: <span className="text-yellow-400">{layingLowDaysRemaining}</span>
                </p>
                <p className="text-xs text-orange-400 mt-2">
                  ⚠️ Cannot take missions while laying low
                </p>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Lay Low Option */}
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-mono text-gray-400">100 cr/day</span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Lay Low</h3>
              <p className="text-xs text-gray-400 mb-3">
                Hide and accelerate heat decay to 5 points/day
              </p>
              <Button
                size="sm"
                onClick={handleLayLow}
                disabled={!canLayLow}
                className={cn(
                  "w-full",
                  canLayLow 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "bg-gray-600 cursor-not-allowed"
                )}
              >
                {credits < 100 ? "Insufficient Credits" : "Start Laying Low"}
              </Button>
            </div>

            {/* Fake ID Option */}
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-mono text-gray-400">1000 cr</span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Fake ID</h3>
              <p className="text-xs text-gray-400 mb-3">
                Instantly reduce heat by 20 points
              </p>
              <Button
                size="sm"
                onClick={() => setShowConfirmFakeId(true)}
                disabled={!canBuyFakeId}
                className={cn(
                  "w-full",
                  canBuyFakeId 
                    ? "bg-purple-600 hover:bg-purple-700" 
                    : "bg-gray-600 cursor-not-allowed"
                )}
              >
                {!fakeIdAvailable 
                  ? "Recently Used" 
                  : credits < 1000 
                  ? "Insufficient Credits" 
                  : "Purchase Fake ID"}
              </Button>
            </div>
          </div>
        )}

        {/* Stop Laying Low Button */}
        {isLayingLow && (
          <Button
            onClick={stopLayingLow}
            variant="outline"
            className="w-full border-orange-500 text-orange-400 hover:bg-orange-900/20"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Stop Laying Low (Resume Activities)
          </Button>
        )}

        {/* Heat Decay Info */}
        <div className="bg-slate-800/30 rounded p-2 text-xs">
          <p className="text-gray-400">
            Current heat decay rate: 
            <span className="text-cyan-400 font-mono ml-1">
              {getHeatDecayRate()} point{getHeatDecayRate() > 1 ? 's' : ''}/minute
            </span>
          </p>
        </div>
      </CardContent>

      {/* Fake ID Confirmation Modal */}
      {showConfirmFakeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <Card className="max-w-sm bg-slate-900 border-purple-500">
            <CardHeader>
              <CardTitle>Confirm Fake ID Purchase</CardTitle>
              <CardDescription>
                This will cost 1000 credits and reduce your heat by 20 points
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-purple-500 bg-purple-900/20">
                <AlertDescription className="text-sm">
                  <div className="space-y-1">
                    <p>Current Heat: <span className="font-mono">{Math.round(currentHeat)}</span></p>
                    <p>After Purchase: <span className="font-mono text-green-400">{Math.round(Math.max(0, currentHeat - 20))}</span></p>
                    <p>Your Credits: <span className="font-mono">{credits}</span></p>
                    <p>After Purchase: <span className="font-mono text-yellow-400">{credits - 1000}</span></p>
                  </div>
                </AlertDescription>
              </Alert>
              <div className="flex space-x-2">
                <Button
                  onClick={handleFakeId}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Confirm Purchase
                </Button>
                <Button
                  onClick={() => setShowConfirmFakeId(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
};