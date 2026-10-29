import { UserRound } from 'lucide-react';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/shared/components/ui/avatar';

// One local, neutral avatar for every account. No uploaded image or external service.
export function UserAvatar({ className }: { className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarImage src="/images/avatar-default.svg" alt="" />
      <AvatarFallback>
        <UserRound aria-hidden="true" />
      </AvatarFallback>
    </Avatar>
  );
}
