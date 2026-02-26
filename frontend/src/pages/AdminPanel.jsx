import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Upload, Users, Shuffle, UserCheck, Timer, Save, RotateCcw,
  LogOut, Trophy, ChevronRight, Activity, Dumbbell, Pencil, Plus, Trash2, X
} from "lucide-react";

const STATIONS = [
  "Row 750m",
  "Farmers carry 24kg/16kg - 60m",
  "Ski 750m",
  "Broad burpee jumps 40m",
  "Assault bike - 90cal",
  "Body weight lunges 40m"
];

export default function AdminPanel({ api, token, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [waves, setWaves] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [selectedWave, setSelectedWave] = useState("");
  const [timeInputs, setTimeInputs] = useState({});
  const [loading, setLoading] = useState({});
  const [activeTab, setActiveTab] = useState("upload");
  const fileInputRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${api}/participants/summary`);
      setSummary(res.data);
    } catch { /* empty state is fine */ }
  }, [api]);

  const fetchWaves = useCallback(async () => {
    try {
      const res = await axios.get(`${api}/waves`);
      setWaves(res.data.waves || []);
    } catch { /* empty */ }
  }, [api]);

  useEffect(() => {
    fetchSummary();
    fetchWaves();
  }, [fetchSummary, fetchWaves]);

  // Load existing times when wave/station changes
  useEffect(() => {
    if (selectedWave && selectedStation) {
      const wave = waves.find(w => String(w.wave_id) === selectedWave);
      if (wave && wave.teams) {
        const inputs = {};
        wave.teams.forEach(team => {
          const existing = team.station_times?.[selectedStation];
          inputs[team.team_id] = existing ? existing.time_str : "";
        });
        setTimeInputs(inputs);
      }
    }
  }, [selectedWave, selectedStation, waves]);

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(prev => ({ ...prev, upload: true }));
    try {
      const res = await axios.post(`${api}/participants/upload`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      toast.success(res.data.message);
      fetchSummary();
      setWaves([]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(prev => ({ ...prev, upload: false }));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const generateTeams = async (mode) => {
    setLoading(prev => ({ ...prev, generate: true }));
    try {
      const res = await axios.post(`${api}/teams/generate`, { mode }, { headers });
      toast.success(res.data.message);
      fetchWaves();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Generation failed");
    } finally {
      setLoading(prev => ({ ...prev, generate: false }));
    }
  };

  const handleTimeChange = (teamId, value) => {
    // Allow only digits and colon, auto-format
    let clean = value.replace(/[^\d:]/g, "");
    // Auto-insert colon after 2 digits
    if (clean.length === 2 && !clean.includes(":") && timeInputs[teamId]?.length < 2) {
      clean = clean + ":";
    }
    if (clean.length > 5) clean = clean.slice(0, 5);
    setTimeInputs(prev => ({ ...prev, [teamId]: clean }));
  };

  const saveTime = async (teamId) => {
    const timeStr = timeInputs[teamId];
    if (!timeStr || !timeStr.match(/^\d{1,2}:\d{2}$/)) {
      toast.error("Enter time in MM:SS format");
      return;
    }
    setLoading(prev => ({ ...prev, [`save_${teamId}`]: true }));
    try {
      const res = await axios.post(`${api}/times/save`, {
        team_id: teamId,
        station: selectedStation,
        time_str: timeStr
      }, { headers });
      toast.success(res.data.message);
      // Update active settings
      await axios.put(`${api}/settings/active`, {
        wave_id: parseInt(selectedWave),
        station: selectedStation
      }, { headers });
      fetchWaves();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setLoading(prev => ({ ...prev, [`save_${teamId}`]: false }));
    }
  };

  const resetAll = async () => {
    if (!window.confirm("Reset ALL data? This cannot be undone.")) return;
    try {
      await axios.post(`${api}/reset`, {}, { headers });
      toast.success("All data cleared");
      setSummary(null);
      setWaves([]);
      setSelectedStation("");
      setSelectedWave("");
      setTimeInputs({});
    } catch (err) {
      toast.error("Reset failed");
    }
  };

  const currentWave = waves.find(w => String(w.wave_id) === selectedWave);

  return (
    <div className="min-h-screen" data-testid="admin-panel">
      {/* Top Bar */}
      <header className="border-b border-[#27272A] bg-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-heading font-black text-lg tracking-tighter italic text-white" data-testid="admin-logo-365">
              365 RUN CLUB
            </span>
            <span className="text-[#525252]">&times;</span>
            <span className="font-heading font-black text-lg tracking-tighter text-white" data-testid="admin-logo-puma">
              PUMA
            </span>
            <span className="text-[#525252]">&times;</span>
            <span className="font-bold text-sm tracking-widest text-[#A3A9B2]" data-testid="admin-logo-xtraliving">
              XTRALIVING
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/leaderboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#CCFF00] text-xs uppercase tracking-widest font-semibold hover:underline flex items-center gap-1"
              data-testid="admin-leaderboard-link"
            >
              <Trophy className="h-3.5 w-3.5" />
              Leaderboard
            </a>
            <Button
              data-testid="logout-button"
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-[#525252] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight text-white" data-testid="admin-title">
              COMMAND <span className="text-[#CCFF00]">CENTER</span>
            </h1>
            <p className="text-[#525252] text-sm mt-1">trio TAG event management</p>
          </div>
          <Button
            data-testid="reset-button"
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="text-[#FF3B30] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#121212] border border-[#27272A] rounded-sm h-11 p-1 mb-6 w-full sm:w-auto" data-testid="admin-tabs">
            <TabsTrigger
              value="upload"
              data-testid="tab-upload"
              className="rounded-sm data-[state=active]:bg-[#CCFF00] data-[state=active]:text-black font-semibold uppercase tracking-wider text-xs px-4"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              data-testid="tab-teams"
              className="rounded-sm data-[state=active]:bg-[#CCFF00] data-[state=active]:text-black font-semibold uppercase tracking-wider text-xs px-4"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Teams
            </TabsTrigger>
            <TabsTrigger
              value="entry"
              data-testid="tab-entry"
              className="rounded-sm data-[state=active]:bg-[#CCFF00] data-[state=active]:text-black font-semibold uppercase tracking-wider text-xs px-4"
            >
              <Timer className="h-3.5 w-3.5 mr-1.5" />
              Time Entry
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="fade-in" data-testid="upload-tab-content">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Card */}
              <Card className="bg-[#121212] border-[#27272A] rounded-sm" data-testid="csv-upload-card">
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading font-bold text-lg tracking-wide uppercase text-white flex items-center gap-2">
                    <Upload className="h-5 w-5 text-[#CCFF00]" />
                    Import Participants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#A3A9B2] text-sm mb-4">
                    Upload a CSV file with columns: <code className="text-[#CCFF00] bg-[#1A1A1A] px-1.5 py-0.5 text-xs">Name, Gender</code> (M or F)
                  </p>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="hidden"
                      id="csv-upload"
                      data-testid="csv-file-input"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="flex items-center justify-center w-full h-32 border-2 border-dashed border-[#27272A] hover:border-[#CCFF00] rounded-sm cursor-pointer transition-colors group"
                      data-testid="csv-upload-label"
                    >
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-[#525252] group-hover:text-[#CCFF00] mx-auto mb-2 transition-colors" />
                        <span className="text-[#525252] group-hover:text-[#A3A9B2] text-sm transition-colors">
                          {loading.upload ? "Uploading..." : "Click to upload CSV"}
                        </span>
                      </div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Card */}
              <Card className="bg-[#121212] border-[#27272A] rounded-sm" data-testid="participant-summary-card">
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading font-bold text-lg tracking-wide uppercase text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#00E0FF]" />
                    Roster Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary && summary.total > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#1A1A1A] border border-[#27272A] p-4 rounded-sm text-center">
                          <div className="font-heading font-extrabold text-3xl text-white" data-testid="total-participants">
                            {summary.total}
                          </div>
                          <div className="text-[#525252] text-xs uppercase tracking-wider mt-1">Total</div>
                        </div>
                        <div className="bg-[#1A1A1A] border border-[#27272A] p-4 rounded-sm text-center">
                          <div className="font-heading font-extrabold text-3xl text-[#00E0FF]" data-testid="male-count">
                            {summary.males}
                          </div>
                          <div className="text-[#525252] text-xs uppercase tracking-wider mt-1">Male</div>
                        </div>
                        <div className="bg-[#1A1A1A] border border-[#27272A] p-4 rounded-sm text-center">
                          <div className="font-heading font-extrabold text-3xl text-[#FF3B30]" data-testid="female-count">
                            {summary.females}
                          </div>
                          <div className="text-[#525252] text-xs uppercase tracking-wider mt-1">Female</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          data-testid="generate-2m1f-button"
                          onClick={() => generateTeams("2m1f")}
                          disabled={loading.generate}
                          className="flex-1 h-12 bg-[#CCFF00] text-black font-bold uppercase tracking-wider rounded-sm hover:bg-[#b8e600] btn-skew"
                        >
                          <span className="flex items-center gap-1.5">
                            <UserCheck className="h-4 w-4" />
                            {loading.generate ? "Generating..." : "Generate 2M/1F"}
                          </span>
                        </Button>
                        <Button
                          data-testid="generate-random-button"
                          onClick={() => generateTeams("random")}
                          disabled={loading.generate}
                          className="flex-1 h-12 bg-transparent border border-[#27272A] text-white font-bold uppercase tracking-wider rounded-sm hover:bg-white/5 hover:border-white btn-skew"
                        >
                          <span className="flex items-center gap-1.5">
                            <Shuffle className="h-4 w-4" />
                            Random Teams
                          </span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-[#525252]">
                      <Users className="h-10 w-10 mb-2" />
                      <p className="text-sm">No participants uploaded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="fade-in" data-testid="teams-tab-content">
            {waves.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="h-5 w-5 text-[#CCFF00]" />
                  <span className="font-heading font-bold text-lg text-white uppercase tracking-wide">
                    {waves.length} Waves &middot; {waves.reduce((acc, w) => acc + (w.teams?.length || 0), 0)} Teams
                  </span>
                </div>
                {waves.map(wave => (
                  <Card key={wave.wave_id} className="bg-[#121212] border-[#27272A] rounded-sm" data-testid={`wave-card-${wave.wave_id}`}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#CCFF00] text-black font-heading font-bold rounded-sm text-xs px-2">
                          WAVE {wave.wave_id}
                        </Badge>
                        <span className="text-[#525252] text-xs">{wave.teams?.length || 0} teams</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {wave.teams?.map(team => (
                          <div
                            key={team.team_id}
                            className="bg-[#1A1A1A] border border-[#27272A] p-3 rounded-sm"
                            data-testid={`team-card-${team.team_id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-heading font-bold text-white">
                                Team {team.team_id}
                              </span>
                              <div className="flex gap-1">
                                {team.members.map((m, i) => (
                                  <Badge
                                    key={i}
                                    className={`text-[10px] px-1.5 py-0 rounded-sm ${
                                      m.gender === "M"
                                        ? "bg-[#00E0FF]/15 text-[#00E0FF] border-[#00E0FF]/30"
                                        : "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/30"
                                    }`}
                                  >
                                    {m.gender}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {team.members.map((m, i) => (
                              <div key={i} className="text-[#A3A9B2] text-sm">
                                {m.name}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-[#525252]" data-testid="no-teams-message">
                <Users className="h-12 w-12 mb-3" />
                <p className="text-sm">No teams generated yet</p>
                <p className="text-xs mt-1">Upload participants first, then generate teams</p>
              </div>
            )}
          </TabsContent>

          {/* Time Entry Tab */}
          <TabsContent value="entry" className="fade-in" data-testid="entry-tab-content">
            {waves.length > 0 ? (
              <div className="space-y-6">
                {/* Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#A3A9B2] text-xs uppercase tracking-wider font-semibold mb-2 block">
                      Current Station
                    </label>
                    <Select value={selectedStation} onValueChange={setSelectedStation} data-testid="station-select">
                      <SelectTrigger
                        className="h-12 bg-[#121212] border-[#27272A] text-white rounded-sm focus:border-[#CCFF00] focus:ring-[#CCFF00]"
                        data-testid="station-select-trigger"
                      >
                        <SelectValue placeholder="Select Station" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-[#27272A]" data-testid="station-select-content">
                        {STATIONS.map(s => (
                          <SelectItem
                            key={s}
                            value={s}
                            className="text-white focus:bg-[#CCFF00] focus:text-black"
                            data-testid={`station-option-${s.replace(/\s+/g, '-').toLowerCase()}`}
                          >
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[#A3A9B2] text-xs uppercase tracking-wider font-semibold mb-2 block">
                      Active Wave
                    </label>
                    <Select value={selectedWave} onValueChange={setSelectedWave} data-testid="wave-select">
                      <SelectTrigger
                        className="h-12 bg-[#121212] border-[#27272A] text-white rounded-sm focus:border-[#CCFF00] focus:ring-[#CCFF00]"
                        data-testid="wave-select-trigger"
                      >
                        <SelectValue placeholder="Select Wave" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-[#27272A]" data-testid="wave-select-content">
                        {waves.map(w => (
                          <SelectItem
                            key={w.wave_id}
                            value={String(w.wave_id)}
                            className="text-white focus:bg-[#CCFF00] focus:text-black"
                            data-testid={`wave-option-${w.wave_id}`}
                          >
                            Wave {w.wave_id} ({w.teams?.length || 0} teams)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Time Entry Table */}
                {selectedStation && selectedWave && currentWave ? (
                  <Card className="bg-[#121212] border-[#27272A] rounded-sm" data-testid="time-entry-card">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#CCFF00] text-black font-heading font-bold rounded-sm text-xs px-2">
                          WAVE {currentWave.wave_id}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-[#525252]" />
                        <span className="font-heading font-bold text-sm text-[#A3A9B2] uppercase tracking-wider">
                          {selectedStation}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#27272A] hover:bg-transparent">
                            <TableHead className="text-[#A3A9B2] uppercase tracking-wider font-semibold text-xs">Team</TableHead>
                            <TableHead className="text-[#A3A9B2] uppercase tracking-wider font-semibold text-xs">Members</TableHead>
                            <TableHead className="text-[#A3A9B2] uppercase tracking-wider font-semibold text-xs w-40">Split Time</TableHead>
                            <TableHead className="text-[#A3A9B2] uppercase tracking-wider font-semibold text-xs w-24"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentWave.teams?.map(team => (
                            <TableRow
                              key={team.team_id}
                              className="border-[#27272A] hover:bg-white/5"
                              data-testid={`time-entry-row-${team.team_id}`}
                            >
                              <TableCell className="font-heading font-bold text-lg text-white">
                                #{team.team_id}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5">
                                  {team.members.map((m, i) => (
                                    <span key={i} className="text-sm text-[#A3A9B2]">
                                      {m.name}
                                      <span className={`ml-1 text-[10px] ${m.gender === 'M' ? 'text-[#00E0FF]' : 'text-[#FF3B30]'}`}>
                                        ({m.gender})
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  data-testid={`time-input-${team.team_id}`}
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="MM:SS"
                                  value={timeInputs[team.team_id] || ""}
                                  onChange={(e) => handleTimeChange(team.team_id, e.target.value)}
                                  className="time-input h-12 bg-[#1A1A1A] border-[#27272A] text-white rounded-sm focus:border-[#CCFF00] focus:ring-[#CCFF00] w-32"
                                  maxLength={5}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  data-testid={`save-time-button-${team.team_id}`}
                                  onClick={() => saveTime(team.team_id)}
                                  disabled={loading[`save_${team.team_id}`]}
                                  className="h-12 bg-[#CCFF00] text-black font-bold rounded-sm hover:bg-[#b8e600] px-4"
                                  size="sm"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-[#525252]" data-testid="select-station-wave-message">
                    <Timer className="h-10 w-10 mb-2" />
                    <p className="text-sm">Select a station and wave to enter times</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-[#525252]" data-testid="no-teams-for-entry">
                <Timer className="h-12 w-12 mb-3" />
                <p className="text-sm">Generate teams first to enter times</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
