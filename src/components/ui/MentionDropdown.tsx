import { MemberSearchResult } from '../../hooks/useMemberSearch';

interface MentionDropdownProps {
  users: MemberSearchResult[];
  onSelect: (username: string) => void;
  position: { top: number; left: number };
}

export default function MentionDropdown({ users, onSelect, position }: MentionDropdownProps) {
  if (users.length === 0) return null;

  return (
    <div
      className="fixed z-50 glass border border-white/10 rounded-xl shadow-2xl overflow-hidden"
      style={{ top: position.top, left: position.left, minWidth: 200 }}
    >
      {users.map((u) => {
        const avatarSrc =
          u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`;
        return (
          <button
            key={u.uid}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(u.username);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors text-left"
          >
            <img
              src={avatarSrc}
              alt={u.username}
              className="w-6 h-6 rounded-full border border-white/10 object-cover flex-shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`;
              }}
            />
            <span className="text-sm font-bold">@{u.username}</span>
          </button>
        );
      })}
    </div>
  );
}
