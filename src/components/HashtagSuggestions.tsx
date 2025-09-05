'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { Tag as TagIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';

interface HashtagSuggestion {
  key: string;
  display: string;
  count: number;
  lastUsedAt: string;
}

interface HashtagSuggestionsProps {
  suggestions: HashtagSuggestion[];
  loading: boolean;
  error: string | null;
  visible: boolean;
  onSelect: (hashtag: string) => void;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
  maxHeight?: number;
  ariaLabelledBy?: string;
  id?: string;
}

/**
 * Hashtag suggestions dropdown component
 * Implements STRICT120 protocol UI requirements with full a11y support
 */
export default function HashtagSuggestions({
  suggestions,
  loading,
  error,
  visible,
  onSelect,
  onClose,
  anchorEl,
  maxHeight = 300,
  ariaLabelledBy,
  id = 'hashtag-suggestions'
}: HashtagSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Handle client-side mounting for Portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Announce suggestions changes to screen readers
  useEffect(() => {
    if (!liveRegionRef.current || !visible) return;

    let announcement = '';
    if (loading) {
      announcement = 'ハッシュタグを検索中...';
    } else if (error) {
      announcement = `エラー: ${error}`;
    } else if (suggestions.length === 0) {
      announcement = '該当するタグが見つかりません';
    } else {
      announcement = `${suggestions.length}件のハッシュタグが見つかりました`;
    }

    liveRegionRef.current.textContent = announcement;
  }, [suggestions, loading, error, visible]);

  // Enhanced keyboard navigation with a11y support
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!visible) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (suggestions.length === 0) return;
        setSelectedIndex(prev => {
          const newIndex = prev < suggestions.length - 1 ? prev + 1 : 0; // Wrap to start
          announceSelection(newIndex);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (suggestions.length === 0) return;
        setSelectedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : suggestions.length - 1; // Wrap to end
          announceSelection(newIndex);
          return newIndex;
        });
        break;
      case 'Home':
        event.preventDefault();
        if (suggestions.length === 0) return;
        setSelectedIndex(0);
        announceSelection(0);
        break;
      case 'End':
        event.preventDefault();
        if (suggestions.length === 0) return;
        setSelectedIndex(suggestions.length - 1);
        announceSelection(suggestions.length - 1);
        break;
      case 'Enter':
      case ' ': // Space key
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const selectedTag = suggestions[selectedIndex];
          onSelect(`#${selectedTag.display}`);
          if (liveRegionRef.current) {
            liveRegionRef.current.textContent = `選択されました: #${selectedTag.display}`;
          }
        }
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      case 'Tab':
        // Allow tab to close suggestions
        onClose();
        break;
    }
  };

  // Announce selected item to screen readers
  const announceSelection = (index: number) => {
    if (index >= 0 && index < suggestions.length && liveRegionRef.current) {
      const suggestion = suggestions[index];
      liveRegionRef.current.textContent = `${index + 1} of ${suggestions.length}: #${suggestion.display}, ${suggestion.count}回使用`;
    }
  };

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedIndex]);

  // Don't render on server or if not visible
  if (!mounted || !visible) return null;

  const getPosition = () => {
    if (!anchorEl) return { top: 0, left: 0, width: 300 };
    
    const rect = anchorEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let top = rect.bottom + window.scrollY;
    let left = rect.left + window.scrollX;
    const width = Math.min(rect.width, 400);
    
    // Adjust if dropdown would go below viewport
    if (rect.bottom + maxHeight > viewportHeight) {
      top = rect.top + window.scrollY - maxHeight;
    }
    
    // Adjust if dropdown would go outside viewport horizontally  
    if (left + width > viewportWidth) {
      left = viewportWidth - width - 10;
    }
    
    return { top, left, width };
  };

  const position = getPosition();
  const suggestionId = `${id}-suggestion`;
  const listboxId = `${id}-listbox`;

  const dropdownContent = (
    <>
      {/* Screen reader live region for announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      />
      
      {/* Invisible overlay to handle clicks outside */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1200
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Suggestions dropdown */}
      <Paper
        ref={containerRef}
        elevation={8}
        role="listbox"
        id={listboxId}
        aria-label="ハッシュタグの候補"
        aria-labelledby={ariaLabelledBy}
        aria-expanded={visible}
        aria-activedescendant={selectedIndex >= 0 ? `${suggestionId}-${selectedIndex}` : undefined}
        tabIndex={-1}
        sx={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          width: position.width,
          maxWidth: 400,
          maxHeight,
          overflowY: 'auto',
          zIndex: 1300,
          border: 1,
          borderColor: 'divider',
          '&:focus': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2
          }
        }}
        onKeyDown={handleKeyDown}
      >
        {loading && (
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }} role="status" aria-label="読み込み中">
            <CircularProgress size={16} aria-hidden="true" />
            <Typography variant="body2" color="text.secondary">
              タグを検索中...
            </Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }} role="alert">
            <Alert severity="error" sx={{ fontSize: '0.875rem' }}>
              {error}
            </Alert>
          </Box>
        )}

        {!loading && !error && suggestions.length === 0 && (
          <Box sx={{ p: 2 }} role="status">
            <Typography variant="body2" color="text.secondary">
              該当するタグが見つかりません
            </Typography>
          </Box>
        )}

        {!loading && !error && suggestions.length > 0 && (
          <>
            <Box sx={{ p: 1.5, pb: 1 }}>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontWeight: 500, textTransform: 'uppercase' }}
                id={`${id}-label`}
              >
                ハッシュタグ候補 ({suggestions.length}件)
              </Typography>
            </Box>
            
            <List ref={listRef} sx={{ py: 0 }} role="presentation">
              {suggestions.map((suggestion, index) => (
                <ListItem key={suggestion.key} disablePadding role="presentation">
                  <ListItemButton
                    id={`${suggestionId}-${index}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    selected={index === selectedIndex}
                    onClick={() => {
                      onSelect(`#${suggestion.display}`);
                      if (liveRegionRef.current) {
                        liveRegionRef.current.textContent = `選択されました: #${suggestion.display}`;
                      }
                    }}
                    sx={{
                      py: 1,
                      px: 2,
                      cursor: 'pointer',
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <TagIcon 
                      sx={{ 
                        fontSize: 18, 
                        marginRight: 1.5, 
                        color: 'text.secondary' 
                      }}
                      aria-hidden="true"
                    />
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            #{suggestion.display}
                          </Typography>
                          {suggestion.count > 0 && (
                            <Chip
                              size="small"
                              label={suggestion.count}
                              icon={<TrendingUpIcon sx={{ fontSize: 12 }} />}
                              aria-label={`${suggestion.count}回使用`}
                              sx={{
                                height: 20,
                                fontSize: '0.75rem',
                                backgroundColor: 'primary.light',
                                color: 'primary.contrastText',
                                '& .MuiChip-icon': {
                                  fontSize: '0.75rem'
                                }
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        suggestion.count > 0 && (
                          <Typography variant="caption" color="text.secondary" aria-hidden="true">
                            {suggestion.count}回使用
                          </Typography>
                        )
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Paper>
    </>
  );

  // Use Portal for proper z-index management and accessibility
  return createPortal(dropdownContent, document.body);
}