"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUserData, useUserPosts } from "../../user-context";
import { useInvalidateConvexQueries } from "@/lib/convex-query-hooks";
import { useToast } from "@/lib/toast-context";
import { DeletePostModal } from "@/components/delete-post-modal";
import { useAppInitialization } from "@/lib/app-initialization-context";
import { PostLikeButton } from "@/components/post-like-button";
import { formatRelativeTime } from "@/lib/format-time";
import { ImageModal } from "@/components/image-modal";
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  XMarkIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";

type TabType = "posts" | "replies" | "media";

type ProfileUser = {
  _id: string;
  name: string;
  username: string;
  profileImage?: string;
  bio?: string;
  university?: string;
} | null;

type PostData = {
  _id: string;
  content: string;
  createdAt: number;
  likes?: number;
  imageUrl?: string;
  authorId?: string;
  author?: {
    _id: string;
    name: string;
    username: string;
    profileImage?: string;
  };
};

type Post = PostData | null;

export function ProfileClient({
  username,
}: {
  username: string;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editUniversity, setEditUniversity] = useState("");
  const [editProfileImage, setEditProfileImage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const currentUser = session?.user;
  const currentUserData = useUserData();
  const currentUserPosts = useUserPosts();
  const queryClient = useQueryClient();
  const invalidateQueries = useInvalidateConvexQueries();
  const { showToast } = useToast();
  const { isInitializing, setInitialized } = useAppInitialization();

  const updateUser = useMutation(api.users.updateUser);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const deletePost = useMutation(api.posts.deletePost);
  const followUser = useMutation(api.follows.followUser);
  const unfollowUser = useMutation(api.follows.unfollowUser);

  const isOwnProfile = currentUser?.username === username;

  const profileUserQueryKey = ["convex", "users.getUserByUsername", { username }];
  const cachedProfileUser = queryClient.getQueryData(profileUserQueryKey) as typeof profileUserQuery | undefined;
  
  const profileUserQuery = useQuery(api.users.getUserByUsername, { username });
  
  useEffect(() => {
    if (profileUserQuery) {
      queryClient.setQueryData(profileUserQueryKey, profileUserQuery);
    }
  }, [profileUserQuery, queryClient, profileUserQueryKey]);
  
  const profileUser = isOwnProfile && currentUserData 
    ? currentUserData 
    : (profileUserQuery ?? cachedProfileUser ?? (isOwnProfile ? currentUserData : null));
  
  const userId = isOwnProfile && currentUserData?._id 
    ? currentUserData._id 
    : (profileUserQuery?._id ?? cachedProfileUser?._id);
  
  const userPostsQuery = useQuery(
    api.posts.getUserPosts,
    userId ? { userId: userId as any } : "skip"
  );
  const likedPostIds = useQuery(
    api.posts.getLikedPostIds,
    currentUserData?._id ? { userId: currentUserData._id as any } : "skip"
  );
  
  const profileUserId = profileUser?._id ?? cachedProfileUser?._id;
  
  const isFollowingQueryKey = currentUserData?._id && profileUserId && !isOwnProfile
    ? ["convex", "follows.isFollowing", { followerId: currentUserData._id, followingId: profileUserId }]
    : null;
  
  const cachedIsFollowing = isFollowingQueryKey 
    ? (queryClient.getQueryData(isFollowingQueryKey) as boolean | undefined)
    : undefined;
  
  const isFollowingQuery = useQuery(
    api.follows.isFollowing,
    currentUserData?._id && profileUserId && !isOwnProfile
      ? { followerId: currentUserData._id as any, followingId: profileUserId as any }
      : "skip"
  );
  
  useEffect(() => {
    if (isFollowingQuery !== undefined && isFollowingQueryKey) {
      queryClient.setQueryData(isFollowingQueryKey, isFollowingQuery);
    }
  }, [isFollowingQuery, queryClient, isFollowingQueryKey]);

  useEffect(() => {
    if (currentUserData?._id && profileUserId && !isOwnProfile && isFollowingQueryKey && isFollowingQuery === undefined && cachedIsFollowing === undefined) {
      queryClient.refetchQueries({ queryKey: isFollowingQueryKey });
    }
  }, [currentUserData?._id, profileUserId, isOwnProfile, isFollowingQueryKey, isFollowingQuery, cachedIsFollowing, queryClient]);
  
  const followerCountQueryKey = profileUserId 
    ? ["convex", "follows.getFollowerCount", { userId: profileUserId }]
    : null;
  const cachedFollowerCount = followerCountQueryKey 
    ? (queryClient.getQueryData(followerCountQueryKey) as number | undefined)
    : undefined;
  
  const followerCountQuery = useQuery(
    api.follows.getFollowerCount,
    profileUserId ? { userId: profileUserId as any } : "skip"
  );
  
  useEffect(() => {
    if (followerCountQuery !== undefined && followerCountQueryKey) {
      queryClient.setQueryData(followerCountQueryKey, followerCountQuery);
    }
  }, [followerCountQuery, queryClient, followerCountQueryKey]);

  useEffect(() => {
    if (profileUserId && followerCountQueryKey && followerCountQuery === undefined && cachedFollowerCount === undefined) {
      queryClient.refetchQueries({ queryKey: followerCountQueryKey });
    }
  }, [profileUserId, followerCountQueryKey, followerCountQuery, cachedFollowerCount, queryClient]);
  
  const followingCountQueryKey = profileUserId 
    ? ["convex", "follows.getFollowingCount", { userId: profileUserId }]
    : null;
  const cachedFollowingCount = followingCountQueryKey 
    ? (queryClient.getQueryData(followingCountQueryKey) as number | undefined)
    : undefined;
  
  const followingCountQuery = useQuery(
    api.follows.getFollowingCount,
    profileUserId ? { userId: profileUserId as any } : "skip"
  );
  
  useEffect(() => {
    if (followingCountQuery !== undefined && followingCountQueryKey) {
      queryClient.setQueryData(followingCountQueryKey, followingCountQuery);
    }
  }, [followingCountQuery, queryClient, followingCountQueryKey]);

  useEffect(() => {
    if (profileUserId && followingCountQueryKey && followingCountQuery === undefined && cachedFollowingCount === undefined) {
      queryClient.refetchQueries({ queryKey: followingCountQueryKey });
    }
  }, [profileUserId, followingCountQueryKey, followingCountQuery, cachedFollowingCount, queryClient]);
  
  const followerCount = followerCountQuery !== undefined 
    ? followerCountQuery 
    : cachedFollowerCount;
  const followingCount = followingCountQuery !== undefined 
    ? followingCountQuery 
    : cachedFollowingCount;
  
  const displayIsFollowing = isFollowingQuery !== undefined 
    ? isFollowingQuery 
    : cachedIsFollowing;
  
  const [isFollowing, setIsFollowing] = useState<boolean>(displayIsFollowing ?? false);
  
  useEffect(() => {
    if (isFollowingQuery !== undefined) {
      setIsFollowing(isFollowingQuery);
    } else if (cachedIsFollowing !== undefined) {
      setIsFollowing(cachedIsFollowing);
    }
  }, [isFollowingQuery, cachedIsFollowing]);
  
  const userPostsQueryKey = userId ? ["convex", "posts.getUserPosts", { userId }] : null;
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (userPostsQuery && userId) {
      queryClient.setQueryData(userPostsQueryKey!, userPostsQuery);
      setHasInitialized(true);
      if (isInitializing && profileUser) {
        setInitialized();
      }
    }
  }, [userPostsQuery, userId, queryClient, userPostsQueryKey, isInitializing, profileUser, setInitialized]);

  useEffect(() => {
    if (userId && isOwnProfile && userPostsQueryKey && !hasInitialized) {
      queryClient.invalidateQueries({ queryKey: userPostsQueryKey });
      queryClient.refetchQueries({ queryKey: userPostsQueryKey });
    }
  }, [userId, isOwnProfile, queryClient, userPostsQueryKey, hasInitialized]);

  useEffect(() => {
    if (userId && isOwnProfile && userPostsQueryKey && pathname) {
      queryClient.refetchQueries({ queryKey: userPostsQueryKey });
    }
  }, [pathname, userId, isOwnProfile, queryClient, userPostsQueryKey]);

  const cachedUserPosts = userPostsQueryKey 
    ? (queryClient.getQueryData(userPostsQueryKey) as typeof userPostsQuery | undefined)
    : undefined;

  useEffect(() => {
    if (isInitializing && profileUser && (userPostsQuery || cachedUserPosts)) {
      setInitialized();
    }
  }, [isInitializing, profileUser, userPostsQuery, cachedUserPosts, setInitialized]);
  
  const displayUserPosts = userPostsQuery ?? cachedUserPosts;
  
  const userPosts: (Post | null)[] =
    userId
      ? (displayUserPosts ?? (isOwnProfile && currentUserPosts && !hasInitialized ? currentUserPosts : [])) as (Post | null)[]
      : isOwnProfile && currentUserPosts !== null && currentUserPosts !== undefined
        ? (currentUserPosts as (Post | null)[])
        : [];

  const handleOpenEditModal = () => {
    if (profileUser) {
      setEditName(profileUser.name || "");
      setEditBio(profileUser.bio || "");
      setEditUniversity(profileUser.university || "");
      setEditProfileImage(profileUser.profileImage || "");
      setIsEditModalOpen(true);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Prüfe Dateityp
    if (!file.type.startsWith("image/")) {
      alert("Bitte wähle ein Bild aus");
      return;
    }

    // Prüfe Dateigröße (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Das Bild ist zu groß. Maximal 5MB erlaubt.");
      return;
    }

    setIsUploading(true);
    try {
      // Upload URL generieren
      const uploadUrl = await generateUploadUrl();
      
      // Datei hochladen
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();
      
      if (!storageId) {
        throw new Error("Keine Storage-ID erhalten");
      }
      
      // File URL abrufen
      const fileUrl = await getFileUrl({ storageId });
      
      if (fileUrl) {
        setEditProfileImage(fileUrl);
      } else {
        throw new Error("Konnte URL nicht abrufen");
      }
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      alert("Fehler beim Hochladen des Bildes. Bitte versuche es erneut.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileUser?._id || !currentUser?.username) return;

    setIsSaving(true);
    try {
      await updateUser({
        userId: profileUser._id as any,
        username: currentUser.username,
        name: editName,
        bio: editBio,
        university: editUniversity || undefined,
        profileImage: editProfileImage || undefined,
      });
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["convex", "users.getUserByUsername"] });
      queryClient.invalidateQueries({ queryKey: ["convex", "posts.getUserPosts"] });
      invalidateQueries();
      router.refresh();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Fehler beim Speichern des Profils");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setDeletePostId(postId);
  };

  const confirmDeletePost = async () => {
    if (!deletePostId || !profileUser?._id) {
      setDeletePostId(null);
      if (!profileUser?._id) {
        showToast("Fehler: User nicht gefunden", "error");
      }
      return;
    }

    const removePostFromCache = (queryKey: any[]) => {
      const cachedData = queryClient.getQueryData(queryKey) as any[] | undefined;
      if (cachedData) {
        // Finde den zu löschenden Post (kann temporäre oder echte ID sein)
        const postToDelete = cachedData.find((post: any) => post._id === deletePostId);
        
        // Entferne Posts mit der exakten ID
        let updatedData = cachedData.filter((post: any) => post._id !== deletePostId);
        
        // Wenn der Post nicht gefunden wurde, könnte es sein, dass er gerade erstellt wurde
        // und noch eine temporäre ID hat. Versuche, ihn anhand von Inhalt und Autor zu finden
        if (!postToDelete && deletePostId && !deletePostId.startsWith("temp-")) {
          // Der Post wurde möglicherweise gerade erstellt und hat noch eine temporäre ID
          // Suche nach Posts mit ähnlichem Inhalt vom gleichen Autor
          const tempPost = cachedData.find((post: any) => 
            post._id?.startsWith("temp-") && 
            post.authorId === profileUser._id &&
            post.content === cachedData.find((p: any) => p._id === deletePostId)?.content
          );
          if (tempPost) {
            updatedData = updatedData.filter((post: any) => post._id !== tempPost._id);
          }
        }
        
        queryClient.setQueryData(queryKey, updatedData);
        return postToDelete || cachedData.find((post: any) => post._id === deletePostId);
      }
      return null;
    };

    const deletedPostFromUserPosts = userPostsQueryKey ? removePostFromCache(userPostsQueryKey) : null;
    const postsQueryKey = ["convex", "posts.getPosts"];
    const deletedPostFromFeed = removePostFromCache(postsQueryKey);
    const allUserPostsKeys = queryClient.getQueryCache().getAll().map(query => query.queryKey);
    const deletedPostsFromOtherUserPosts: { key: any[]; post: any }[] = [];
    allUserPostsKeys.forEach(key => {
      if (Array.isArray(key) && key[0] === "convex" && key[1] === "posts.getUserPosts" && key !== userPostsQueryKey) {
        const deletedPost = removePostFromCache(key);
        if (deletedPost) {
          deletedPostsFromOtherUserPosts.push({ key, post: deletedPost });
        }
      }
    });

    try {
      await deletePost({ postId: deletePostId as any, userId: profileUser._id as any });
      if (userPostsQueryKey) {
        queryClient.invalidateQueries({ queryKey: userPostsQueryKey });
      }
      queryClient.invalidateQueries({ queryKey: ["convex", "posts.getPosts"] });
      invalidateQueries();
      showToast("Beitrag erfolgreich gelöscht", "success");
      setDeletePostId(null);
    } catch (error) {
      if (deletedPostFromUserPosts && userPostsQueryKey) {
        const cachedData = queryClient.getQueryData(userPostsQueryKey) as any[] | undefined;
        if (cachedData) {
          queryClient.setQueryData(userPostsQueryKey, [deletedPostFromUserPosts, ...cachedData]);
        }
      }
      if (deletedPostFromFeed) {
        const cachedData = queryClient.getQueryData(postsQueryKey) as any[] | undefined;
        if (cachedData) {
          queryClient.setQueryData(postsQueryKey, [deletedPostFromFeed, ...cachedData]);
        }
      }
      deletedPostsFromOtherUserPosts.forEach(({ key, post }) => {
        const cachedData = queryClient.getQueryData(key) as any[] | undefined;
        if (cachedData) {
          queryClient.setQueryData(key, [post, ...cachedData]);
        }
      });
      console.error("Post löschen fehlgeschlagen:", error);
      showToast("Fehler beim Löschen des Posts", "error");
      setDeletePostId(null);
    }
  };


  const handleFollow = async () => {
    if (!currentUserData?._id || !profileUserId || isOwnProfile) return;

    const wasFollowing = displayIsFollowing === true;
    const newIsFollowing = !wasFollowing;
    
    setIsFollowing(newIsFollowing);
    if (isFollowingQueryKey) {
      queryClient.setQueryData(isFollowingQueryKey, newIsFollowing);
    }
    
    // Optimistische Updates für Counts
    const currentUserFollowingCountKey = ["convex", "follows.getFollowingCount", { userId: currentUserData._id }];
    const currentFollowingCount = queryClient.getQueryData(currentUserFollowingCountKey) as number | undefined;
    
    const profileFollowerCountKey = ["convex", "follows.getFollowerCount", { userId: profileUserId }];
    const profileFollowerCount = queryClient.getQueryData(profileFollowerCountKey) as number | undefined;
    
    try {
      if (wasFollowing) {
        // Optimistisch: Following-Count des aktuellen Users reduzieren
        if (currentFollowingCount !== undefined) {
          queryClient.setQueryData(currentUserFollowingCountKey, Math.max(0, currentFollowingCount - 1));
        }
        // Optimistisch: Follower-Count des Profils reduzieren
        if (profileFollowerCount !== undefined) {
          queryClient.setQueryData(profileFollowerCountKey, Math.max(0, profileFollowerCount - 1));
        }
        
        await unfollowUser({
          followerId: currentUserData._id as any,
          followingId: profileUserId as any,
        });
      } else {
        // Optimistisch: Following-Count des aktuellen Users erhöhen
        if (currentFollowingCount !== undefined) {
          queryClient.setQueryData(currentUserFollowingCountKey, currentFollowingCount + 1);
        }
        // Optimistisch: Follower-Count des Profils erhöhen
        if (profileFollowerCount !== undefined) {
          queryClient.setQueryData(profileFollowerCountKey, profileFollowerCount + 1);
        }
        
        await followUser({
          followerId: currentUserData._id as any,
          followingId: profileUserId as any,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["convex", "follows"] });
      queryClient.invalidateQueries({ queryKey: ["convex", "posts.getFollowingPosts"] });
      
      // Aktualisiere Follower- und Following-Counts sofort
      if (followerCountQueryKey) {
        queryClient.invalidateQueries({ queryKey: followerCountQueryKey });
      }
      if (followingCountQueryKey) {
        queryClient.invalidateQueries({ queryKey: followingCountQueryKey });
      }
      
      // Aktualisiere auch die Counts des aktuellen Users
      queryClient.invalidateQueries({ queryKey: currentUserFollowingCountKey });
      const currentUserFollowerCountKey = ["convex", "follows.getFollowerCount", { userId: currentUserData._id }];
      queryClient.invalidateQueries({ queryKey: currentUserFollowerCountKey });
    } catch (error) {
      console.error("Follow/Unfollow fehlgeschlagen:", error);
      setIsFollowing(wasFollowing);
      if (isFollowingQueryKey) {
        queryClient.setQueryData(isFollowingQueryKey, wasFollowing);
      }
      if (currentFollowingCount !== undefined) {
        queryClient.setQueryData(currentUserFollowingCountKey, currentFollowingCount);
      }
      if (profileFollowerCount !== undefined) {
        queryClient.setQueryData(profileFollowerCountKey, profileFollowerCount);
      }
      alert(error instanceof Error ? error.message : "Fehler beim Folgen/Entfolgen");
    }
  };

  const isProfileNotFound = profileUserQuery === null && !isOwnProfile && !cachedProfileUser;

  const isLoadingComplete = profileUser && 
    (!profileUserId || (userPostsQuery !== undefined || cachedUserPosts !== undefined)) &&
    (!profileUserId || (followerCountQuery !== undefined || cachedFollowerCount !== undefined)) &&
    (!profileUserId || (followingCountQuery !== undefined || cachedFollowingCount !== undefined)) &&
    (isOwnProfile || !currentUserData?._id || !profileUserId || isFollowingQuery !== undefined || cachedIsFollowing !== undefined);

  if (isProfileNotFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Profil nicht gefunden</h1>
          <p className="mt-2 text-slate-500">@{username} existiert nicht.</p>
          <Link
            href="/feed"
            className="btn-primary mt-4 inline-block rounded-full px-6 py-2"
          >
            Zurück zum Feed
          </Link>
        </div>
      </div>
    );
  }

  if (!isLoadingComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
          <p className="mt-4 text-slate-500">Lade Profil...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <div className="flex items-center gap-8 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 transition hover:bg-slate-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-slate-900" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{profileUser.name}</h1>
          </div>
        </div>
      </header>

      {/* Profile Header */}
      <div>
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-orange-400 to-pink-400 sm:h-36 relative" />

        {/* Profile Info */}
        <div className="px-4 relative">
          <div className="flex items-start justify-between">
            {/* Avatar */}
            <div className="-mt-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white shadow-lg sm:h-24 sm:w-24 sm:-mt-8 overflow-hidden relative z-10">
              {profileUser.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileUser.profileImage}
                  alt={profileUser.name || username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-[var(--brand)] sm:text-2xl">
                  {profileUser.name?.charAt(0) || username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Edit/Follow Button */}
            <div className="mt-3">
              {isOwnProfile ? (
                <button
                  onClick={handleOpenEditModal}
                  className="rounded-full border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Profil bearbeiten
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                    displayIsFollowing === true
                      ? "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                      : "btn-primary"
                  }`}
                >
                  {displayIsFollowing === true
                    ? "Gefolgt"
                    : "Folgen"}
                </button>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="mt-4 space-y-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{profileUser.name}</h2>
              <p className="text-slate-500">@{profileUser.username}</p>
            </div>

            {profileUser.bio ? (
              <p className="text-slate-900 whitespace-pre-wrap">{profileUser.bio}</p>
            ) : (
              <p className="text-slate-500">Noch keine Bio vorhanden</p>
            )}

            <div className="space-y-2 text-sm text-slate-500">
              {profileUser.university && (
                <div className="flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4" />
                  <span>{profileUser.university}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span>Beigetreten Nov 2025</span>
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              <button className="transition hover:underline">
                <span className="font-semibold text-slate-900">
                  {followingCount ?? 0}
                </span>
                <span className="text-slate-500"> Folge ich</span>
              </button>
              <button className="transition hover:underline">
                <span className="font-semibold text-slate-900">
                  {followerCount ?? 0}
                </span>
                <span className="text-slate-500"> Follower</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("posts")}
            className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
              activeTab === "posts" ? "text-slate-900" : "text-slate-500"
            }`}
          >
            <span className="relative inline-block">
              Posts
              {activeTab === "posts" && (
                <div className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-[var(--brand)]" />
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("replies")}
            className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
              activeTab === "replies" ? "text-slate-900" : "text-slate-500"
            }`}
          >
            <span className="relative inline-block">
              Antworten
              {activeTab === "replies" && (
                <div className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-[var(--brand)]" />
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("media")}
            className={`relative flex-1 px-4 py-4 text-[15px] font-semibold transition hover:bg-slate-50 ${
              activeTab === "media" ? "text-slate-900" : "text-slate-500"
            }`}
          >
            <span className="relative inline-block">
              Medien
              {activeTab === "media" && (
                <div className="absolute -bottom-[17px] left-0 right-0 h-1 rounded-full bg-[var(--brand)]" />
              )}
            </span>
          </button>
        </div>

        {/* Posts */}
        <div>
          {activeTab === "posts" && (
            <div>
              {userPosts.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-semibold text-slate-900">Noch keine Posts</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {isOwnProfile
                      ? "Erstelle deinen ersten Post!"
                      : `@${username} hat noch nichts gepostet.`}
                  </p>
                </div>
              ) : (
                userPosts
                  .filter((post): post is PostData => post !== null)
                  .map((post) => (
                  <article
                    key={post._id}
                    className="border-b border-slate-200 p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] overflow-hidden">
                        {profileUser.profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profileUser.profileImage}
                            alt={profileUser.name || username}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold">
                            {profileUser.name?.charAt(0) || "U"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {profileUser.name}
                            </span>
                            <span className="text-sm text-slate-500">
                              @{profileUser.username}
                            </span>
                            <span className="text-sm text-slate-400">·</span>
                            <span className="text-sm text-slate-500">
                              {formatRelativeTime(post.createdAt)}
                            </span>
                          </div>
                          {isOwnProfile && (
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setOpenDropdownId(
                                    openDropdownId === post._id ? null : post._id
                                  )
                                }
                                className="rounded-full p-2 transition hover:bg-slate-200"
                              >
                                <EllipsisHorizontalIcon className="h-5 w-5 text-slate-500" />
                              </button>
                              {openDropdownId === post._id && (
                                <>
                                  {/* Overlay zum Schließen */}
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenDropdownId(null)}
                                  />
                                  {/* Dropdown Menu */}
                                  <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-slate-200 bg-white shadow-lg">
                                    <button
                                      onClick={() => {
                                        handleDeletePost(post._id);
                                        setOpenDropdownId(null);
                                      }}
                                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-red-600 transition hover:bg-red-50"
                                    >
                                      <TrashIcon className="h-5 w-5" />
                                      <span>Löschen</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-slate-900">
                          {post.content}
                        </p>
                        {post.imageUrl && (
                          <div className="mt-3 w-full rounded-2xl border border-slate-200 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={post.imageUrl}
                              alt="Post image"
                              className="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedImageUrl(post.imageUrl!)}
                            />
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-6">
                          <PostLikeButton
                            postId={post._id}
                            userId={currentUserData?._id}
                            likes={post.likes || 0}
                            postsQueryKey={userPostsQueryKey}
                            likedPostIds={likedPostIds}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {activeTab === "replies" && (
            <div className="py-12 text-center text-slate-500">
              Keine Antworten vorhanden
            </div>
          )}

          {activeTab === "media" && (
            <div className="py-12 text-center text-slate-500">Keine Medien vorhanden</div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/50 transition-opacity"
            onClick={() => setIsEditModalOpen(false)}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-3xl bg-white shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Profil bearbeiten</h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-full p-1.5 transition hover:bg-slate-100"
                >
                  <XMarkIcon className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              {/* Form */}
              <div className="px-6 py-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Profilbild */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {editProfileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editProfileImage}
                        alt="Profilbild"
                        className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="h-32 w-32 rounded-full bg-[var(--brand)]/10 border-4 border-white shadow-lg flex items-center justify-center">
                        <span className="text-5xl font-bold text-[var(--brand)]">
                          {editName?.charAt(0) || "U"}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Bild ändern Button */}
                  <label className="mt-3 flex items-center gap-2 text-[var(--brand)] text-sm font-medium cursor-pointer hover:text-[var(--brand-dark)] transition">
                    <PhotoIcon className="h-4 w-4" />
                    <span>Bild ändern</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                  
                  {isUploading && (
                    <p className="mt-2 text-xs text-slate-500">Bild wird hochgeladen...</p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Dein Name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/30"
                  />
                </div>

                {/* Universität / Hochschule */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Universität / Hochschule
                  </label>
                  <input
                    type="text"
                    value={editUniversity}
                    onChange={(e) => setEditUniversity(e.target.value)}
                    placeholder="TH Nürnberg"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/30"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Bio
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Hallo, ich bin neu bei HelloUni!"
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/30 resize-none"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !editName.trim()}
                  className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    "Speichert..."
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Speichern
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <DeletePostModal
        isOpen={deletePostId !== null}
        onClose={() => setDeletePostId(null)}
        onConfirm={confirmDeletePost}
      />
      {selectedImageUrl && (
        <ImageModal
          imageUrl={selectedImageUrl}
          isOpen={true}
          onClose={() => setSelectedImageUrl(null)}
        />
      )}
    </>
  );
}

