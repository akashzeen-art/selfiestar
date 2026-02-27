import React, { createContext, useContext, useState } from "react";
import { apiClient } from "@/lib/axios";
import { SelfieDto } from "@shared/api";

export interface UserSelfie {
  id: string;
  image: string;
  score: number;
  caption?: string;
  isPublic: boolean;
  likes: number;
  comments: number;
  createdAt: string;
  challengeId?: string;
}

interface SelfieContextType {
  selfies: UserSelfie[];
  addSelfie: (selfie: UserSelfie) => void;
  deleteSelfie: (id: string) => Promise<void>;
  refreshMine: () => Promise<void>;
  refreshPublic: () => Promise<UserSelfie[]>;
  likeSelfie: (id: string) => Promise<number>;
  addComment: (id: string, text: string) => Promise<number>;
  getTotalScore: () => number;
  getAverageScore: () => number;
  getBestScore: () => number;
}

const SelfieContext = createContext<SelfieContextType | undefined>(undefined);

export function SelfieProvider({ children }: { children: React.ReactNode }) {
  const [selfies, setSelfies] = useState<UserSelfie[]>([]);

  const toUserSelfie = (selfie: any): UserSelfie => ({
    id: selfie.id,
    image: selfie.imageUrl || (selfie.mediaToken ? `/api/selfies/access/${selfie.mediaToken}` : ""),
    score: selfie.score,
    caption: selfie.caption,
    isPublic: selfie.isPublic,
    likes: selfie.likes,
    comments: selfie.comments,
    createdAt: selfie.createdAt,
    challengeId: selfie.challengeId,
  });

  const refreshMine = async () => {
    const response = await apiClient.get<{ selfies: any[] }>("/selfies/mine");
    setSelfies(response.data.selfies.map(toUserSelfie));
  };

  const addSelfie = (selfie: UserSelfie) => {
    setSelfies((current) => [selfie, ...current]);
  };

  const deleteSelfie = async (id: string) => {
    await apiClient.delete<{ message: string }>(`/selfies/${id}`);
    setSelfies((current) => current.filter((s) => s.id !== id));
  };

  const refreshPublic = async () => {
    const response = await apiClient.get<{ selfies: any[] }>("/selfies/public");
    return response.data.selfies.map(toUserSelfie);
  };

  const likeSelfie = async (id: string) => {
    const response = await apiClient.post<{ likes: number }>(`/selfies/${id}/like`);
    return response.data.likes;
  };

  const addComment = async (id: string, text: string) => {
    const response = await apiClient.post<{ comments: number }>(`/selfies/${id}/comments`, { text });
    return response.data.comments;
  };

  const getTotalScore = () => {
    return selfies.reduce((sum, s) => sum + s.score, 0);
  };

  const getAverageScore = () => {
    if (selfies.length === 0) return 0;
    return Math.round((getTotalScore() / selfies.length) * 10) / 10;
  };

  const getBestScore = () => {
    if (selfies.length === 0) return 0;
    return Math.max(...selfies.map((s) => s.score));
  };

  return (
    <SelfieContext.Provider
      value={{
        selfies,
        addSelfie,
        deleteSelfie,
        refreshMine,
        refreshPublic,
        likeSelfie,
        addComment,
        getTotalScore,
        getAverageScore,
        getBestScore,
      }}
    >
      {children}
    </SelfieContext.Provider>
  );
}

export function useSelfies() {
  const context = useContext(SelfieContext);
  if (context === undefined) {
    throw new Error("useSelfies must be used within a SelfieProvider");
  }
  return context;
}
