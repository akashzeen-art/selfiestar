import { Button } from "@/components/ui/button";

interface ChallengePopupProps {
  isOpen: boolean;
  challengeTitle: string;
  onYes: () => void;
  onNo: () => void;
}

export default function ChallengePopup({
  isOpen,
  challengeTitle,
  onYes,
  onNo,
}: ChallengePopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/20 bg-black/80 p-6 shadow-2xl">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white mb-1">SelfiStar</h2>
          <p className="text-sm text-white/70 mb-2">{challengeTitle}</p>
          <p className="text-sm text-white/80">Do you want to play this challenge?</p>
        </div>
        <div className="flex gap-3 mt-6">
          <Button
            onClick={onNo}
            variant="outline"
            className="flex-1 border-white/30 text-white hover:bg-white/10"
          >
            No
          </Button>
          <Button
            onClick={onYes}
            className="flex-1 bg-white text-black hover:bg-white/90"
          >
            Yes
          </Button>
        </div>
      </div>
    </div>
  );
}

