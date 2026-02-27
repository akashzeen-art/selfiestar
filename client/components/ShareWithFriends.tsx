import { useState, useEffect } from "react";
import { X, Search, UserPlus, UserMinus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/axios";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Friend {
  id: string;
  username: string;
  name: string;
  profileImage?: string;
  totalScore: number;
  totalSelfies: number;
}

interface ShareWithFriendsProps {
  challengeId: string;
  challengeTitle: string;
  challengeUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareWithFriends({
  challengeId,
  challengeTitle,
  challengeUrl,
  isOpen,
  onClose,
}: ShareWithFriendsProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      const response = await apiClient.get("/friends");
      setFriends(response.data.friends || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load friends");
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiClient.get(`/friends/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.users || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const addFriend = async (userId: string) => {
    try {
      await apiClient.post(`/friends/${userId}`);
      toast.success("Friend added successfully!");
      fetchFriends();
      searchUsers(searchQuery); // Refresh search results
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add friend");
    }
  };

  const removeFriend = async (userId: string) => {
    try {
      await apiClient.delete(`/friends/${userId}`);
      toast.success("Friend removed");
      fetchFriends();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove friend");
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const shareWithSelectedFriends = async () => {
    if (selectedFriends.size === 0) {
      toast.error("Please select at least one friend");
      return;
    }

    setIsLoading(true);
    try {
      // Share challenge link with selected friends
      const shareText = `Check out this challenge: ${challengeTitle}\n${challengeUrl}`;
      
      // For now, we'll just copy the link and show a message
      // In a real app, you might want to send notifications or messages
      navigator.clipboard.writeText(shareText);
      
      toast.success(`Challenge link copied! Share it with ${selectedFriends.size} friend(s)`);
      onClose();
      setSelectedFriends(new Set());
    } catch (error: any) {
      toast.error("Failed to share challenge");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-white/20 bg-black/90 backdrop-blur-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/20 p-6 sticky top-0 bg-black/90 z-10">
          <h2 className="text-xl font-bold text-white">Share with Friends</h2>
          <button
            onClick={onClose}
            className="rounded-lg hover:bg-white/10 p-1 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search users to add as friends..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">Search Results</h3>
              {isSearching ? (
                <p className="text-sm text-white/50">Searching...</p>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => {
                    const isFriend = friends.some((f) => f.id === user.id);
                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-white/20 bg-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.username}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              user.username.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.username}</p>
                            <p className="text-xs text-white/70">{user.name}</p>
                          </div>
                        </div>
                        {isFriend ? (
                          <Button
                            onClick={() => removeFriend(user.id)}
                            variant="outline"
                            size="sm"
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <UserMinus className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        ) : (
                          <Button
                            onClick={() => addFriend(user.id)}
                            size="sm"
                            className="bg-white/20 hover:bg-white/30 text-white"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/50">No users found</p>
              )}
            </div>
          )}

          {/* Friends List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white/70">
              Your Friends ({friends.length})
            </h3>
            {friends.length === 0 ? (
              <p className="text-sm text-white/50">No friends yet. Search for users to add friends!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => toggleFriendSelection(friend.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                        {friend.profileImage ? (
                          <img
                            src={friend.profileImage}
                            alt={friend.username}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          friend.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">{friend.username}</p>
                        <p className="text-xs text-white/70">{friend.name}</p>
                      </div>
                    </div>
                    {selectedFriends.has(friend.id) && (
                      <Check className="h-5 w-5 text-white" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Share Button */}
          {selectedFriends.size > 0 && (
            <div className="pt-4 border-t border-white/20">
              <Button
                onClick={shareWithSelectedFriends}
                disabled={isLoading}
                className="w-full bg-white/20 hover:bg-white/30 text-white"
              >
                {isLoading ? "Sharing..." : `Share with ${selectedFriends.size} friend(s)`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
