import { ReactNode, useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, FileText, ChevronRight, FileCheck } from "lucide-react";
import type { Staff, Shift } from "@/lib/mock-data";

interface ResultsTableProps {
  assignments: any[];
  staff: Staff[];
  shifts: Shift[];
}

export default function ResultsTable({ assignments, staff, shifts }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const scheduleData = assignments.map(item => {
    const baseShiftId = item.shiftId.replace(/_CS[12]$/, '');
    const shift = shifts.find(s => s.id === baseShiftId);
    const facility = shift?.facility || (item.shiftId.endsWith('_CS1') ? 'Cơ sở 1' : item.shiftId.endsWith('_CS2') ? 'Cơ sở 2' : 'Unknown');
    const staffNames = item.staffIds.map((id: string) => staff.find(s => s.id === id)?.name || id);
    return {
      id: item.shiftId,
      name: shift?.name || item.shiftId,
      facility,
      date: shift?.date || '',
      time: shift?.time || '',
      dayOfWeek: shift?.dayOfWeek || '',
      staffNames,
      staffIds: item.staffIds,
    };
  });

  const filteredData = scheduleData.filter(row => 
    row.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    row.staffNames?.some((n: string) => n.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* File Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryStat label="Total Assignments" value={assignments.reduce((acc, a) => acc + a.staffIds.length, 0).toString()} sub="Optimized total" icon={<FileCheck className="text-blue-600" size={16} />} />
          <SummaryStat label="Unique Staff" value={staff.length.toString()} sub="Active pool" icon={<UsersIcon className="text-purple-600" size={16} />} />
          <SummaryStat label="Facilities" value={new Set(shifts.map((shift) => shift.facility)).size.toString().padStart(2, '0')} sub="Facility count" icon={<MapPin className="text-emerald-600" size={16} />} />
          <SummaryStat label="Efficiency Gain" value="+15.4%" sub="Fairness metric" icon={<TrendingUp className="text-amber-600" size={16} />} />
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg border shadow-sm">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Generated Assignment Document</CardTitle>
                <CardDescription className="text-xs">Official allocation reference - v2.4 (Optimized)</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <Input 
                      className="pl-9 h-9 w-64 bg-white border-slate-200" 
                      placeholder="Filter by shift or staff..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <Badge variant="outline" className="h-9 px-3 gap-2 cursor-pointer hover:bg-slate-100 transition-colors bg-white border-slate-200">
                  <Filter size={14} /> Advanced
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 text-center">#</TableHead>
                  <TableHead className="font-bold text-slate-700">Exam Details</TableHead>
                  <TableHead className="font-bold text-slate-700">Location</TableHead>
                  <TableHead className="font-bold text-slate-700">Session</TableHead>
                  <TableHead className="font-bold text-slate-700">Assigned Invigilators</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 pr-8">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, idx) => (
                  <TableRow key={idx} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="text-center font-mono text-[10px] text-slate-400">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-sm tracking-tight">{row.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{row.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium bg-blue-50/50 text-blue-700 border-blue-100 flex items-center gap-1.5 w-fit">
                        <MapPin size={10} /> {row.facility}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{row.dayOfWeek}</span>
                        <span className="text-[10px] text-slate-400">{row.date}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="flex flex-wrap gap-1.5">
                        {row.staffNames.slice(0, 4).map((name: string, i: number) => (
                          <Badge key={i} variant="outline" className="bg-white text-[10px] border-slate-200 py-0 px-2 font-normal text-slate-600">
                            {name}
                          </Badge>
                        ))}
                        {row.staffNames.length > 4 && (
                          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-400 border-none">
                            +{row.staffNames.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                       <div className="flex items-center justify-end gap-2 group-hover:opacity-100 opacity-60 transition-opacity">
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none text-[10px] px-2">VALIDATED</Badge>
                          <ChevronRight size={14} className="text-slate-300" />
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value, sub, icon }: { label: string, value: string, sub: string, icon: ReactNode }) {
    return (
        <Card className="border-slate-200 shadow-sm bg-white hover:border-blue-200 transition-colors cursor-default group">
            <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 leading-none mb-1">{value}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                    <p className="text-[9px] text-slate-400 italic">{sub}</p>
                </div>
            </CardContent>
        </Card>
    )
}

import { MapPin, TrendingUp, Users as UsersIcon } from "lucide-react";
