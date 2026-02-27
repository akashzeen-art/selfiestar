import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Calendar, Users, Trophy, Loader, ExternalLink, UserPlus } from "lucide-react";
import { apiClient } from "@/lib/axios";
import { toast } from "sonner";
import SelfieUploadModal from "@/components/SelfieUploadModal";
import ShareWithFriends from "@/components/ShareWithFriends";
import { useAuth } from "@/contexts/AuthContext";

interface Challenge {
  id: string;
  title: string;
  description: string;
  theme: string;
  banner?: string;
  uniqueCode: string;
  startDate: string;
  endDate: string;
  participantsCount: number;
  creatorId: string;
  creator?: {
    username: string;
    profileImage?: string;
  };
  hashtags: string[];
  createdAt: string;
  isActive: boolean;
  shareUrl?: string;
  winningReward?: string;
  winnerId?: string;
  inviteCode?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  profileImage?: string;
  totalScore?: number;
  totalSelfies?: number;
  highestScore?: number;
  averageScore?: number;
  score?: number;
}

export default function ChallengeDetails() {
  const { uniqueCode } = useParams<{ uniqueCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isPrivateLeaderboard, setIsPrivateLeaderboard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (!uniqueCode) return;

    const fetchChallenge = async () => {
      try {
        const response = await apiClient.get(`/challenge/${uniqueCode}`);
        setChallenge(response.data.challenge);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load challenge");
        navigate("/challenges");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenge();
  }, [uniqueCode, navigate]);

  useEffect(() => {
    if (!uniqueCode || !challenge) return;

    const fetchLeaderboard = async () => {
      try {
        const response = await apiClient.get(`/challenge/${uniqueCode}/leaderboard`);
        setLeaderboard(response.data.leaderboard || []);
        // Detect private leaderboard shape (score field instead of totalScore)
        const first = response.data.leaderboard?.[0];
        setIsPrivateLeaderboard(!!first && typeof first.score === "number");
      } catch (error) {
        console.error("Failed to load leaderboard:", error);
      }
    };

    fetchLeaderboard();
  }, [uniqueCode, challenge]);

  const copyShareLink = () => {
    if (!challenge) return;
    const origin = window.location.origin;
    const url = challenge.inviteCode
      ? `${origin}/challenge/invite/${challenge.inviteCode}`
      : challenge.shareUrl || window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <AppLayout title="Loading Challenge...">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="h-8 w-8 animate-spin text-white" />
        </div>
      </AppLayout>
    );
  }

  if (!challenge) {
    return (
      <AppLayout title="Challenge Not Found">
        <div className="text-center py-12">
          <p className="text-white/70 mb-4">Challenge not found</p>
          <Button onClick={() => navigate("/challenges")} className="bg-white/20 hover:bg-white/30 text-white">
            Back to Challenges
          </Button>
        </div>
      </AppLayout>
    );
  }

  const isCreator = user && user.id === challenge.creatorId;
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  return (
    <AppLayout
      title={challenge.title}
      description={challenge.description}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Challenge Header */}
        <div className="rounded-xl border border-white/20 bg-transparent backdrop-blur-sm overflow-hidden">
          {challenge.banner && (
            <div className="h-64 w-full overflow-hidden">
              <img
                src={challenge.banner}
                alt={challenge.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2 text-white">{challenge.title}</h1>
                <p className="text-white/70 mb-4">{challenge.description}</p>
                
                {challenge.creator && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-white/70">Created by</span>
                    <span className="text-sm font-medium text-white">{challenge.creator.username}</span>
                  </div>
                )}

                {challenge.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {challenge.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b border-white/20">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-4 w-4 text-white/70" />
                  <p className="text-2xl font-bold text-white">{challenge.participantsCount}</p>
                </div>
                <p className="text-xs text-white/70">Participants</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{challenge.theme}</p>
                <p className="text-xs text-white/70">Theme</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className="h-4 w-4 text-white/70" />
                  <p className="text-lg font-bold text-white">
                    {challenge.isActive ? `${daysLeft} days` : "Ended"}
                  </p>
                </div>
                <p className="text-xs text-white/70">{challenge.isActive ? "Left" : "Status"}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-4 w-4 text-white/70" />
                  <p className="text-lg font-bold text-white">{leaderboard.length}</p>
                </div>
                <p className="text-xs text-white/70">Ranked</p>
              </div>
            </div>

            {/* Winning reward & winner */}
            {challenge.winningReward && (
              <div className="mt-4 rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                <p className="font-semibold">Winning Reward:</p>
                <p className="text-sm mb-1">{challenge.winningReward}</p>
                {!challenge.isActive && challenge.winnerId && leaderboard.length > 0 && (
                  <p className="text-xs text-yellow-200/90">
                    Winner: {leaderboard[0]?.username}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-6">
              {challenge.isActive && user && !isCreator && (
                <Button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  Participate
                </Button>
              )}
              {isCreator && (
                <Button
                  onClick={() => navigate(`/challenge/${challenge.id}/edit`)}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Edit Challenge
                </Button>
              )}
              {user && (
                <Button
                  onClick={() => setIsShareModalOpen(true)}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Share with Friends
                </Button>
              )}
              <Button
                onClick={copyShareLink}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="rounded-xl border border-white/20 bg-transparent backdrop-blur-sm overflow-hidden">
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  {isPrivateLeaderboard ? "Private Challenge Leaderboard" : "Leaderboard"}
                </h2>
                {isPrivateLeaderboard && !isCreator && (
                  <span className="text-xs text-white/60">
                    Only accepted players appear here
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20 bg-transparent backdrop-blur-sm">
                    <th className="px-4 py-3 text-left text-sm font-bold text-white">Rank</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-white">User</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-white">
                      {isPrivateLeaderboard ? "Score" : "Total Score"}
                    </th>
                    {!isPrivateLeaderboard && (
                      <>
                        <th className="px-4 py-3 text-right text-sm font-bold text-white">Selfies</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-white">Avg</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.userId}
                      className="border-b border-white/20 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white text-sm font-bold">
                          {entry.rank}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{entry.username}</td>
                      <td className="px-4 py-3 text-right text-white">
                        {(entry.score ?? entry.totalScore ?? 0).toFixed(2)}
                      </td>
                      {!isPrivateLeaderboard && (
                        <>
                          <td className="px-4 py-3 text-right text-white/70">
                            {entry.totalSelfies ?? 0}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/30 text-white text-sm font-medium">
                              {(entry.averageScore ?? 0).toFixed(2)}%
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <SelfieUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        challengeId={challenge.id}
      />

      {/* Share with Friends Modal */}
      {challenge && (
        <ShareWithFriends
          challengeId={challenge.id}
          challengeTitle={challenge.title}
          challengeUrl={
            challenge.inviteCode
              ? `${window.location.origin}/challenge/invite/${challenge.inviteCode}`
              : challenge.shareUrl || window.location.href
          }
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </AppLayout>
  );
}
