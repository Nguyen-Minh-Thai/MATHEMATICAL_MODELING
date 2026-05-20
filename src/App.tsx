import { useState, ReactNode } from 'react';
import { 
  BarChart3, 
  LayoutDashboard, 
  Database, 
  PlayCircle, 
  CheckCircle2, 
  Settings, 
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import SolverEngine from './components/SolverEngine';
import MetricsDashboard from './components/MetricsDashboard';
import DataManager from './components/DataManager';
import ResultsTable from './components/ResultsTable';
import SettingsModal from './components/SettingsModal';

import { STAFF_LIST, SHIFTS, FACILITIES, type Staff, type Shift } from "./lib/mock-data";

type View = 'dashboard' | 'data' | 'results';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSolverRunning, setIsSolverRunning] = useState(false);
  const [solverProgress, setSolverProgress] = useState(0);
  const [solverLogs, setSolverLogs] = useState<{ time: string, msg: string, type: 'info' | 'success' | 'warning' }[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [optimizationMode, setOptimizationMode] = useState<'fairness' | 'distance' | 'complexity'>('complexity');
  const [agePriority, setAgePriority] = useState(true);
  const [genderWeight, setGenderWeight] = useState(500);
  const [ageWeight, setAgeWeight] = useState(1500);
  const [locationWeight, setLocationWeight] = useState(430);
  const [overlapWeight, setOverlapWeight] = useState(700);

  const [staffData, setStaffData] = useState<Staff[]>(STAFF_LIST);
  const [shiftData, setShiftData] = useState<Shift[]>(SHIFTS);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const solverAlgorithm = 'NSGA-II';

  const startSolver = async () => {
    setIsSolverRunning(true);
    setSolverProgress(5);
    setHasResults(false);
    setSolverLogs([
      { time: new Date().toLocaleTimeString(), msg: `Starting ${solverAlgorithm} solver...`, type: 'info' },
      { time: new Date().toLocaleTimeString(), msg: 'Loading Staff Data...', type: 'info' },
      { time: new Date().toLocaleTimeString(), msg: 'Loading Shift Data...', type: 'info' },
    ]);

    try {
      // Small delay for effect
      await new Promise(r => setTimeout(r, 800));
      setSolverProgress(20);
      setSolverLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: 'Building Model constraints...', type: 'info' }, ...prev]);
      
      await new Promise(r => setTimeout(r, 600));
      setSolverProgress(40);
      setSolverLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: 'Optimizing with NSGA-II multi-objective evolutionary solver...', type: 'info' }, ...prev]);

      const solverConfig = {
        mode: optimizationMode,
        agePriority,
        fairnessWeight: optimizationMode === 'fairness' ? 3750 : optimizationMode === 'distance' ? 1200 : 2400,
        distanceWeight: locationWeight,
        genderWeight,
        ageWeight: agePriority ? ageWeight : 0,
        closeShiftWeight: overlapWeight,
        sameDayDiffFacilityWeight: 1500,
        minShiftWeight: 900,
        weekendWeight: 700,
      };

      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff: staffData,
          shifts: shiftData,
          config: solverConfig,
        })
      });

      let data: any;
      try {
        data = await response.json();
      } catch (parseErr) {
        const text = await response.text();
        throw new Error(text || response.statusText || 'Solver returned an invalid response');
      }

      if (!response.ok) {
        const errText = data?.message || response.statusText || 'Solver returned an error';
        const trace = data?.stderr || data?.raw || data?.rawOutput;
        throw new Error(trace ? `${errText}: ${trace}` : errText);
      }

      if (data.success) {
        setSolverProgress(100);
        setSolverLogs(prev => [
          { time: new Date().toLocaleTimeString(), msg: `Optimization completed with ${solverAlgorithm}.`, type: 'success' },
          ...prev
        ]);
        setAssignments(data.assignments);
        setMetrics(data.metrics);
        setHasResults(true);
        setActiveView('results');
      } else {
        setSolverLogs(prev => [
          { time: new Date().toLocaleTimeString(), msg: `Error: ${data.message}`, type: 'warning' },
          ...prev
        ]);
      }
    } catch (e: any) {
      const errorMsg = e?.message || 'Network error or Timeout. Solver process interrupted.';
      setSolverLogs(prev => [
        { time: new Date().toLocaleTimeString(), msg: errorMsg, type: 'warning' },
        ...prev
      ]);
    } finally {
      setIsSolverRunning(false);
    }
  };

  const stopSolver = async () => {
    if (!isSolverRunning) return;
    try {
      const resp = await fetch('/api/solve/stop', { method: 'POST' });
      const data = await resp.json();
      setSolverLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: data.message || 'Solver stopped', type: 'warning' }, ...prev]);
    } catch (e) {
      setSolverLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: 'Failed to stop solver', type: 'warning' }, ...prev]);
    } finally {
      setIsSolverRunning(false);
      setSolverProgress(0);
    }
  };

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const handleExportExcel = () => {
    // Request backend to generate the official XLSX and download it
    fetch('/api/export', { method: 'POST' })
      .then(async (resp) => {
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}));
          throw new Error(j.message || resp.statusText || 'Export failed');
        }
        return resp.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'lich_truc_final.xlsx';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        setSolverLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: `Export error: ${err.message}`, type: 'warning' }, ...prev]);
      });
  };

  const handleExportPDF = () => {
    if (!assignments.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = assignments.map(item => {
      const baseShiftId = item.shiftId.replace(/_CS[12]$/, '');
      const shift = shiftData.find(s => s.id === baseShiftId);
      const facility = shift?.facility || (item.shiftId.includes('_CS1') ? 'Cơ sở 1' : item.shiftId.includes('_CS2') ? 'Cơ sở 2' : 'Unknown');
      const date = shift?.date || '';
      const time = shift?.time || '';
      const invigilators = item.staffIds.join(', ');
      return `<tr><td>${item.shiftId}</td><td>${facility}</td><td>${date}</td><td>${time}</td><td>${invigilators}</td></tr>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Exam Schedule</title><style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px;}th{background:#f3f4f6;}</style></head><body><h2>Exam Schedule</h2><table><thead><tr><th>Shift ID</th><th>Facility</th><th>Date</th><th>Time</th><th>Invigilators</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload = function(){ window.print(); };</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <BarChart3 size={20} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">ExamSolver</h1>
          </div>
          
          <nav className="space-y-1">
            <SidebarItem 
              icon={<LayoutDashboard size={18} />} 
              label="Dashboard" 
              active={activeView === 'dashboard'} 
              onClick={() => setActiveView('dashboard')} 
            />
            <SidebarItem 
              icon={<Database size={18} />} 
              label="Data Management" 
              active={activeView === 'data'} 
              onClick={() => setActiveView('data')} 
            />
            <SidebarItem 
              icon={<CheckCircle2 size={18} />} 
              label="Results Schedule" 
              active={activeView === 'results'} 
              onClick={() => setActiveView('results')} 
              disabled={!hasResults}
            />
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <Separator className="bg-slate-100" />
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors w-full px-2 py-1"
          >
            <Settings size={18} />
            <span className="text-sm font-medium">Settings</span>
          </button>
          
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Status</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${hasResults ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
              <span className="text-xs font-medium text-blue-700">{hasResults ? 'Optimal Results Ready' : 'Ready to Solve'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-500">
              {activeView === 'dashboard' ? 'Solver & Analytics' : activeView === 'data' ? 'Data Assets' : 'Schedule Output'}
            </h2>
            <div className="text-xs text-slate-400">Algorithm: NSGA-II (Multi-objective Evolutionary Optimization)</div>
          </div>
          <div className="flex items-center gap-3">
            {hasResults && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
                  <Download size={14} /> Export Excel
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
                  <FileText size={14} /> Export PDF
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 gap-2"
                onClick={startSolver}
                disabled={isSolverRunning}
              >
                <PlayCircle size={14} /> {isSolverRunning ? 'Solving...' : 'Run Solver'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={stopSolver}
                disabled={!isSolverRunning}
              >
                Stop
              </Button>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            <AnimatePresence mode="wait">
              {activeView === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <SolverEngine 
                        isRunning={isSolverRunning} 
                        progress={solverProgress} 
                        logs={solverLogs} 
                      />
                    </div>
                    <div>
                      <MetricsDashboard hasResults={hasResults} metrics={metrics} assignments={assignments} staff={staffData} />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === 'data' && (
                <motion.div 
                  key="data"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <DataManager 
                    staff={staffData}
                    shifts={shiftData}
                    facilities={FACILITIES}
                    onUpdateStaff={setStaffData}
                    onUpdateShifts={setShiftData}
                  />
                </motion.div>
              )}

              {activeView === 'results' && (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ResultsTable assignments={assignments} staff={staffData} shifts={shiftData} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </main>

      <SettingsModal 
        open={showSettings} 
        onOpenChange={setShowSettings} 
        agePriority={agePriority}
        setAgePriority={setAgePriority}
        optimizationMode={optimizationMode}
        setOptimizationMode={setOptimizationMode}
        genderWeight={genderWeight}
        setGenderWeight={setGenderWeight}
        ageWeight={ageWeight}
        setAgeWeight={setAgeWeight}
        locationWeight={locationWeight}
        setLocationWeight={setLocationWeight}
        overlapWeight={overlapWeight}
        setOverlapWeight={setOverlapWeight}
      />
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, disabled = false }: { icon: ReactNode, label: string, active?: boolean, onClick?: () => void, disabled?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all
        ${active 
          ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
      `}
    >
      <span className={`${active ? 'text-blue-600' : 'text-slate-400'}`}>{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
