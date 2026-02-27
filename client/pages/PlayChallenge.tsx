import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { apiClient } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import SelfieUploadModal from "@/components/SelfieUploadModal";
import { Loader } from "lucide-react";
import { toast } from "sonner";

interface PlayChallengeResponse {
  challenge: {
    id: string;
    title: string;
    description: string;
  };
}

export default function PlayChallenge() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [challengeId, setChallengeId] = useState<string>("");
  const [challengeTitle, setChallengeTitle] = useState<string>("");
  const [challengeDescription, setChallengeDescription] = useState<string>("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    if (!inviteCode) return;

    if (!isAuthenticated) {
      navigate(`/login?inviteCode=${inviteCode}`);
      return;
    }

    const fetchChallenge = async () => {
      try {
        const response = await apiClient.get<PlayChallengeResponse>(`/challenge/${inviteCode}`);
        setChallengeId(response.data.challenge.id);
        setChallengeTitle(response.data.challenge.title);
        setChallengeDescription(response.data.challenge.description);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Challenge not found");
        navigate("/challenges");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenge();
  }, [inviteCode, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <AppLayout title="Loading Challenge...">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader className="h-8 w-8 animate-spin text-white" />
        </div>
      </AppLayout>
    );
  }

  if (!challengeId) {
    return (
      <AppLayout title="Challenge Not Found">
        <div className="text-center py-16 text-white/80">
          <p className="mb-4">This challenge could not be found.</p>
          <Button
            onClick={() => navigate("/challenges")}
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            Back to Challenges
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={challengeTitle}
      description={challengeDescription}
    >
      <div className="max-w-3xl mx-auto py-12 space-y-8">
        <div className="rounded-2xl border border-white/20 bg-transparent backdrop-blur-sm p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">{challengeTitle}</h1>
          <p className="text-sm text-white/70 mb-4">{challengeDescription}</p>
          <p className="text-sm text-white/80">
            Upload your best selfie to get an AI score and compete on this private challenge leaderboard.
          </p>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-white text-black hover:bg-white/90 px-8 py-2"
          >
            Start Playing
          </Button>
        </div>
      </div>

      <SelfieUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        challengeId={challengeId}
      />
    </AppLayout>
  );
}

