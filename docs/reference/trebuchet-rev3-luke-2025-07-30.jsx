// REFERENCE ONLY, not built. Luke Spooner's last pasted revision of the Kid-Safe Trebuchet Calculator
// (Claude artifact, Jul 30 2025). Port the physics into src/; do not import this file.
import React, { useState, useEffect } from 'react';
import { Calculator, Target, AlertTriangle, CheckCircle, Gauge, Wrench } from 'lucide-react';

const App = () => {
  const [params, setParams] = useState({
    armLength: 5.0,      // meters - total arm length
    armRatio: 4.0,       // ratio of long arm to short arm
    counterWeight: 500,  // kg
    projectileWeight: 50,// kg (kid weight)
    slingLength: 2.5,    // meters - sling length (hammock suspension)
    startAngle: 30,      // degrees - from horizontal
    fulcrumHeight: 8.0,  // meters - pivot height from ground
    releaseAngle: 45,    // degrees - from vertical
    enableRelease: false // toggle between swing-only vs release modes
  });

  const [results, setResults] = useState({});
  const [safetyAnalysis, setSafetyAnalysis] = useState({});
  const [designWarnings, setDesignWarnings] = useState([]);

  // Physics calculations - Rotational lift model for hammock trebuchet
  useEffect(() => {
    const calculate = () => {
      const g = 9.81; // gravity
      const efficiency = 0.7; // Assume 70% efficiency for rotational systems
      let newWarnings = [];

      // --- 1. Geometry & Mass ---
      const longArm = params.armLength * params.armRatio / (params.armRatio + 1);
      const shortArm = params.armLength - longArm;
      const totalRadius = longArm + params.slingLength;
      const armMass = params.armLength * 15; // Assume arm mass is 15kg per meter

      // --- 2. Energy Calculation ---
      const startAngleRad = params.startAngle * Math.PI / 180;
      const counterWeightDropHeight = shortArm * Math.sin(startAngleRad);
      const potentialEnergy = params.counterWeight * g * counterWeightDropHeight;
      const usableEnergy = potentialEnergy * efficiency;
      
      const riderStartHeight = params.fulcrumHeight - (longArm * Math.sin(startAngleRad)) - params.slingLength;

      // --- 3. Rotational Dynamics ---
      const I_arm = (1/3) * armMass * params.armLength * params.armLength;
      const I_counterweight = params.counterWeight * shortArm * shortArm;
      const I_payload = params.projectileWeight * totalRadius * totalRadius;
      const totalInertia = I_arm + I_counterweight + I_payload;
      
      const maxAngularVelocity = Math.sqrt(2 * potentialEnergy / totalInertia);
      const maxLinearVelocity = maxAngularVelocity * totalRadius;
      
      const maxCentripetalAccel = (maxLinearVelocity * maxLinearVelocity) / totalRadius;
      const maxCentripetalG = maxCentripetalAccel / g;

      // --- 4. Swing & Trajectory ---
      const maxSwingHeightGain = usableEnergy / (params.projectileWeight * g);
      const swingBottomHeight = params.fulcrumHeight - totalRadius;
      const maxPendulumHeight = swingBottomHeight + maxSwingHeightGain;
      const maxSwingAngle = Math.asin(Math.min(1, maxSwingHeightGain / totalRadius)) * 180 / Math.PI;

      // --- 5. Design & Safety Checks ---
      if (riderStartHeight <= 0) {
        newWarnings.push({ level: 'danger', message: `Rider starts underground (${riderStartHeight.toFixed(1)}m). Increase fulcrum height or decrease arm/sling length.` });
      }
      if (swingBottomHeight <= 0) {
        newWarnings.push({ level: 'danger', message: `Swing path goes underground (${swingBottomHeight.toFixed(1)}m). Fulcrum is too low for this arm/sling configuration.` });
      }
      if (params.fulcrumHeight - shortArm <= 0) {
        newWarnings.push({ level: 'caution', message: `Counterweight arm may strike the ground. Ensure clearance.` });
      }
      // *** NEW: Check for impossible release angle ***
      if (params.enableRelease && params.releaseAngle > maxSwingAngle) {
        newWarnings.push({ level: 'danger', message: `Impossible Release Angle. The requested angle (${params.releaseAngle}°) is greater than the maximum possible swing angle (${maxSwingAngle.toFixed(1)}°). The trebuchet lacks the energy for this launch.` });
      }


      let trajectoryResults = {};
      let impactVelocity = 0;
      let landingDistance = 0;
      let safetyRadius = 0;
      let finalMaxHeight = maxPendulumHeight;

      // Check if release is enabled AND the angle is possible
      if (params.enableRelease && params.releaseAngle <= maxSwingAngle) {
        // --- Ballistic Mode ---
        const releaseAngleRad = params.releaseAngle * Math.PI / 180;
        const heightGainAtRelease = totalRadius * (1 - Math.cos(releaseAngleRad));
        const heightAtRelease = swingBottomHeight + heightGainAtRelease;

        if (heightAtRelease < 0) {
             newWarnings.push({ level: 'danger', message: `Release happens underground. This trajectory is not possible.` });
        }

        const kineticEnergyAtRelease = (0.5 * totalInertia * maxAngularVelocity * maxAngularVelocity) - (params.projectileWeight * g * heightGainAtRelease);
        const angularVelAtRelease = Math.sqrt(Math.max(0, 2 * kineticEnergyAtRelease / totalInertia));
        const releaseVelocity = angularVelAtRelease * totalRadius;

        const releaseDirectionAngle = releaseAngleRad;
        const vx = releaseVelocity * Math.sin(releaseDirectionAngle);
        const vy = releaseVelocity * Math.cos(releaseDirectionAngle);

        const timeOfFlight = (vy + Math.sqrt(vy * vy + 2 * g * heightAtRelease)) / g;
        const range = vx * timeOfFlight;
        finalMaxHeight = heightAtRelease + (vy * vy) / (2 * g);
        
        const vy_impact = Math.sqrt(vy * vy + 2 * g * heightAtRelease);
        impactVelocity = Math.sqrt(vx * vx + vy_impact * vy_impact);
        landingDistance = range;
        safetyRadius = finalMaxHeight * 0.5;

        trajectoryResults = {
          releaseVelocity: releaseVelocity.toFixed(1),
          range: range.toFixed(1),
          maxTrajectoryHeight: finalMaxHeight.toFixed(1),
          timeOfFlight: timeOfFlight.toFixed(2),
        };
      } else {
        // --- Pendulum Mode (or invalid release) ---
        impactVelocity = Math.sqrt(2 * g * maxSwingHeightGain);
        landingDistance = totalRadius * Math.sin(maxSwingAngle * Math.PI / 180);
        safetyRadius = finalMaxHeight > 0 ? finalMaxHeight * 0.5 : 0;

        // If release was attempted but failed, clear ballistic results
        if (params.enableRelease) {
            trajectoryResults = {
                releaseVelocity: 'N/A',
                range: 'N/A',
                maxTrajectoryHeight: 'N/A',
                timeOfFlight: 'N/A',
            };
        }
      }

      setDesignWarnings(newWarnings);

      setResults({
        maxAngularVelocity: maxAngularVelocity.toFixed(2),
        maxLinearVelocity: maxLinearVelocity.toFixed(1),
        maxCentripetalG: maxCentripetalG.toFixed(1),
        maxSwingHeight: finalMaxHeight.toFixed(1),
        maxSwingAngle: maxSwingAngle.toFixed(1),
        riderStartHeight: riderStartHeight.toFixed(1),
        efficiency: `${(efficiency * 100).toFixed(0)}%`,
        impactVelocity: impactVelocity.toFixed(1),
        landingDistance: landingDistance.toFixed(1),
        safetyRadius: safetyRadius.toFixed(1),
        ...trajectoryResults
      });

      const safety = {
        gForce: maxCentripetalG < 3 ? 'safe' : maxCentripetalG < 5 ? 'caution' : 'danger',
        swingHeight: finalMaxHeight < 5 ? 'safe' : finalMaxHeight < 10 ? 'caution' : 'danger',
        impactSpeed: impactVelocity < 9 ? 'safe' : impactVelocity < 13 ? 'caution' : 'danger',
        overall: 'safe',
        values: { gForce: maxCentripetalG, swingHeight: finalMaxHeight, impactSpeed: impactVelocity }
      };
      
      const dangerCount = Object.values(safety).filter(s => s === 'danger').length + newWarnings.filter(w => w.level === 'danger').length;
      const cautionCount = Object.values(safety).filter(s => s === 'caution').length + newWarnings.filter(w => w.level === 'caution').length;
      
      if (dangerCount > 0) safety.overall = 'danger';
      else if (cautionCount > 0) safety.overall = 'caution';
      
      setSafetyAnalysis(safety);
    };

    calculate();
  }, [params]);

  const updateParam = (key, value) => {
    if (key === 'enableRelease') {
      setParams(prev => ({ ...prev, [key]: value }));
    } else {
      setParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
    }
  };

  const getSafetyColor = (level) => {
    switch(level) {
      case 'safe': return 'text-green-600 bg-green-50 border-green-200';
      case 'caution': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'danger': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSafetyIcon = (level) => {
    switch(level) {
      case 'safe': return <CheckCircle className="w-5 h-5" />;
      case 'caution': return <AlertTriangle className="w-5 h-5" />;
      case 'danger': return <AlertTriangle className="w-5 h-5" />;
      default: return <Gauge className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Kid-Safe Trebuchet Calculator</h1>
          </div>
          <p className="text-gray-600 mb-4">
            A more realistic physics model for a <strong>hammock-style rotational trebuchet</strong>.
            <span className="block mt-2 text-red-600 font-semibold">DISCLAIMER: This is a simplified physics model. Always test with weighted dummies first!</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Parameters */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
              <Target className="w-6 h-6 text-blue-600" />
              <span>Design Parameters</span>
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fulcrum Height (m)</label>
                <input type="number" step="0.1" value={params.fulcrumHeight} onChange={(e) => updateParam('fulcrumHeight', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                 <p className="text-xs text-gray-500 mt-1">Height of the pivot from the ground.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Arm Length (m)</label>
                <input type="number" step="0.1" value={params.armLength} onChange={(e) => updateParam('armLength', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arm Ratio (long:short)</label>
                <input type="number" step="0.1" value={params.armRatio} onChange={(e) => updateParam('armRatio', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Counterweight (kg)</label>
                <input type="number" step="10" value={params.counterWeight} onChange={(e) => updateParam('counterWeight', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rider Weight (kg)</label>
                <input type="number" step="5" value={params.projectileWeight} onChange={(e) => updateParam('projectileWeight', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hammock Sling Length (m)</label>
                <input type="number" step="0.1" value={params.slingLength} onChange={(e) => updateParam('slingLength', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Angle (deg from horizontal)</label>
                <input type="number" step="1" value={params.startAngle} onChange={(e) => updateParam('startAngle', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
              </div>
              <div className="pt-4 border-t border-gray-200">
                <label className="flex items-center space-x-3 text-sm font-medium text-gray-700">
                  <input type="checkbox" checked={params.enableRelease} onChange={(e) => updateParam('enableRelease', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500" />
                  <span>Enable Mid-Swing Release</span>
                </label>
              </div>
              {params.enableRelease && (
                <div className="pl-8">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Release Angle (deg from vertical)</label>
                  <input type="number" step="5" value={params.releaseAngle} onChange={(e) => updateParam('releaseAngle', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                   <p className="text-xs text-gray-500 mt-1">Max possible: {results.maxSwingAngle}°</p>
                </div>
              )}
            </div>
          </div>

          {/* Results and Safety Analysis */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Safety Assessment</h3>
                <div className={`p-4 rounded-lg flex items-center gap-4 border ${getSafetyColor(safetyAnalysis.overall)}`}>
                  {getSafetyIcon(safetyAnalysis.overall)}
                  <div>
                    <div className="font-bold text-lg">Overall Safety: {safetyAnalysis.overall?.toUpperCase()}</div>
                    <div className="text-sm opacity-90">
                      G-Force: <span className="font-mono">{safetyAnalysis.values?.gForce?.toFixed(1) || '0.0'}g</span> | 
                      Impact: <span className="font-mono">{safetyAnalysis.values?.impactSpeed?.toFixed(1) || '0.0'} m/s</span> | 
                      Height: <span className="font-mono">{safetyAnalysis.values?.swingHeight?.toFixed(1) || '0.0'}m</span>
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  <div className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${getSafetyColor(safetyAnalysis.gForce)}`}>
                    {getSafetyIcon(safetyAnalysis.gForce)}
                    <span><strong>G-Force:</strong> {safetyAnalysis.values?.gForce?.toFixed(1) || '0.0'}g</span>
                  </div>
                  <div className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${getSafetyColor(safetyAnalysis.swingHeight)}`}>
                    {getSafetyIcon(safetyAnalysis.swingHeight)}
                    <span><strong>Max Height:</strong> {safetyAnalysis.values?.swingHeight?.toFixed(1) || '0.0'}m</span>
                  </div>
                  <div className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${getSafetyColor(safetyAnalysis.impactSpeed)}`}>
                    {getSafetyIcon(safetyAnalysis.impactSpeed)}
                    <span><strong>Impact Speed:</strong> {safetyAnalysis.values?.impactSpeed?.toFixed(1) || '0.0'} m/s</span>
                  </div>
                </div>
            </div>

            {designWarnings.length > 0 && (
                 <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Wrench className="w-6 h-6 text-yellow-600" />
                        Design & Engineering Warnings
                    </h3>
                    <div className="space-y-3">
                        {designWarnings.map((warning, index) => (
                            <div key={index} className={`p-3 rounded-lg flex items-start gap-3 border ${getSafetyColor(warning.level)}`}>
                                {getSafetyIcon(warning.level)}
                                <p className="text-sm font-medium">{warning.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="font-semibold text-xl text-gray-800 mb-4">Performance Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5 text-sm">
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-gray-600">Max Height (from ground)</div>
                  <div className="font-bold text-lg text-gray-800">{results.maxSwingHeight} m</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-gray-600">Max Linear Speed</div>
                  <div className="font-bold text-lg text-gray-800">{results.maxLinearVelocity} m/s</div>
                </div>
                 <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-gray-600">Rider Start Height</div>
                  <div className="font-bold text-lg text-gray-800">{results.riderStartHeight} m</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-gray-600">Max Swing Angle</div>
                  <div className="font-bold text-lg text-gray-800">{results.maxSwingAngle}°</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-gray-600">Max G-Force</div>
                  <div className="font-bold text-lg text-gray-800">{results.maxCentripetalG} g</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-gray-600">Est. Efficiency</div>
                  <div className="font-bold text-lg text-gray-800">{results.efficiency}</div>
                </div>
              </div>
              
              {params.enableRelease && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-3">Ballistic Trajectory (if released)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 bg-blue-50 rounded-md">
                        <div className="text-blue-700">Release Velocity</div>
                        <div className="font-bold text-lg text-blue-900">{results.releaseVelocity} m/s</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-md">
                        <div className="text-blue-700">Range</div>
                        <div className="font-bold text-lg text-blue-900">{results.range} m</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-md">
                        <div className="text-blue-700">Trajectory Height</div>
                        <div className="font-bold text-lg text-blue-900">{results.maxTrajectoryHeight} m</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-md">
                        <div className="text-blue-700">Flight Time</div>
                        <div className="font-bold text-lg text-blue-900">{results.timeOfFlight} s</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

             <div className="bg-yellow-50 p-6 rounded-xl shadow-lg border border-yellow-200">
                <h4 className="font-semibold text-xl text-yellow-800 mb-2">Landing Zone Analysis</h4>
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-yellow-900">
                    <div>
                        <span className="text-sm">Expected Landing Distance:</span>
                        <span className="font-bold text-2xl ml-2">{results.landingDistance}m</span>
                    </div>
                    <div>
                        <span className="text-sm">Required Safety Radius:</span>
                        <span className="font-bold text-2xl ml-2">{results.safetyRadius}m</span>
                    </div>
                </div>
                <p className="text-sm text-yellow-700 mt-3">
                  Clear a zone from <strong>{(parseFloat(results.landingDistance || 0) - parseFloat(results.safetyRadius || 0)).toFixed(1)}m</strong> to <strong>{(parseFloat(results.landingDistance || 0) + parseFloat(results.safetyRadius || 0)).toFixed(1)}m</strong> from the base.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
