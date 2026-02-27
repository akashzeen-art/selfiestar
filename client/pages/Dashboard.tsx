import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SelfieUploadModal from "@/components/SelfieUploadModal";
import { Button } from "@/components/ui/button";
import { Camera, Star, TrendingUp, Award, Trash2, Heart } from "lucide-react";
import { useSelfies } from "@/contexts/SelfieContext";

export default function Dashboard() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [error, setError] = useState("");
  const { selfies, getAverageScore, getBestScore, deleteSelfie, refreshMine } = useSelfies();

  useEffect(() => {
    refreshMine().catch((err) => {
      setError(err instanceof Error ? err.message : "Unable to load selfies");
    });
  }, []);

  const stats = [
    { label: "Total Selfies", value: selfies.length.toString(), icon: Star },
    { label: "Avg Score", value: getAverageScore() > 0 ? `${getAverageScore()}%` : "--", icon: TrendingUp },
    { label: "Best Score", value: getBestScore() > 0 ? `${getBestScore()}` : "--", icon: Award },
    { label: "Challenge Wins", value: "0", icon: Camera },
  ];

  return (
    <AppLayout
      title="Dashboard"
      description="Your selfie journey starts here. Upload, score, and shine!"
    >
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-sm animate-slide-down">
            {error}
          </div>
        )}
        {/* Upload Section */}
        <div className="p-6 md:p-8 rounded-xl border border-white/20 bg-transparent backdrop-blur-sm text-center animate-slide-up hover:border-white/50 transition-smooth">
          <Camera className="h-16 w-16 text-white mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ready to score your selfie?</h2>
          <p className="text-muted-foreground mb-6">
            Upload a photo and let our AI analyze your star potential
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-white text-black hover:bg-white/90 border border-white/30 px-8 py-2 text-base hover:scale-105 transition-transform shadow-lg shadow-white/20"
            >
              <Camera className="mr-2 h-5 w-5" />
              Quick Upload
            </Button>
            <Link to="/upload">
              <Button
                variant="outline"
                className="border-white/30 hover:bg-white/10 text-white px-8 py-2 text-base hover:scale-105 transition-transform"
              >
                Full Upload Page →
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="p-4 rounded-lg border border-border/40 bg-transparent backdrop-blur-sm hover:border-white/50 transition-smooth animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-white/40" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Selfies */}
        <div className="p-6 rounded-xl border border-border/40 bg-transparent backdrop-blur-sm">
          <h3 className="text-xl font-bold mb-4">Recent Selfies</h3>
          {selfies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No selfies uploaded yet. Start your journey by uploading your first selfie!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selfies.map((selfie) => (
                <div
                  key={selfie.id}
                  className="rounded-lg border border-border/40 bg-transparent backdrop-blur-sm overflow-hidden hover:border-white/50 transition-colors group"
                >
                  {/* Image */}
                  <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                    {isRenderableImageSrc(selfie.image) ? (
                      <img
                        src={selfie.image}
                        alt="Selfie"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl">{selfie.image}</span>
                    )}
                    {/* Score Badge */}
                    <div className="absolute top-2 right-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-sm font-bold">
                      {selfie.score}★
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {selfie.caption && (
                      <p className="text-sm font-medium mb-2 truncate">{selfie.caption}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>{new Date(selfie.createdAt).toLocaleDateString()}</span>
                      <span>{selfie.isPublic ? "Public" : "Private"}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mb-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {selfie.likes}
                      </span>
                      <span>{selfie.comments} comments</span>
                    </div>

                    {/* Delete Button */}
                    <Button
                      onClick={() => deleteSelfie(selfie.id)}
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-white/20 bg-transparent backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-2">Quick Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Good lighting improves your score</li>
              <li>✓ Center your face for better analysis</li>
              <li>✓ Natural smile increases ratings</li>
            </ul>
          </div>

          <div className="p-6 rounded-xl border border-white/20 bg-transparent backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-2">Next Challenge</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Check out active challenges to win rewards and climb the leaderboard
            </p>
            <Link to="/challenges">
              <Button variant="outline" className="w-full text-sm border-white/20 text-white hover:bg-white/10">
                View Challenges →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <SelfieUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
    </AppLayout>
  );
}

function isRenderableImageSrc(value: string) {
  return (
    value.startsWith("data:image/") ||
    value.startsWith("/api/selfies/access/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  );
}
