"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileHeaderProps {
    name: string;
    image?: string;
    uniName: string;
    major: string;
}

export function ProfileHeader({ name, image, uniName, major }: ProfileHeaderProps) {
    return (
        <div className="flex flex-col items-center pt-8 pb-6">
            <Avatar className="w-24 h-24 border-4 border-[#F4CFAB] mb-4">
                <AvatarImage src={image} alt={name} />
                <AvatarFallback className="text-2xl bg-[#F4CFAB]/20 text-[#F4CFAB]">
                    {name[0].toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold text-[#F4CFAB] mb-1">{name}</h1>
            <p className="text-[#F4CFAB]/80 text-sm mb-1">{uniName}</p>
            <p className="text-[#F4CFAB]/60 text-xs">{major}</p>
        </div>
    );
}
