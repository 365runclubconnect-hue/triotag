import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Trophy, Zap, Clock, Activity } from "lucide-react";

export default function Leaderboard({ api }) {
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await axios.get(`${api}/leaderboard`);
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    }
  }, [api]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 3000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const leaderboard = data?.leaderboard || [];
  const activeWaveId = data?.active_wave_id;
  const activeStation = data?.active_station;

  return (
    <div className="min-h-screen" data-testid="leaderboard-page">
      {/* Header */}
      <header className="border-b border-[#27272A] bg-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-heading font-black text-lg tracking-tighter italic text-white" data-testid="lb-logo-365">
              365 RUN CLUB
            </span>
            <span className="text-[#525252]">&times;</span>
            <span className="font-heading font-black text-lg tracking-tighter text-white" data-testid="lb-logo-puma">
              PUMA
            </span>
            <span className="text-[#525252]">&times;</span>
            <span className="font-bold text-sm tracking-widest text-[#A3A9B2]" data-testid="lb-logo-xtraliving">
              XTRALIVING
            </span>
          </div>
          <div className="flex items-center gap-3">
            {activeStation && (
              <Badge
                className="bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/30 font-heading font-bold rounded-sm text-xs uppercase tracking-wider"
                data-testid="active-station-badge"
              >
                <Zap className="h-3 w-3 mr-1" />
                {activeStation}
              </Badge>
            )}
            {activeWaveId && (
              <Badge
                className="bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30 font-heading font-bold rounded-sm text-xs animate-pulse"
                data-testid="active-wave-badge"
              >
                WAVE {activeWaveId} ACTIVE
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Title */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white" data-testid="leaderboard-title">
              LIVE <span className="text-[#CCFF00]">LEADERBOARD</span>
            </h1>
            <p className="text-[#525252] text-sm mt-1 flex items-center gap-2">
              trio TAG &middot; Three Minds, One Mission
              {lastUpdated && (
                <span className="text-[#525252] text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[#34C759]">
            <span className="h-2 w-2 bg-[#34C759] rounded-full pulse-dot"></span>
            <span className="text-xs uppercase tracking-wider font-semibold" data-testid="live-indicator">Live</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {leaderboard.length > 0 ? (
          <div className="border border-[#27272A] rounded-sm overflow-hidden" data-testid="leaderboard-table-container">
            <Table>
              <TableHeader>
                <TableRow className="border-[#27272A] bg-[#121212] hover:bg-[#121212]">
                  <TableHead className="text-[#A3A9B2] uppercase tracking-wider font-semibold text-xs w-20">Rank</TableHead>
                  <TableHead className="text-[#A3A9B2] uppercase tracking-wider font-semibold text-xs w-24">Team</TableHead>
                  <TableHead className="text-[#A3A9B2] uppercase tracking-wider font-semibold text-xs">Members</TableHead>
                  <TableHead className="text-[#A3A9B2] uppercase tracking-wider font-semibold text-xs">Station</TableHead>
                  <TableHead className="text-[#A3A9B2] uppercase tracking-wider font-semibold text-xs text-right w-36">Total Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => (
                  <TableRow
                    key={entry.team_id}
                    className={`border-[#27272A] transition-all duration-300 ${
                      entry.is_active ? 'active-row' : 'hover:bg-white/5'
                    }`}
                    data-testid={`leaderboard-row-${entry.team_id}`}
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        {entry.is_active && (
                          <span className="h-2.5 w-2.5 bg-[#34C759] rounded-full pulse-dot" data-testid={`active-indicator-${entry.team_id}`}></span>
                        )}
                        <span className={`lb-rank ${
                          entry.rank === 1 ? 'text-[#CCFF00]' :
                          entry.rank === 2 ? 'text-white' :
                          entry.rank === 3 ? 'text-[#A3A9B2]' :
                          'text-[#525252]'
                        }`}>
                          {entry.rank}
                        </span>
                        {entry.rank === 1 && entry.total_seconds > 0 && (
                          <Trophy className="h-5 w-5 text-[#CCFF00]" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-heading font-bold text-xl text-white" data-testid={`team-id-display-${entry.team_id}`}>
                        #{entry.team_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {entry.members.map((m, i) => (
                          <span key={i} className="text-sm text-[#A3A9B2]">
                            {m.name}
                            <span className={`ml-1 text-[10px] ${m.gender === 'M' ? 'text-[#00E0FF]' : 'text-[#FF3B30]'}`}>
                              {m.gender}
                            </span>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`rounded-sm font-heading font-bold text-[10px] uppercase tracking-wider ${
                          entry.current_station === "Finished"
                            ? "bg-[#CCFF00]/15 text-[#CCFF00] border-[#CCFF00]/30"
                            : entry.current_station === "Not Started"
                            ? "bg-[#525252]/15 text-[#525252] border-[#525252]/30"
                            : "bg-[#00E0FF]/15 text-[#00E0FF] border-[#00E0FF]/30"
                        }`}
                        data-testid={`station-badge-${entry.team_id}`}
                      >
                        {entry.current_station}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`lb-time ${
                          entry.total_seconds > 0 ? 'text-white' : 'text-[#525252]'
                        }`}
                        data-testid={`total-time-${entry.team_id}`}
                      >
                        {entry.total_time_str}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-60 text-[#525252]" data-testid="leaderboard-empty">
            <Activity className="h-16 w-16 mb-4" />
            <p className="text-lg font-heading font-bold uppercase tracking-wider">Waiting for data</p>
            <p className="text-sm mt-1">Teams will appear once the event begins</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#27272A] py-4 text-center">
        <p className="text-[#525252] text-xs uppercase tracking-widest">
          trio TAG &middot; 28th Feb &middot; Powered by 365 Run Club &times; Puma
        </p>
      </footer>
    </div>
  );
}
