"use client";

import { createContext, useContext, ReactNode } from "react";

type UserData = {
  _id: string;
  name: string;
  username: string;
  profileImage?: string;
  bio?: string;
  university?: string;
} | null;

type Post = {
  _id: string;
  content: string;
  createdAt: number;
  likes?: number;
} | null;

type UserDataContextType = {
  userData: UserData | null;
  userPosts: Post[] | null;
};

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({
  children,
  userData,
  userPosts,
}: {
  children: ReactNode;
  userData: UserData | null;
  userPosts?: Post[] | null;
}) {
  return (
    <UserDataContext.Provider value={{ userData, userPosts: userPosts ?? null }}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  return context?.userData;
}

export function useUserPosts() {
  const context = useContext(UserDataContext);
  return context?.userPosts;
}
