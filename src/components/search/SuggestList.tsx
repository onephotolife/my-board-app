'use client';

import * as React from 'react';
import { Avatar, List, ListItemAvatar, ListItemButton, ListItemText, Paper } from '@mui/material';

import type { SuggestItem } from '@/types/api/users';

export type SuggestListProps = {
  id: string;
  items: SuggestItem[];
  highlighted: number;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
  onClose: () => void;
  anchorWidth?: number;
};

export function SuggestList({
  id,
  items,
  highlighted,
  onHover,
  onSelect,
  onClose,
  anchorWidth,
}: SuggestListProps) {
  if (!items.length) {
    return null;
  }

  return (
    <Paper
      role="listbox"
      id={id}
      aria-label="候補一覧"
      sx={{
        position: 'absolute',
        mt: 0.5,
        width: anchorWidth || 360,
        maxHeight: 360,
        overflowY: 'auto',
        zIndex: 1300,
      }}
      onMouseLeave={() => onHover(-1)}
    >
      <List dense disablePadding>
        {items.map((item, index) => (
          <ListItemButton
            key={item.id}
            role="option"
            aria-selected={highlighted === index}
            selected={highlighted === index}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onSelect(index);
              onClose();
            }}
          >
            <ListItemAvatar>
              <Avatar src={item.avatarUrl || undefined} alt={item.displayName} />
            </ListItemAvatar>
            <ListItemText primary={item.displayName} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
