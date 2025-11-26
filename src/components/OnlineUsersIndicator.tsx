import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { socketService, OnlineMember } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';

export function OnlineUsersIndicator() {
  const { profile } = useAuth();
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);

  useEffect(() => {
    if (!profile) return;

    // Listen for online members updates
    socketService.onOnlineMembers((members) => {
      console.log('👥 [OnlineUsersIndicator] Online members updated:', members.length);
      setOnlineMembers(members);
    });

    socketService.onUserOnline((user) => {
      console.log('👤 [OnlineUsersIndicator] User came online:', user.name);
      setOnlineMembers(prev => {
        // Avoid duplicates
        if (prev.find(m => m.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    socketService.onUserOffline((userId) => {
      console.log('👤 [OnlineUsersIndicator] User went offline:', userId);
      setOnlineMembers(prev => prev.filter(m => m.id !== userId));
    });

    // Request current online members
    socketService.getOnlineMembers((response) => {
      if (response.success && response.members) {
        console.log('👥 [OnlineUsersIndicator] Initial online members:', response.members.length);
        setOnlineMembers(response.members);
      }
    });

    return () => {
      // Note: Don't remove presence listeners here as NotificationsDropdown manages the main socket connection
    };
  }, [profile]);

  // Filter out current user from the display
  const otherOnlineMembers = onlineMembers.filter(m => m.id !== profile?.id);

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (otherOnlineMembers.length === 0) return null;

  // Show max 5 avatars
  const displayedMembers = otherOnlineMembers.slice(0, 5);

  return (
    <TooltipProvider>
      <div className="flex items-center">
        {/* Online indicator dot removed (duplicate). Per-avatar dots remain. */}

        {/* Stacked avatars */}
        <div className="flex -space-x-2">
          {displayedMembers.map((member) => (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <div className="relative" title={member.name}>
                  <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-green-500/50 cursor-pointer hover:z-10 hover:scale-110 transition-transform">
                    <AvatarImage src={member.photoUrl || undefined} alt={member.name} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online dot on avatar */}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background"></span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-background border shadow-lg">
                <div className="text-sm">
                  <p className="font-medium">{member.name}</p>
                  {member.role && (
                    <p className="text-xs text-muted-foreground capitalize">{member.role.replace('_', ' ')}</p>
                  )}
                  <p className="text-xs text-green-500">● Online</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          
        </div>

        
      </div>
    </TooltipProvider>
  );
}
