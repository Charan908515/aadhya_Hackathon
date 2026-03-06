# Components Overview

This directory contains reusable UI components used throughout the mobile application. All components are built with React Native and are styled according to the app's predefined design system (`../theme.ts`).

## Files & Functionality

### `ActionButton.tsx`
A versatile, customizable button component built over React Native's `Pressable`. It supports different visual variants (`primary`, `secondary`, and `ghost`), handles press events, provides visual feedback on press, and accepts custom styling.

### `HistoryItem.tsx`
A card-style component intended for list views (like transaction history). It displays the core details of an individual item, including a title, a timestamp, a risk classification, and a percentage score (such as probability of risk).

### `RiskBadge.tsx`
A visual indicator component that highlights a predefined risk level (`SAFE`, `SUSPICIOUS`, or `HIGH RISK`). It assigns distinct, easily recognizable color tones (green, orange/yellow, red) to each level, quickly conveying the security context of a given item.

### `Section.tsx`
A simple structural layout component used to group related content. It renders a prominent title and wraps its nested children elements, ensuring consistent padding, spacing, and typography across different screens.

### `Tag.tsx`
A small, styled label component used to display brief text categories or statuses. It accepts different semantic tones (`info`, `warn`, `danger`) to provide contextual emphasis alongside the label text.
