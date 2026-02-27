import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Trophy, Star, Award, Loader } from "lucide-react";
import { apiClient } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  profileImage?: string;
  totalScore: number;
  totalSelfies: number;
  averageScore: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number; entry: LeaderboardEntry } | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        const [leaderboardRes, myRankRes] = await Promise.all([
          apiClient.get<{ leaderboard: LeaderboardEntry[] }>("/leaderboard"),
          user ? apiClient.get<{ rank: number; entry: LeaderboardEntry }>("/leaderboard/me").catch(() => null) : null,
        ]);
        setLeaderboardData(leaderboardRes.data.leaderboard);
        if (myRankRes) {
          setMyRank(myRankRes.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load leaderboard");
      } finally {
        setIsLoading(false);
      }
    };
    loadLeaderboard();
  }, [user]);

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-white to-gray-200";
    if (rank === 2) return "from-gray-300 to-gray-400";
    if (rank === 3) return "from-gray-400 to-gray-500";
    return "from-white to-gray-300";
  };

  if (isLoading) {
    return (
      <AppLayout title="Global Leaderboard" description="See where you stand among the world's top selfie stars">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="h-8 w-8 animate-spin text-neon-purple" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Global Leaderboard"
      description="See where you stand among the world's top selfie stars"
    >
      <div className="space-y-6 animate-fade-in">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-sm animate-slide-down">
            {error}
          </div>
        )}
        {/* Top 3 Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {leaderboardData.slice(0, 3).map((user, index) => (
            <div
              key={user.rank}
              className={`p-6 rounded-xl border border-white/20 bg-transparent backdrop-blur-sm text-center transform ${
                index === 0 ? "scale-105" : ""
              }`}
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/20 border border-white/30 mb-4">
                {index === 0 ? (
                  <Trophy className="h-7 w-7 text-white" />
                ) : (
                  <Award className="h-7 w-7 text-white" />
                )}
              </div>

              <div className="mb-2 text-4xl font-bold text-white">#{user.rank}</div>
              <h3 className="text-lg font-bold mb-4 text-white">{user.username}</h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2 text-white">
                  <Star className="h-4 w-4 text-white" />
                  <span>{user.totalScore} points</span>
                </div>
                <div className="text-white/70">
                  {user.totalSelfies} selfies · {user.averageScore}% avg
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Full Leaderboard */}
        <div className="rounded-xl border border-white/20 bg-transparent backdrop-blur-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 bg-transparent backdrop-blur-sm">
                  <th className="px-4 py-3 text-left text-sm font-bold text-white">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-white">Username</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-white">Score</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-white">Selfies</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-white">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((user) => (
                  <tr
                    key={user.rank}
                    className="border-b border-white/20 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white text-sm font-bold">
                          {user.rank}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-white text-sm">{user.username}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-white text-sm">
                        <Star className="h-4 w-4 text-white" />
                        {user.totalScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white/70 text-sm">{user.totalSelfies}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/30 text-white text-sm font-medium">
                        {user.averageScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-4">
            {leaderboardData.map((user) => (
              <div
                key={user.rank}
                className="p-4 rounded-lg border border-white/20 bg-transparent backdrop-blur-sm hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white text-sm font-bold">
                      {user.rank}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{user.username}</h3>
                      <p className="text-white/70 text-xs">{user.totalSelfies} selfies</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end mb-1">
                      <Star className="h-4 w-4 text-white" />
                      <span className="text-white font-bold">{user.totalScore}</span>
                    </div>
                    <span className="inline-block px-2 py-1 rounded-full bg-white/10 border border-white/30 text-white text-xs font-medium">
                      {user.averageScore}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Rank */}
        {myRank ? (
          <div className="p-6 rounded-xl border border-white/20 bg-transparent backdrop-blur-sm text-center animate-scale-in">
            <p className="text-white/70 mb-2">Your Rank</p>
            <p className="text-4xl font-bold mb-2 text-white">
              #{myRank.rank}
            </p>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-white">{myRank.entry.totalScore} points</p>
              <p className="text-white/70">
                {myRank.entry.totalSelfies} selfies · {myRank.entry.averageScore}% avg
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-white/20 bg-transparent backdrop-blur-sm text-center">
            <p className="text-white/70 mb-2">Your Rank</p>
            <p className="text-4xl font-bold mb-2 text-white">--</p>
            <p className="text-sm text-white/70">Login to see your position on the leaderboard</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
