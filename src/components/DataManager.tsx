import { useState, useRef } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Calendar, MapPin, Upload } from "lucide-react";
import { Button } from '@/components/ui/button';
import type { Staff, Shift } from '@/lib/mock-data';

interface Facility {
  name: string;
  address: string;
  rooms: number;
  capacity: number;
}

interface DataManagerProps {
  staff: Staff[];
  shifts: Shift[];
  facilities?: Facility[];
  onUpdateStaff: (staff: Staff[]) => void;
  onUpdateShifts: (shifts: Shift[]) => void;
}

export default function DataManager({ staff, shifts, facilities, onUpdateStaff, onUpdateShifts }: DataManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Review and prepare datasets before running the optimization engine.</CardDescription>
        </div>
        <div className="flex gap-2 items-center">
            <input
              type="file"
              accept="application/json,.json"
              ref={fileInputRef}
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                try {
                  const text = await file.text();
                  let payload: any = null;

                  try {
                    payload = JSON.parse(text);
                  } catch {
                    payload = null;
                  }

                  if (!payload) {
                    setStatusMessage('Unable to parse dataset file. Please upload valid JSON with staff and shifts.');
                    return;
                  }

                  if (Array.isArray(payload)) {
                    const first = payload[0] || {};
                    if (first?.gender || first?.distCS1 !== undefined) {
                      onUpdateStaff(payload as Staff[]);
                      setStatusMessage(`Imported ${payload.length} staff records.`);
                    } else if (first?.time || first?.dayOfWeek) {
                      onUpdateShifts(payload as Shift[]);
                      setStatusMessage(`Imported ${payload.length} shift records.`);
                    } else {
                      setStatusMessage('JSON array could not be classified as staff or shifts.');
                    }
                    return;
                  }

                  if (payload.staff || payload.shifts) {
                    if (Array.isArray(payload.staff)) {
                      onUpdateStaff(payload.staff);
                    }
                    if (Array.isArray(payload.shifts)) {
                      onUpdateShifts(payload.shifts);
                    }
                    const importedParts = [payload.staff ? 'staff' : null, payload.shifts ? 'shifts' : null].filter(Boolean).join(' and ');
                    setStatusMessage(`Imported ${importedParts} from dataset.`);
                    return;
                  }

                  setStatusMessage('Dataset file missing required staff or shifts arrays.');
                } catch (error) {
                  setStatusMessage('Upload failed. Confirm the file format and try again.');
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14}/> Upload Dataset
            </Button>
            {statusMessage && (
              <span className="text-xs text-slate-500 italic">{statusMessage}</span>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="staff" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger value="staff" className="gap-2 data-[state=active]:bg-white">
                <Users size={14} /> Staff List
              </TabsTrigger>
              <TabsTrigger value="shifts" className="gap-2 data-[state=active]:bg-white">
                <Calendar size={14} /> Exam Shifts
              </TabsTrigger>
              <TabsTrigger value="facilities" className="gap-2 data-[state=active]:bg-white">
                <MapPin size={14} /> Facilities
              </TabsTrigger>
            </TabsList>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                className="pl-9 h-9" 
                placeholder="Search resources..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="staff">
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-24">MS_CB</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Dist (CS1)</TableHead>
                    <TableHead>Dist (CS2)</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((staffMember) => (
                    <TableRow key={staffMember.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">{staffMember.id}</TableCell>
                      <TableCell className="font-medium">{staffMember.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {staffMember.gender}
                        </Badge>
                      </TableCell>
                      <TableCell>{staffMember.age}</TableCell>
                      <TableCell className="text-slate-500">{staffMember.distCS1} km</TableCell>
                      <TableCell className="text-slate-500">{staffMember.distCS2} km</TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 shadow-none border-green-200">
                          Verified
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="shifts">
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-32">Unique ID</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift Time</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-mono text-xs font-semibold">{shift.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium bg-blue-50 text-blue-700 border-blue-100 italic">
                          {shift.facility}
                        </Badge>
                      </TableCell>
                      <TableCell>{shift.date}</TableCell>
                      <TableCell className="font-medium">{shift.time}</TableCell>
                      <TableCell>{shift.dayOfWeek}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">{shift.staffRequired}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="facilities">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(facilities ?? []).map((facility) => (
                <Card key={facility.name} className="bg-white border-slate-200 overflow-hidden group hover:border-blue-300 transition-colors">
                  <CardHeader className="pb-2 space-y-0">
                     <div className="flex items-center justify-between">
                        <Badge className="bg-blue-600 mb-2">{facility.name}</Badge>
                        <MapPin size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                     </div>
                     <CardTitle className="text-sm">{facility.address}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                            <span className="text-slate-400 block font-bold uppercase tracking-widest text-[9px]">Rooms</span>
                            <span className="text-xl font-bold text-slate-800">{facility.rooms}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-slate-400 block font-bold uppercase tracking-widest text-[9px]">Capacity</span>
                            <span className="text-xl font-bold text-slate-800">{facility.capacity}</span>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
