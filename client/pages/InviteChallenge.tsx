import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { apiClient } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import ChallengePopup from "@/components/ChallengePopup";
import { Loader } from "lucide-react";
import { toast } from "sonner";

interface InviteChallengeResponse {
  challenge: {
    id: string;
    title: string;
    description: string;
  };
}

export default function InviteChallenge() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [challengeTitle, setChallengeTitle] = useState<string>("");
  const [challengeId, setChallengeId] = useState<string>("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useEffect(() => {
    if (!inviteCode) return;

    const fetchChallenge = async () => {
      try {
        const response = await apiClient.get<InviteChallengeResponse>(`/challenge/${inviteCode}`);
        setChallengeTitle(response.data.challenge.title);
        setChallengeId(response.data.challenge.id);
        setIsPopupOpen(true);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Challenge not found");
        navigate("/challenges");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenge();
  }, [inviteCode, navigate]);

  const handleYes = async () => {
    if (!inviteCode) return;

    if (!isAuthenticated) {
      // Store pending invite and redirect to login
      const params = new URLSearchParams(location.search);
      params.set("inviteCode", inviteCode);
      navigate(`/login?${params.toString()}`);
      return;
    }

    try {
      await apiClient.post(`/challenge/${inviteCode}/accept`);
      toast.success("Challenge accepted!");
      navigate(`/play-challenge/${inviteCode}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept challenge");
      setIsPopupOpen(false);
    }
  };

  const handleNo = async () => {
    if (!inviteCode) {
      setIsPopupOpen(false);
      return;
    }

    try {
      await apiClient.post(`/challenge/${inviteCode}/decline`);
    } catch {
      // Ignore errors on decline
    } finally {
      setIsPopupOpen(false);
      navigate("/challenges");
    }
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

  return (
    <AppLayout title={challengeTitle || "Challenge Invite"}>
      <div className="max-w-xl mx-auto py-16 text-center text-white/80">
        <p className="mb-4">You have been invited to join a SelfiStar challenge.</p>
        <p className="text-sm text-white/60">
          Use the popup to confirm whether you want to participate.
        </p>
      </div>

      <ChallengePopup
        isOpen={isPopupOpen}
        challengeTitle={challengeTitle}
        onYes={handleYes}
        onNo={handleNo}
      />
    </AppLayout>
  );
}

